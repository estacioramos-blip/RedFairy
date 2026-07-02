-- =============================================================================
-- migrate_decisoes_a3_a4.sql   (decisões do Estácio, 02/07/2026)
-- =============================================================================
-- RASCUNHO PARA REVISÃO — rodar no Supabase Dashboard → SQL Editor.
-- Roda DEPOIS de migrate_ind_link.sql (parte da mesma família de fn_credita_medico).
--
-- A3 — COMISSÃO É 1x NA VIDA DO PACIENTE (por indicação/entrada na plataforma).
--   O gatilho de crédito dispara toda vez que uma assinatura vira 'ativa' — inclusive
--   nas RENOVAÇÕES anuais. As travas de unicidade eram POR TABELA (creditos_medico e
--   creditos_indicador separadas), então o mesmo paciente podia gerar comissão pro
--   médico no ano 1 e pro indicador na renovação do ano 2. Agora: se o CPF já gerou
--   crédito em QUALQUER uma das duas tabelas, nenhuma renovação gera de novo.
--   (creditos_avaliacao NÃO entra na trava: o AVALIAR é pagamento por trabalho feito,
--   1 por médico+paciente, não comissão de indicação.)
--
-- A4 — MENSAGEM HONESTA no login do indicador.
--   O paciente que vira indicador pelo INDICAR é criado SEM senha (acessa pela sessão
--   de paciente). Se ele tentava entrar por ?modo=indicador, recebia "CPF nao
--   encontrado" (mentira — existe, só não tem senha) e o recadastro era bloqueado.
--   Agora a mensagem diz a verdade e aponta o caminho certo (app de paciente → INDICAR).
-- =============================================================================

-- A3) fn_credita_medico — trava vitalícia cruzada -------------------------------
-- (idêntica à de migrate_ind_link.sql, + o portão vitalício logo após resolver o CPF.)
CREATE OR REPLACE FUNCTION public.fn_credita_medico()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf  text; v_medico text; v_ind text; v_orig text; v_rows int;
  v_nome text; v_pix text; v_usd numeric; v_usd_ind numeric; v_cot numeric;
  v_cpfd text; v_msg text; v_elegivel boolean;
BEGIN
  IF NEW.status <> 'ativa' THEN RETURN NEW; END IF;
  SELECT cpf INTO v_cpf FROM public.profiles WHERE id = NEW.user_id;
  IF v_cpf IS NULL THEN RETURN NEW; END IF;

  -- (A3) COMISSÃO 1x NA VIDA: CPF que já gerou crédito (médico OU indicador) não gera
  -- de novo — renovação anual é mérito da plataforma, não nova indicação.
  IF EXISTS (SELECT 1 FROM public.creditos_medico    WHERE cpf_paciente = v_cpf)
  OR EXISTS (SELECT 1 FROM public.creditos_indicador WHERE cpf_paciente = v_cpf) THEN
    RETURN NEW;
  END IF;

  SELECT indicador_codigo INTO v_ind FROM public.indicacoes_precadastro
    WHERE cpf_paciente = v_cpf AND confirmado = true
    ORDER BY created_at DESC LIMIT 1;

  SELECT ref INTO v_medico FROM (
    SELECT medico_crm AS ref, created_at FROM public.triagens
      WHERE cpf = v_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
    UNION ALL
    SELECT medico_crm, created_at FROM public.avaliacoes
      WHERE cpf = v_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
    UNION ALL
    SELECT medico_crm, created_at FROM public.encaminhamentos_medico
      WHERE cpf_paciente = v_cpf AND medico_crm IS NOT NULL AND btrim(medico_crm) <> ''
        AND created_at > now() - interval '3 months'          -- reserva vale 3 meses
  ) s ORDER BY created_at DESC LIMIT 1;

  v_orig := COALESCE(NULLIF(v_ind, ''), NULLIF(v_medico, ''));
  IF v_orig IS NULL OR btrim(v_orig) = '' THEN RETURN NEW; END IF;

  v_usd := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'comissao_usd_por_conversao'), 10);
  v_usd_ind := v_usd;
  v_cot := COALESCE((SELECT NULLIF(valor,'')::numeric FROM public.config WHERE chave = 'cotacao_dolar'), 0);
  v_cpfd := regexp_replace(coalesce(v_cpf,''), '\D', '', 'g');
  v_cpfd := CASE WHEN length(v_cpfd) = 11
                 THEN '***.' || substr(v_cpfd,4,3) || '.' || substr(v_cpfd,7,3) || '-**'
                 ELSE coalesce(v_cpf,'-') END;

  IF EXISTS (SELECT 1 FROM public.indicadores WHERE codigo = v_orig) THEN
    INSERT INTO public.creditos_indicador (indicador_codigo, cpf_paciente, assinatura_id, elegivel)
    VALUES (v_orig, v_cpf, NEW.id, true)
    ON CONFLICT (cpf_paciente) DO NOTHING;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN RETURN NEW; END IF;
    SELECT nome, COALESCE(NULLIF(pix_chave,''), usdc_wallet) INTO v_nome, v_pix
      FROM public.indicadores WHERE codigo = v_orig;
    v_msg := '💸 Nova indicação paga (INDICADOR)!' || E'\n' ||
             'Indicador: ' || COALESCE(NULLIF(v_nome,''), v_orig) || ' (' || v_orig || ')' || E'\n' ||
             'Paciente ' || v_cpfd || ' cadastrou e pagou.' || E'\n' ||
             'Pagar: US$ ' || to_char(v_usd_ind, 'FM999990.00') ||
             CASE WHEN v_cot > 0 THEN ' ≈ R$ ' || to_char(v_usd_ind * v_cot, 'FM999990.00') ELSE '' END || E'\n' ||
             'Receber em: ' || COALESCE(NULLIF(v_pix,''), '(sem PIX/USDC cadastrado)');
    PERFORM public.tg_enviar(v_msg);
    RETURN NEW;
  END IF;

  -- (B2) só credita como MÉDICO com formato de CRM (evita crédito órfão que trava o CPF).
  IF v_orig !~ '^[0-9]+\s*/\s*[A-Z]{2}$' THEN RETURN NEW; END IF;

  UPDATE public.profiles SET medico_origem = v_orig WHERE id = NEW.user_id;
  v_elegivel := public.medico_tem_avaliacao_completa(v_orig);
  INSERT INTO public.creditos_medico (medico_crm, cpf_paciente, assinatura_id, elegivel)
  VALUES (v_orig, v_cpf, NEW.id, v_elegivel)
  ON CONFLICT (cpf_paciente) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN NEW; END IF;
  IF NOT v_elegivel THEN RETURN NEW; END IF;

  SELECT nome, pix_chave INTO v_nome, v_pix FROM public.medicos WHERE crm = v_orig;
  v_msg := '💰 Nova comissão (ENCAMINHAMENTO)!' || E'\n' ||
           'Médico: ' || COALESCE(NULLIF(v_nome,''), v_orig) || ' (CRM ' || v_orig || ')' || E'\n' ||
           'Paciente ' || v_cpfd || ' cadastrou e pagou.' || E'\n' ||
           'Pagar: US$ ' || to_char(v_usd, 'FM999990.00') ||
           CASE WHEN v_cot > 0 THEN ' ≈ R$ ' || to_char(v_usd * v_cot, 'FM999990.00') ELSE '' END || E'\n' ||
           'PIX: ' || COALESCE(NULLIF(v_pix,''), '(médico sem chave PIX cadastrada)');
  PERFORM public.tg_enviar(v_msg);
  RETURN NEW;
END;
$function$;

-- A4) login_indicador — mensagem honesta pro paciente-indicador (sem senha) -----
CREATE OR REPLACE FUNCTION public.login_indicador(p_cpf text, p_senha text)
  RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf   text := translate(coalesce(p_cpf, ''), '.- /()', '');
  v_token text;
  r       record;
BEGIN
  SELECT id, nome, codigo, senha_klipbit, ativo, pix_chave, usdc_wallet, tipo INTO r
  FROM public.indicadores WHERE cpf = v_cpf;

  IF r.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF nao encontrado');
  END IF;
  -- (A4) Paciente que virou indicador pelo INDICAR: existe, mas SEM senha (acessa pela
  -- sessão de paciente). Antes: "CPF nao encontrado" (mentira, beco sem saída).
  IF r.senha_klipbit IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'erro',
      'Voce ja indica pelo seu app de PACIENTE. Entre pelo icone do OBA e toque em INDICAR — seus creditos estao la.');
  END IF;
  IF crypt(p_senha, r.senha_klipbit) <> r.senha_klipbit THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Senha incorreta');
  END IF;
  IF NOT r.ativo THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Indicador inativo');
  END IF;

  v_token := encode(gen_random_bytes(24), 'hex');
  UPDATE public.indicadores
     SET session_token_hash = encode(digest(v_token, 'sha256'), 'hex'),
         session_token_exp = now() + interval '30 days'
   WHERE id = r.id;

  RETURN jsonb_build_object('ok', true, 'id', r.id, 'nome', r.nome, 'codigo', r.codigo,
                            'token', v_token, 'pix', r.pix_chave, 'usdc', r.usdc_wallet);
END;
$$;

-- A4) register_indicador — mesma honestidade no cadastro ------------------------
CREATE OR REPLACE FUNCTION public.register_indicador(
  p_cpf text, p_senha text, p_nome text DEFAULT NULL,
  p_celular text DEFAULT NULL, p_email text DEFAULT NULL,
  p_pix text DEFAULT NULL, p_usdc text DEFAULT NULL, p_tipo text DEFAULT NULL
) RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_cpf    text := translate(coalesce(p_cpf, ''), '.- /()', '');
  v_codigo text;
  v_id     uuid;
  v_token  text;
  v_sem_senha boolean;
BEGIN
  IF length(v_cpf) <> 11 THEN RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido'); END IF;
  IF coalesce(length(p_senha), 0) < 6 THEN RETURN jsonb_build_object('ok', false, 'erro', 'Senha muito curta (minimo 6)'); END IF;
  SELECT (senha_klipbit IS NULL) INTO v_sem_senha FROM public.indicadores WHERE cpf = v_cpf;
  IF FOUND THEN
    IF v_sem_senha THEN
      -- (A4) paciente-indicador tentando "se cadastrar" na porta do indicador
      RETURN jsonb_build_object('ok', false, 'erro',
        'Voce ja indica pelo seu app de PACIENTE. Entre pelo icone do OBA e toque em INDICAR — seus creditos estao la.');
    END IF;
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF ja cadastrado como indicador');
  END IF;

  LOOP
    v_codigo := 'IND' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.indicadores WHERE codigo = v_codigo);
  END LOOP;

  v_token := encode(gen_random_bytes(24), 'hex');

  INSERT INTO public.indicadores (codigo, cpf, nome, celular, email, pix_chave, usdc_wallet, tipo, senha_klipbit, session_token_hash, session_token_exp)
  VALUES (v_codigo, v_cpf, p_nome, p_celular, p_email, p_pix, p_usdc, p_tipo, crypt(p_senha, gen_salt('bf', 10)),
          encode(digest(v_token, 'sha256'), 'hex'), now() + interval '30 days')
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'id', v_id, 'codigo', v_codigo, 'token', v_token);
END;
$$;
