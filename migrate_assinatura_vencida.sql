-- ============================================================================
-- migrate_assinatura_vencida.sql   (item 5 da auditoria ago/2026)
--
-- PROBLEMA: `assinatura_minha` decide se o paciente tem acesso pago com
--
--     WHERE a.status = 'ativa'
--
-- e mais nada. `data_fim` é SELECIONADA (o painel usa para o alerta de
-- vencimento) mas nunca FILTRA. Resultado: anuidade de R$ 149,90/ano que venceu
-- há um ano continua dando acesso completo, para sempre — porque ninguém nunca
-- muda o `status` de 'ativa' para outra coisa quando a data passa. Não existe
-- rotina de expiração, nem job, nem trigger: o status só muda se um humano
-- bloquear no Caixa.
--
-- O detalhe que mostra que isso é descuido e não decisão: o painel do paciente
-- JÁ TEM o texto "Sua anuidade venceu há N dias" (PatientDashboard, alerta de
-- 15/5 dias). O sistema avisa que venceu e segue liberando tudo.
--
-- SOLUÇÃO: a RPC passa a dizer as três coisas separadamente, em vez de misturar
-- "existe" com "vale":
--
--   · `vencida` — a data passou;
--   · `valida`  — status ativa E ainda não venceu  ← é ISTO que libera acesso;
--   · a linha inteira continua vindo (com `data_fim`), mesmo vencida.
--
-- Devolver a linha vencida em vez de escondê-la é deliberado: se ela sumisse, o
-- paciente viraria "nunca assinou" e o painel perderia justamente o alerta de
-- vencimento — o aviso desapareceria no exato momento em que passa a importar,
-- e ele veria um "assine" genérico em vez de "sua anuidade venceu, renove".
--
-- ⚠ `data_fim IS NULL` conta como VÁLIDA. Linha assim é malformada (não deveria
-- existir; hoje não existe nenhuma), e recusar acesso por causa de um dado que
-- falta puniria quem pagou. Preferi errar a favor do paciente e deixar visível.
--
-- ⚠ O QUE ESTA MIGRAÇÃO **NÃO** FAZ: não cria trava no servidor. O paywall do
-- RedFairy é inteiramente no cliente (`precisaPaywallNova`, no PatientDashboard)
-- — conferido: `avaliacoes_salvar` e `oba_anamnese_inserir` não consultam
-- assinatura nenhuma. Ou seja, isto conserta a CONTA (quem está em dia), não
-- fecha a porta: quem abrir o devtools continua contornando o paywall, vencido
-- ou não. Fechar de verdade é mover a régra para dentro do `avaliacoes_salvar`,
-- e é trabalho à parte.
--
-- Estado ao escrever: 4 assinaturas, todas 'ativa', NENHUMA vencida (vencem em
-- 2027). Ninguém perde acesso ao aplicar isto.
--
-- Idempotente.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.assinatura_minha(p_cpf text, p_pac_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cpf text := regexp_replace(coalesce(p_cpf,''), '\D', '', 'g');
  v jsonb;
BEGIN
  IF NOT public.token_paciente_ok(v_cpf, p_pac_token) THEN
    RETURN jsonb_build_object('ok', false, 'erro', 'Nao autorizado');
  END IF;

  SELECT jsonb_build_object(
           'id', a.id, 'status', a.status,
           'data_inicio', a.data_inicio, 'data_fim', a.data_fim,
           'valor_pago', a.valor_pago,
           -- A data já passou?
           'vencida', (a.data_fim IS NOT NULL AND a.data_fim < now()),
           -- É ISTO que libera o acesso pago. `data_fim` nula conta como válida
           -- (ver cabeçalho): linha malformada não deve punir quem pagou.
           'valida',  (a.status = 'ativa' AND (a.data_fim IS NULL OR a.data_fim >= now())),
           'dias_restantes', CASE WHEN a.data_fim IS NULL THEN NULL
                                  ELSE ceil(EXTRACT(EPOCH FROM (a.data_fim - now())) / 86400)::int END
         )
    INTO v
    FROM public.assinaturas a
    JOIN public.profiles p ON p.id = a.user_id
   WHERE regexp_replace(coalesce(p.cpf,''), '\D','','g') = v_cpf
     AND a.status = 'ativa'
   -- A mais LONGE no tempo primeiro: quem renovou tem DUAS linhas 'ativa'
   -- (`assinatura_registrar_pagamento` insere, não atualiza), e a que vale é a
   -- de vencimento maior.
   --
   -- `NULLS LAST` é a parte que não é óbvia: em `DESC` o padrão do Postgres é
   -- NULLS FIRST, então uma linha malformada (sem `data_fim`) venceria o
   -- ORDER BY e — como nulo conta como válida — daria acesso VITALÍCIO,
   -- escondendo a assinatura real que está logo abaixo. Com NULLS LAST a linha
   -- boa sempre ganha; a malformada só aparece se for a única, que é o caso em
   -- que ser permissivo protege quem pagou.
   ORDER BY a.data_fim DESC NULLS LAST
   LIMIT 1;

  RETURN jsonb_build_object('ok', true, 'assinatura', v,
                            'valida', COALESCE((v->>'valida')::boolean, false));
END;
$function$;

GRANT EXECUTE ON FUNCTION public.assinatura_minha(text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
