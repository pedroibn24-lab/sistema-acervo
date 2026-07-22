-- ============================================================================
-- Separa lucro REALIZADO (já pago) do lucro PREVISTO (tudo, se todos pagarem).
--
-- Antes, lucro_liquido somava o lucro de TODAS as vendas, inclusive as ainda
-- não pagas — o que dá a entender que o dinheiro já entrou. Agora:
--   - lucro_realizado = lucro só dos itens PAGOS (o que de fato já foi lucrado).
--   - lucro_previsto  = lucro de todos os itens (o antigo lucro_liquido).
--
-- drop + create porque renomear/reordenar colunas de view não é permitido por
-- "create or replace". Nada no banco depende desta view.
-- ============================================================================

drop view if exists public.vw_financeiro;

create view public.vw_financeiro
with (security_invoker = on) as
select
  coalesce(sum(vi.preco_venda), 0)                                                        as faturamento_bruto,
  coalesce(sum(vi.preco_venda) filter (where vi.status_pagamento_perfume = 'pago'), 0)     as faturamento_recebido,
  coalesce(sum(vi.preco_venda) filter (where vi.status_pagamento_perfume = 'pendente'), 0) as a_receber,
  coalesce(sum(vi.custo_total), 0)                                                         as custo_proporcional_total,
  coalesce(sum(vi.lucro) filter (where vi.status_pagamento_perfume = 'pago'), 0)           as lucro_realizado,
  coalesce(sum(vi.lucro), 0)                                                               as lucro_previsto,
  count(*) filter (where vi.tipo = 'decant')                                               as decants_vendidos,
  count(*) filter (where vi.tipo = 'apc')                                                  as apcs_vendidos
from public.vendas_itens vi;
