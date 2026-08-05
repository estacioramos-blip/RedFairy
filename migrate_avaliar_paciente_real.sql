-- ============================================================================
-- migrate_avaliar_paciente_real.sql   (item 4 da auditoria ago/2026)
--
-- PROBLEMA: `medico_avaliar_paciente` credita US$ 15 (`creditos_avaliacao`) e
-- dispara o aviso no Telegram — "Nova AVALIAÇÃO médica! Pagar: US$ 15" — depois
-- de UMA única checagem sobre o paciente:
--
--     IF length(v_cpf) <> 11 THEN ... 'CPF invalido'
--
-- É só isso. Onze dígitos QUAISQUER passam. O crédito é idempotente por
-- (medico_crm, cpf_paciente), então não dá para repetir o mesmo CPF — mas CPFs
-- são infinitos. Um médico com sessão válida digita 11 dígitos, recebe US$ 15,
-- digita outros 11, recebe mais US$ 15. Nada verifica que existe uma pessoa do
-- outro lado, muito menos que havia algo para avaliar.
--
-- Isso é diferente do bloqueio de vínculo: não se trata de restringir QUAL
-- paciente o médico alcança (essa discussão já foi fechada — o médico da
-- plataforma alcança qualquer um, e sem vínculo vê só o eritron). Trata-se de
-- exigir que o paciente EXISTA. Avaliar ninguém não é trabalho médico.
--
-- REGRA NOVA, em duas camadas:
--
--   (a) O CPF tem de ser MATEMATICAMENTE VÁLIDO (dígito verificador). Onze
--       dígitos quaisquer deixam de passar — e CPF válido é rastreável a uma
--       pessoa, o que já muda o custo de inventar.
--   (b) O CPF tem de aparecer em `profiles`, `oba_anamnese` ou `avaliacoes`.
--
-- ⚠ `triagens` FICOU DE FORA de propósito, e isto é o ponto que quase me
-- escapou: a tabela tem `triagens_insert_publico ... WITH CHECK (true)` — INSERT
-- liberado para o papel público, SEM token nenhum (é assim de propósito, a
-- triagem anônima é um fluxo do produto). Aceitá-la como prova de existência
-- tornaria a régua decorativa: qualquer um com a chave anon — que está no
-- bundle — inseria uma triagem para o CPF inventado e em seguida cobrava os
-- US$ 15. A trava só vale se as fontes forem gateadas.
--
-- As três que ficaram exigem token. Um médico logado ainda consegue escrever em
-- `oba_anamnese`/`avaliacoes` de qualquer CPF — mas aí ele está fabricando
-- prontuário assinado com o próprio CRM, que fica no banco e aparece no Admin.
-- Deixa de ser "digitar números" e passa a ser falsificação documental
-- atribuível. É a diferença que importa.
--
-- ⚠ NÃO exige `validado` no médico: quem barra médico não validado é o
-- `caixa_pagar_medico`, na hora de pagar. Duplicar a régua aqui faria o médico
-- novo perder o registro do trabalho que de fato fez — a validação é posterior,
-- por foto da carteira no WhatsApp, e o crédito precisa estar esperando por ela.
--
-- Idempotente.
-- ============================================================================

-- CPF matematicamente válido (dígitos verificadores).
CREATE OR REPLACE FUNCTION public.cpf_valido(p_cpf text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  c text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  s int; d1 int; d2 int; i int;
BEGIN
  IF length(c) <> 11 THEN RETURN false; END IF;
  -- 00000000000, 11111111111, ... passam na conta dos dígitos, mas não são CPF.
  IF c ~ '^(\d)\1{10}$' THEN RETURN false; END IF;

  s := 0;
  FOR i IN 1..9 LOOP s := s + substr(c,i,1)::int * (11 - i); END LOOP;
  d1 := 11 - (s % 11); IF d1 >= 10 THEN d1 := 0; END IF;
  IF d1 <> substr(c,10,1)::int THEN RETURN false; END IF;

  s := 0;
  FOR i IN 1..10 LOOP s := s + substr(c,i,1)::int * (12 - i); END LOOP;
  d2 := 11 - (s % 11); IF d2 >= 10 THEN d2 := 0; END IF;
  RETURN d2 = substr(c,11,1)::int;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.cpf_valido(text) TO anon, authenticated;


-- Existe um paciente de verdade por trás deste CPF?
-- Função à parte para a régua ficar num lugar só — hoje o único consumidor é o
-- crédito de avaliação, mas a pergunta "esse CPF é uma pessoa?" reaparece.
-- Só fontes GATEADAS entram aqui (ver cabeçalho: `triagens` não entra).
CREATE OR REPLACE FUNCTION public.paciente_existe(p_cpf text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  WITH d AS (SELECT regexp_replace(coalesce(p_cpf,''), '\D', '', 'g') AS cpf)
  SELECT public.cpf_valido((SELECT cpf FROM d))
     AND (
       EXISTS (SELECT 1 FROM public.profiles     t WHERE regexp_replace(coalesce(t.cpf,''), '\D','','g') = (SELECT cpf FROM d))
    OR EXISTS (SELECT 1 FROM public.oba_anamnese t WHERE regexp_replace(coalesce(t.cpf,''), '\D','','g') = (SELECT cpf FROM d))
    OR EXISTS (SELECT 1 FROM public.avaliacoes   t WHERE regexp_replace(coalesce(t.cpf,''), '\D','','g') = (SELECT cpf FROM d))
     );
$function$;

GRANT EXECUTE ON FUNCTION public.paciente_existe(text) TO anon, authenticated;


-- Mesma função de antes, com a régua nova logo depois da checagem de formato.
-- O resto do corpo é idêntico — só a porta de entrada mudou.
CREATE OR REPLACE FUNCTION public.medico_avaliar_paciente(
  p_crm text, p_token text, p_cpf text, p_opiniao text, p_sugestao text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text; v_crm text; v_usd numeric; v_cot numeric;
  v_nome text; v_pix text; v_rows int; v_cpfd text; v_msg text; v_novo boolean := false;
BEGIN
  IF NOT public.token_medico_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  v_crm := upper(btrim(coalesce(p_crm,'')));
  v_cpf := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;

  -- ⬅ NOVO: onze dígitos não bastam. Tem de haver uma pessoa aqui.
  IF NOT public.paciente_existe(v_cpf) THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'Este CPF nao consta no sistema. O paciente precisa ter feito ao menos uma triagem ou cadastro antes de ser avaliado.');
  END IF;

  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'comissao_usd_nao_afiliado'), 15);
  v_cot := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'cotacao_dolar'), 0);

  -- Crédito da avaliação (idempotente: 1 por médico+paciente).
  INSERT INTO public.creditos_avaliacao (medico_crm, cpf_paciente, valor, elegivel)
  VALUES (v_crm, v_cpf, v_usd::int, true)
  ON CONFLICT (medico_crm, cpf_paciente) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  v_novo := (v_rows > 0);

  -- Opinião médica (anexo do relatório do OBA) — a mais recente prevalece.
  IF coalesce(btrim(p_opiniao),'') <> '' THEN
    INSERT INTO public.opiniao_medica (cpf_paciente, medico_crm, texto, created_at)
    VALUES (v_cpf, v_crm, btrim(p_opiniao), now())
    ON CONFLICT (cpf_paciente) DO UPDATE
      SET texto = EXCLUDED.texto, medico_crm = EXCLUDED.medico_crm, created_at = now();
  END IF;

  v_cpfd := '***.' || substr(v_cpf,4,3) || '.' || substr(v_cpf,7,3) || '-**';

  -- Telegram: crédito da avaliação (só quando é novo).
  IF v_novo THEN
    SELECT nome, pix_chave INTO v_nome, v_pix FROM public.medicos WHERE crm = v_crm;
    v_msg := '🩺 Nova AVALIAÇÃO médica!' || E'\n' ||
             'Médico: ' || COALESCE(NULLIF(v_nome,''), v_crm) || ' (CRM ' || v_crm || ')' || E'\n' ||
             'Avaliou o paciente ' || v_cpfd || '.' || E'\n' ||
             'Pagar: US$ ' || to_char(v_usd, 'FM999990.00') ||
             CASE WHEN v_cot > 0 THEN ' ≈ R$ ' || to_char(v_usd * v_cot, 'FM999990.00') ELSE '' END || E'\n' ||
             'PIX: ' || COALESCE(NULLIF(v_pix,''), '(médico sem chave PIX cadastrada)');
    PERFORM public.tg_enviar(v_msg);
  END IF;

  -- Telegram: sugestão de melhoria (sempre que houver).
  IF coalesce(btrim(p_sugestao),'') <> '' THEN
    PERFORM public.tg_enviar('💡 SUGESTÃO DE MELHORIA (CRM ' || v_crm || ', paciente ' || v_cpfd || '):' || E'\n' || btrim(p_sugestao));
  END IF;

  RETURN jsonb_build_object('ok', true, 'credito_novo', v_novo, 'valor_usd', v_usd);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.medico_avaliar_paciente(text, text, text, text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
