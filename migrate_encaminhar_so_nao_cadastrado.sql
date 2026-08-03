-- ============================================================================
-- migrate_encaminhar_so_nao_cadastrado.sql
--
-- PROBLEMA (levantado pelo Dr. Ramos ao testar a régua de vínculo):
-- `medico_encaminhar_cpf` aceitava CPF de paciente JÁ CADASTRADO. Ele até
-- detectava (`ja_cadastrado`) e a tela avisava "esse paciente já faz parte do
-- Projeto", mas concluía com "o encaminhamento foi registrado mesmo assim".
--
-- Dois estragos, e o segundo só apareceu agora:
--
--   1) DINHEIRO (bug antigo, independente do vínculo): o INSERT usa
--      `ON CONFLICT (cpf_paciente) DO UPDATE ... created_at = now()`, e
--      `fn_credita_medico` atribui por ÚLTIMO TOQUE. Então "recomendar" um
--      paciente já cadastrado SOBRESCREVE o encaminhador anterior e passa a
--      frente na fila da comissão — roubando o crédito de quem realmente
--      trouxe o paciente.
--
--   2) PRONTUÁRIO (novo): `encaminhamentos_medico` é uma das 6 fontes de
--      vínculo (migrate_vinculo_medico_paciente.sql). Com isso, digitar um CPF
--      aqui virou um ATALHO de um clique para destravar o histórico clínico de
--      qualquer paciente — contornando a régua inteira.
--
-- REGRA (decidida pelo Dr. Ramos): encaminhamento é para trazer gente NOVA.
-- Para quem já está no sistema, o caminho é AVALIAR — que é um ato médico de
-- verdade, fica registrado na trilha e cria o vínculo legitimamente.
--
-- Não mexe em quem NÃO está cadastrado: esse é o uso legítimo (reserva de 3
-- meses) e continua igual.
--
-- Idempotente (CREATE OR REPLACE). Assinatura preservada.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.medico_encaminhar_cpf(p_crm text, p_token text, p_cpf text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text; v_crm text; v_ja boolean;
BEGIN
  IF NOT public.token_medico_ok(p_crm, p_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;
  v_crm := upper(btrim(coalesce(p_crm,'')));
  v_cpf := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  IF length(v_cpf) <> 11 THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'CPF invalido');
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE cpf = v_cpf) INTO v_ja;

  -- JÁ CADASTRADO: recusa. Antes gravava "mesmo assim" — e era por aí que se
  -- desviava comissão e se destravava prontuário alheio.
  IF v_ja THEN
    RETURN jsonb_build_object(
      'ok', false,
      'ja_cadastrado', true,
      'erro', 'Esse paciente ja faz parte do Projeto. Para atende-lo, use AVALIAR com o CPF dele.'
    );
  END IF;

  -- Registra a intenção (a mais recente prevalece — coerente com o ORDER BY
  -- DESC do crédito). Só para quem AINDA NÃO está no sistema.
  INSERT INTO public.encaminhamentos_medico (cpf_paciente, medico_crm, created_at)
  VALUES (v_cpf, v_crm, now())
  ON CONFLICT (cpf_paciente) DO UPDATE SET medico_crm = EXCLUDED.medico_crm, created_at = now();

  RETURN jsonb_build_object('ok', true, 'cpf', v_cpf, 'ja_cadastrado', false);
END;
$function$;

NOTIFY pgrst, 'reload schema';
