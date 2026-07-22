-- ============================================================================
-- vw_caixa: posição de caixa simplificada.
--   investido = total gasto comprando os frascos (soma do custo dos perfumes).
--   recebido  = total já pago pelos clientes.
--   caixa     = recebido - investido (fica negativo até recuperar o investimento).
--
-- Observação: não considera custo de frasco vazio, caixas nem frete, porque
-- esses custos não são cadastrados hoje.
--
-- security_invoker: os subselects respeitam a RLS, somando só os dados do dono.
-- ============================================================================

create or replace view public.vw_caixa
with (security_invoker = on) as
select
  coalesce((select sum(p.preco_custo_total) from public.perfumes p), 0) as investido,
  coalesce(
    (select sum(vi.preco_venda) from public.vendas_itens vi
      where vi.status_pagamento_perfume = 'pago'),
    0
  ) as recebido,
  coalesce(
    (select sum(vi.preco_venda) from public.vendas_itens vi
      where vi.status_pagamento_perfume = 'pago'),
    0
  ) - coalesce((select sum(p.preco_custo_total) from public.perfumes p), 0) as caixa;
