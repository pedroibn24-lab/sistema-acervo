-- ============================================================================
-- vw_devedores: quem tem pagamento pendente, com o total devido por cliente.
-- Junta clientes -> sacolinhas -> vendas_itens, filtra os itens pendentes e
-- soma por cliente. Ordena do que mais deve para o que menos deve.
--
-- security_invoker: os joins respeitam a RLS, mostrando só os dados do dono.
-- ============================================================================

create or replace view public.vw_devedores
with (security_invoker = on) as
select
  c.id                     as cliente_id,
  c.nome,
  c.whatsapp,
  count(vi.id)             as itens_pendentes,
  coalesce(sum(vi.preco_venda), 0) as total_devido
from public.clientes c
join public.sacolinhas s   on s.cliente_id = c.id
join public.vendas_itens vi on vi.sacolinha_id = s.id
where vi.status_pagamento_perfume = 'pendente'
group by c.id, c.nome, c.whatsapp
order by total_devido desc;
