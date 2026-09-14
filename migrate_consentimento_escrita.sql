-- ============================================================================
-- migrate_consentimento_escrita.sql   ·   Etapa 1, passos 1 e 5   ·   13/09/2026
--
-- Par de `migrate_consentimento_acesso.sql` — RODAR OS DOIS JUNTOS, nesta ordem.
-- Aquele fecha a LEITURA; este fecha a ESCRITA. Meio caminho é pior que caminho
-- nenhum: um médico que ESCREVE numa anamnese cria vínculo, e vínculo abria a
-- leitura. Fechar só um lado deixa a porta de trás.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- O BURACO QUE ESTE ARQUIVO FECHA
--
-- A leitura foi endurecida numa auditoria anterior (`triagens_por_cpf` ainda
-- carrega o comentário "Antes autorizava QUALQUER médico para QUALQUER CPF").
-- A ESCRITA ficou para trás: quatro RPCs gravam no prontuário passando por
-- `oba_pode_ver`, que é isto por inteiro:
--
--     SELECT token_medico_ok(crm, token) OR token_paciente_ok(cpf, token);
--
-- Nenhuma checagem de vínculo, quanto mais de autorização. Qualquer médico
-- logado escrevia na anamnese de qualquer CPF — e `oba_anamnese_atualizar_por_id`
-- altera QUALQUER LINHA, por id.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- ⚠ A DISTINÇÃO QUE SUSTENTA O DESENHO (não simplificar)
--
-- Escrever não é uma coisa só. São duas, e a régua não pode ser a mesma:
--
--   CRIAR O PRÓPRIO ATO — o médico registra a avaliação que ELE acabou de
--   fazer. Não precisa de autorização: é o registro do atendimento dele, e
--   exigir autorização prévia quebraria o fluxo central do negócio (avaliar um
--   CPF novo). Está comentado em Calculator.jsx:933 — "o vínculo nasce de
--   avaliar, e avaliar estava barrado por não ter vínculo" foi um beco sem
--   saída já corrigido uma vez. Não recriar.
--
--   ALTERAR O QUE JÁ ESTÁ LÁ — mexer numa linha existente, que pode ser o
--   autorrelato do paciente ou o registro de outro médico. EXIGE autorização.
--   É aqui que morava o risco real.
--
-- Clinicamente: um médico registra o que apurou sem pedir licença; para mexer
-- no que outro escreveu, precisa de autorização.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- POR QUE A AUTORIA VEM JUNTO, e não só na Etapa 2
--
-- O modal INSERE a linha e depois a ATUALIZA várias vezes (relatório, pedidos
-- — ver `gravarNaLinhaDoCiclo`, OBAModal.jsx:1479). Para o médico poder
-- atualizar a linha que ELE acabou de criar, o banco precisa saber que foi ele.
-- Sem autoria, a única alternativa seria liberar todo UPDATE — ou seja, não
-- fechar nada.
--
-- Então a COLUNA de autoria entra aqui, por necessidade técnica. O resto da
-- Etapa 2 (versionamento por trigger, exibição da distinção nas telas)
-- continua na Etapa 2.
--
-- RODAR NO SUPABASE DASHBOARD → SQL EDITOR, DEPOIS de migrate_consentimento_acesso.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. AUTORIA — quem preencheu esta anamnese.
--
--    A razão histórica de NÃO gravar o CRM está no código (OBAModal.jsx:1861):
--    "medico_crm de propósito NÃO entra aqui: a coluna alimenta a atribuição de
--    crédito (fn_credita_medico)". A autoria do dado clínico foi sacrificada
--    para proteger a contabilidade do crédito.
--    `fn_credita_medico` NÃO EXISTE desde 09/09/2026. O obstáculo caiu.
--
--    Autorrelato e história colhida por médico são informações clinicamente
--    diferentes. Um prontuário precisa saber qual das duas está guardando.
-- ---------------------------------------------------------------------------
ALTER TABLE public.oba_anamnese
  ADD COLUMN IF NOT EXISTS preenchida_por text
    CHECK (preenchida_por IS NULL OR preenchida_por IN ('paciente','medico'));
ALTER TABLE public.oba_anamnese
  ADD COLUMN IF NOT EXISTS preenchida_crm text;

COMMENT ON COLUMN public.oba_anamnese.preenchida_por IS
  'paciente = autorrelato; medico = história colhida em consulta. Gravado pela RPC a partir do TOKEN, nunca do cliente.';
COMMENT ON COLUMN public.oba_anamnese.preenchida_crm IS
  'CRM de quem colheu, quando preenchida_por = medico. NÃO alimenta crédito nenhum (fn_credita_medico não existe desde 09/09/2026).';

-- Quem revisou — o marcador `revisao_medica` diz QUE houve revisão, não QUEM.
ALTER TABLE public.oba_anamnese
  ADD COLUMN IF NOT EXISTS revisao_crm text;
COMMENT ON COLUMN public.oba_anamnese.revisao_crm IS
  'CRM de quem fez a revisão médica sobre o autorrelato. Ver revisao_medica.';

-- ---------------------------------------------------------------------------
-- 2. A PORTA DE ESCRITA.
--
--    `oba_pode_ver` fica (outras coisas podem chamá-la), mas as RPCs de escrita
--    passam a usar esta, que distingue criar de alterar — e registra trilha,
--    que a escrita nunca teve.
--
--    p_alterando = false → criando linha nova (o próprio ato)
--    p_alterando = true  → mexendo no que já existe (exige autorização)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.oba_pode_escrever(
  p_cpf text, p_crm text, p_med_token text, p_pac_token text,
  p_recurso text, p_alterando boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf    text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v_medico boolean;
  v_pode   boolean;
  v_motivo text;
BEGIN
  -- O próprio paciente escrevendo a própria anamnese: sempre pode, sem trilha.
  IF public.token_paciente_ok(v_cpf, p_pac_token) THEN
    RETURN true;
  END IF;

  v_medico := public.token_medico_ok(p_crm, p_med_token);
  IF NOT v_medico THEN
    RETURN false;
  END IF;

  IF p_alterando THEN
    -- ALTERAR o que já está lá exige autorização do paciente.
    v_pode   := public.medico_tem_autorizacao(v_cpf, p_crm);
    v_motivo := CASE WHEN v_pode THEN 'escrita_autorizada' ELSE 'escrita_sem_autorizacao' END;
  ELSE
    -- CRIAR o próprio ato: permitido. É o registro do atendimento dele.
    -- Fica na trilha assim mesmo — o paciente vê que um médico escreveu no
    -- prontuário dele, mesmo sendo um ato legítimo.
    v_pode   := true;
    v_motivo := 'escrita_ato_proprio';
  END IF;

  BEGIN
    INSERT INTO public.acessos_paciente (medico_crm, cpf_paciente, recurso, permitido, motivo)
    VALUES (upper(btrim(coalesce(p_crm,''))), v_cpf, coalesce(p_recurso,'?'), v_pode, v_motivo);
  EXCEPTION WHEN OTHERS THEN
    NULL;  -- a trilha nunca pode derrubar o atendimento
  END;

  RETURN v_pode;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. INSERIR anamnese — cria o próprio ato, e grava a AUTORIA.
--
--    A autoria vem do TOKEN, nunca do cliente: um cliente que pudesse dizer
--    "isto foi o paciente que preencheu" inutilizaria o campo inteiro.
-- ---------------------------------------------------------------------------
-- ⚠ OS `DEFAULT` SÃO OBRIGATÓRIOS: a função JÁ EXISTE no banco com eles, e
--   CREATE OR REPLACE não consegue REMOVER um default (erro 42P13 — "cannot
--   remove parameter defaults from existing function"). Reescrever a
--   assinatura sem eles derruba a migration inteira. Conferido contra
--   pg_get_function_arguments em 13/09/2026. Não "limpar".
CREATE OR REPLACE FUNCTION public.oba_anamnese_inserir(
  p_dados jsonb,
  p_crm text DEFAULT NULL::text,
  p_med_token text DEFAULT NULL::text,
  p_pac_token text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf    text := regexp_replace(coalesce(p_dados->>'cpf', ''), '\D', '', 'g');
  v_medico boolean;
  v_dados  jsonb := p_dados;
  v_cols   text;
  v_sql    text;
  v_id     uuid;
BEGIN
  IF v_cpf = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;
  IF NOT public.oba_pode_escrever(v_cpf, p_crm, p_med_token, p_pac_token, 'oba_anamnese', false) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  -- AUTORIA decidida pelo TOKEN. Se o token de médico é válido, foi médico.
  v_medico := public.token_medico_ok(p_crm, p_med_token)
              AND NOT public.token_paciente_ok(v_cpf, p_pac_token);
  v_dados := v_dados
           || jsonb_build_object('preenchida_por', CASE WHEN v_medico THEN 'medico' ELSE 'paciente' END)
           || jsonb_build_object('preenchida_crm', CASE WHEN v_medico THEN upper(btrim(p_crm)) END);
  -- Revisão médica: registra QUEM revisou, não só que houve revisão.
  IF v_medico AND COALESCE((v_dados->>'revisao_medica')::boolean, false) THEN
    v_dados := v_dados || jsonb_build_object('revisao_crm', upper(btrim(p_crm)));
  END IF;

  SELECT string_agg(quote_ident(c.column_name), ', ')
    INTO v_cols
    FROM information_schema.columns c
   WHERE c.table_schema = 'public'
     AND c.table_name = 'oba_anamnese'
     AND c.column_name NOT IN ('id', 'created_at')
     AND v_dados ? c.column_name;

  IF v_cols IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nenhuma coluna valida');
  END IF;

  v_sql := format(
    'INSERT INTO public.oba_anamnese (%s) SELECT %s FROM jsonb_populate_record(NULL::public.oba_anamnese, $1) RETURNING id',
    v_cols, v_cols);
  EXECUTE v_sql USING v_dados INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. ATUALIZAR POR ID — o ponto mais exposto de todos: altera qualquer linha.
--
--    Agora: só o AUTOR da linha (continuando o próprio registro) ou quem tem
--    autorização do paciente.
--
--    É o "autor" que preserva o fluxo do modal: ele insere a linha e depois a
--    atualiza várias vezes com o relatório e os pedidos.
-- ---------------------------------------------------------------------------
-- ⚠ OS `DEFAULT` SÃO OBRIGATÓRIOS: a função JÁ EXISTE no banco com eles, e
--   CREATE OR REPLACE não consegue REMOVER um default (erro 42P13 — "cannot
--   remove parameter defaults from existing function"). Reescrever a
--   assinatura sem eles derruba a migration inteira. Conferido contra
--   pg_get_function_arguments em 13/09/2026. Não "limpar".
CREATE OR REPLACE FUNCTION public.oba_anamnese_atualizar_por_id(
  p_id uuid, p_patch jsonb,
  p_crm text DEFAULT NULL::text,
  p_med_token text DEFAULT NULL::text,
  p_pac_token text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf   text;
  v_autor text;
  v_eh_autor boolean;
  v_cols  text;
  v_n     int;
  v_sql   text;
BEGIN
  IF p_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Id invalido');
  END IF;

  -- O CPF vem DA LINHA (não do cliente): é ele que decide a autorização.
  SELECT regexp_replace(coalesce(o.cpf, ''), '\D', '', 'g'),
         upper(btrim(coalesce(o.preenchida_crm, '')))
    INTO v_cpf, v_autor
    FROM public.oba_anamnese o WHERE o.id = p_id;

  IF v_cpf IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Anamnese nao encontrada');
  END IF;

  -- Continuar a PRÓPRIA linha não é alterar dado alheio.
  v_eh_autor := v_autor <> '' AND v_autor = upper(btrim(coalesce(p_crm,'')))
                AND public.token_medico_ok(p_crm, p_med_token);

  IF NOT public.oba_pode_escrever(v_cpf, p_crm, p_med_token, p_pac_token,
                                  'oba_anamnese_update', NOT v_eh_autor) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  -- cpf/id/created_at nunca são alteráveis. A autoria também não: quem
  -- escreveu, escreveu — deixá-la editável tornaria o campo inútil.
  SELECT string_agg(quote_ident(c.column_name), ', '), count(*)
    INTO v_cols, v_n
    FROM information_schema.columns c
   WHERE c.table_schema = 'public'
     AND c.table_name = 'oba_anamnese'
     AND c.column_name NOT IN ('id','cpf','created_at',
                                 -- autoria e revisão são decididas pelo TOKEN,
                                 -- nunca pelo cliente: deixá-las passar no patch
                                 -- permitiria forjar quem escreveu ou quem revisou.
                                 'preenchida_por','preenchida_crm','revisao_crm')
     AND p_patch ? c.column_name;

  IF v_cols IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nenhuma coluna valida');
  END IF;

  IF v_n = 1 THEN
    v_sql := format('UPDATE public.oba_anamnese SET %s = (SELECT %s FROM jsonb_populate_record(NULL::public.oba_anamnese, $1)) WHERE id = $2', v_cols, v_cols);
  ELSE
    v_sql := format('UPDATE public.oba_anamnese SET (%s) = (SELECT %s FROM jsonb_populate_record(NULL::public.oba_anamnese, $1)) WHERE id = $2', v_cols, v_cols);
  END IF;
  EXECUTE v_sql USING p_patch, p_id;

  RETURN jsonb_build_object('ok', true, 'id', p_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. ATUALIZAR A ÚLTIMA — mesma régua. "A última linha do CPF" pode ser de
--    outro médico ou do próprio paciente; alterar exige autorização.
-- ---------------------------------------------------------------------------
-- ⚠ OS `DEFAULT` SÃO OBRIGATÓRIOS: a função JÁ EXISTE no banco com eles, e
--   CREATE OR REPLACE não consegue REMOVER um default (erro 42P13 — "cannot
--   remove parameter defaults from existing function"). Reescrever a
--   assinatura sem eles derruba a migration inteira. Conferido contra
--   pg_get_function_arguments em 13/09/2026. Não "limpar".
CREATE OR REPLACE FUNCTION public.oba_anamnese_atualizar_ultima(
  p_cpf text, p_patch jsonb,
  p_crm text DEFAULT NULL::text,
  p_med_token text DEFAULT NULL::text,
  p_pac_token text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf   text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  v_id    uuid;
  v_autor text;
  v_eh_autor boolean;
  v_cols  text;
  v_n     int;
  v_sql   text;
BEGIN
  IF v_cpf = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;

  SELECT o.id, upper(btrim(coalesce(o.preenchida_crm,'')))
    INTO v_id, v_autor
    FROM public.oba_anamnese o
   WHERE regexp_replace(coalesce(o.cpf,''), '\D','','g') = v_cpf
   ORDER BY o.created_at DESC LIMIT 1;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Anamnese nao encontrada');
  END IF;

  v_eh_autor := v_autor <> '' AND v_autor = upper(btrim(coalesce(p_crm,'')))
                AND public.token_medico_ok(p_crm, p_med_token);

  IF NOT public.oba_pode_escrever(v_cpf, p_crm, p_med_token, p_pac_token,
                                  'oba_anamnese_update', NOT v_eh_autor) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  SELECT string_agg(quote_ident(c.column_name), ', '), count(*)
    INTO v_cols, v_n
    FROM information_schema.columns c
   WHERE c.table_schema = 'public'
     AND c.table_name = 'oba_anamnese'
     AND c.column_name NOT IN ('id','cpf','created_at',
                                 -- autoria e revisão são decididas pelo TOKEN,
                                 -- nunca pelo cliente: deixá-las passar no patch
                                 -- permitiria forjar quem escreveu ou quem revisou.
                                 'preenchida_por','preenchida_crm','revisao_crm')
     AND p_patch ? c.column_name;

  IF v_cols IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nenhuma coluna valida');
  END IF;

  IF v_n = 1 THEN
    v_sql := format('UPDATE public.oba_anamnese SET %s = (SELECT %s FROM jsonb_populate_record(NULL::public.oba_anamnese, $1)) WHERE id = $2', v_cols, v_cols);
  ELSE
    v_sql := format('UPDATE public.oba_anamnese SET (%s) = (SELECT %s FROM jsonb_populate_record(NULL::public.oba_anamnese, $1)) WHERE id = $2', v_cols, v_cols);
  END IF;
  EXECUTE v_sql USING p_patch, v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. `avaliacoes_salvar` — mesma distinção.
--
--    O modo 'inserir' cria o registro da avaliação que o médico fez: ato
--    próprio. Os modos 'upsert' e 'se_ausente' podem cair numa linha que já
--    existe — aí é alteração.
--
--    O PAYWALL e toda a régua de cota ficam INTACTOS: são outro assunto, e
--    mexer neles aqui seria juntar dois problemas.
-- ---------------------------------------------------------------------------
-- ⚠ OS DEFAULT SÃO OBRIGATÓRIOS AQUI, por dois motivos independentes:
--   1. CREATE OR REPLACE não consegue REMOVER um default (erro 42P13) — sem
--      eles esta migration nem chega a rodar;
--   2. dois call sites contam com o default e mandam só parte dos argumentos
--      (Calculator.jsx: sem p_chave/p_pac_token; PatientDashboard.jsx: sem
--      p_crm/p_med_token). Sem default, a chamada vira "função não encontrada"
--      e a avaliação deixa de salvar EM SILÊNCIO.
-- A régua de autorização não depende da assinatura. Não "limpe" estes defaults.
CREATE OR REPLACE FUNCTION public.avaliacoes_salvar(
  p_dados jsonb,
  p_modo text DEFAULT 'inserir'::text,
  p_chave text DEFAULT NULL::text,
  p_crm text DEFAULT NULL::text,
  p_med_token text DEFAULT NULL::text,
  p_pac_token text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_dados->>'cpf', ''), '\D', '', 'g');
  v_data text := p_dados->>'data_coleta';
  v_uid uuid;
  v_id uuid;
  v_cols text;
  v_n int;
  v_sql text;
  v_e_medico boolean;
  v_concluida boolean;
  v_alvo_ja_concluida boolean;
  v_ja int;
BEGIN
  IF v_cpf = '' THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;

  -- Procura a linha existente ANTES de decidir a régua: criar linha nova é ato
  -- próprio; cair numa linha que já existe é alteração.
  IF p_chave = 'cpf' AND v_data IS NOT NULL THEN
    SELECT a.id INTO v_id FROM public.avaliacoes a
     WHERE regexp_replace(coalesce(a.cpf,''), '\D', '', 'g') = v_cpf
       AND a.data_coleta = v_data::date
     ORDER BY a.created_at DESC LIMIT 1;
  ELSIF p_chave = 'user_id' AND v_data IS NOT NULL THEN
    BEGIN
      v_uid := nullif(p_dados->>'user_id', '')::uuid;
    EXCEPTION WHEN others THEN
      v_uid := NULL;
    END;
    IF v_uid IS NOT NULL THEN
      SELECT a.id INTO v_id FROM public.avaliacoes a
       WHERE a.user_id = v_uid AND a.data_coleta = v_data::date
       ORDER BY a.created_at DESC LIMIT 1;
    END IF;
  END IF;

  IF NOT public.oba_pode_escrever(v_cpf, p_crm, p_med_token, p_pac_token,
                                  'avaliacoes', v_id IS NOT NULL) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  -- `se_ausente` sai ANTES do paywall: esta chamada não grava nada.
  IF v_id IS NOT NULL AND p_modo = 'se_ausente' THEN
    RETURN jsonb_build_object('ok', true, 'id', v_id, 'acao', 'ignorado');
  END IF;

  -- ⬅ PAYWALL (servidor) — inalterado. Ver o cabeçalho de
  -- migrate_paywall_servidor.sql para o porquê de não haver isenção por caminho.
  v_e_medico  := public.token_medico_ok(p_crm, p_med_token);
  v_concluida := COALESCE((p_dados->>'concluida')::boolean, false);

  IF (NOT v_e_medico) AND v_concluida THEN
    v_alvo_ja_concluida := false;
    IF v_id IS NOT NULL THEN
      SELECT COALESCE(a.concluida, false) INTO v_alvo_ja_concluida
        FROM public.avaliacoes a WHERE a.id = v_id;
    END IF;

    -- A exclusão de `v_id` da contagem só vale quando a linha AINDA NÃO estava
    -- concluída (o espelho da triagem sendo completado). Reescrever avaliação
    -- já usada NÃO devolve a cota — era por aí que se refazia de graça.
    v_ja := public.avaliacoes_concluidas_cpf(
              v_cpf,
              CASE WHEN v_alvo_ja_concluida THEN NULL ELSE v_id END);

    IF v_ja >= 1 AND NOT public.assinatura_valida_cpf(v_cpf) THEN
      RETURN jsonb_build_object(
        'ok', false,
        'erro', 'Assinatura necessaria: a avaliacao gratuita deste CPF ja foi usada.',
        'motivo', 'paywall',
        'concluidas', v_ja);
    END IF;
  END IF;

  IF v_id IS NOT NULL AND p_modo = 'upsert' THEN
    SELECT string_agg(quote_ident(c.column_name), ', '), count(*)
      INTO v_cols, v_n
      FROM information_schema.columns c
     WHERE c.table_schema = 'public' AND c.table_name = 'avaliacoes'
       AND c.column_name NOT IN ('id', 'created_at')
       AND p_dados ? c.column_name;
    IF v_cols IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'erro', 'Nenhuma coluna valida');
    END IF;
    IF v_n = 1 THEN
      v_sql := format('UPDATE public.avaliacoes SET %s = (SELECT %s FROM jsonb_populate_record(NULL::public.avaliacoes, $1)) WHERE id = $2', v_cols, v_cols);
    ELSE
      v_sql := format('UPDATE public.avaliacoes SET (%s) = (SELECT %s FROM jsonb_populate_record(NULL::public.avaliacoes, $1)) WHERE id = $2', v_cols, v_cols);
    END IF;
    EXECUTE v_sql USING p_dados, v_id;
    RETURN jsonb_build_object('ok', true, 'id', v_id, 'acao', 'atualizado');
  END IF;

  SELECT string_agg(quote_ident(c.column_name), ', '), count(*)
    INTO v_cols, v_n
    FROM information_schema.columns c
   WHERE c.table_schema = 'public' AND c.table_name = 'avaliacoes'
     AND c.column_name NOT IN ('id', 'created_at')
     AND p_dados ? c.column_name;
  IF v_cols IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nenhuma coluna valida');
  END IF;

  v_sql := format(
    'INSERT INTO public.avaliacoes (%s) SELECT %s FROM jsonb_populate_record(NULL::public.avaliacoes, $1) RETURNING id',
    v_cols, v_cols);
  EXECUTE v_sql USING p_dados INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'acao', 'inserido');
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. GRANTs.
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.oba_pode_escrever(text,text,text,text,text,boolean)
  TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- VERIFICAÇÃO
--   -- a escrita passou a checar autorização?
--   SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE n.nspname='public' AND p.prosrc LIKE '%oba_pode_escrever%';
--   -- espera: oba_anamnese_inserir, oba_anamnese_atualizar_por_id,
--   --         oba_anamnese_atualizar_ultima, avaliacoes_salvar
--
--   -- nenhuma RPC de escrita ainda passa pela porta velha?
--   SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE n.nspname='public' AND p.prosrc LIKE '%oba_pode_ver%'
--      AND p.proname <> 'oba_pode_ver';
--   -- espera: 0 linhas
--
--   -- a autoria existe e não é editável pelo UPDATE?
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema='public' AND table_name='oba_anamnese'
--      AND column_name IN ('preenchida_por','preenchida_crm','revisao_crm');
--   -- espera: 3 linhas
-- ---------------------------------------------------------------------------

-- Recarrega o cache de schema do PostgREST (convenção do projeto).
NOTIFY pgrst, 'reload schema';
