-- ============================================================================
-- Frete: o cliente paga o frete ANTES do envio.
--
-- - sacolinhas.frete_pago: o cliente já pagou o frete daquela entrega?
-- - A trava de envio passa a exigir: perfumes pagos (já tinha) E frete pago
--   (quando há frete). Assim não dá pra enviar sem o frete quitado.
-- - vw_frete: soma dos fretes ainda não pagos ("a receber de frete"), mostrado
--   SEPARADO do a receber dos perfumes.
-- - vw_sacolinhas_resumo ganha frete_pago (a tela precisa saber o status).
-- ============================================================================

alter table public.sacolinhas
  add column if not exists frete_pago boolean not null default false;

comment on column public.sacolinhas.frete_pago is
  'O cliente já pagou o frete desta entrega. Exigido para poder enviar.';


-- ----------------------------------------------------------------------------
-- Trava de envio: perfumes pagos + frete pago (quando valor_frete > 0).
-- Mesma função de antes, com a checagem do frete acrescentada.
-- ----------------------------------------------------------------------------
create or replace function public.fn_sacolinha_enviar()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_frascos_5  integer;
  v_frascos_20 integer;
  v_col        integer;
  v_ind        integer;
  v_tem        integer;
begin
  if new.status_envio = 'enviado' and old.status_envio is distinct from 'enviado' then

    -- TRAVA DE PAGAMENTO DOS PERFUMES: não envia com item não pago.
    if exists (
      select 1 from public.vendas_itens vi
      where vi.sacolinha_id = new.id
        and vi.status_pagamento_perfume = 'pendente'
    ) then
      raise exception 'Não dá pra enviar: há itens não pagos nesta sacolinha.'
        using errcode = 'P0001', hint = 'Marque todos os itens como pagos antes de enviar.';
    end if;

    -- TRAVA DO FRETE: se há frete, ele precisa estar pago antes do envio.
    if new.valor_frete > 0 and not new.frete_pago then
      raise exception 'Não dá pra enviar: o frete ainda não foi pago.'
        using errcode = 'P0001', hint = 'Marque o frete como pago antes de enviar.';
    end if;

    if new.enviado_em is null then
      new.enviado_em := now();
    end if;

    select
      count(*) filter (where vi.frasco_ml = 5),
      count(*) filter (where vi.frasco_ml = 20)
    into v_frascos_5, v_frascos_20
    from public.vendas_itens vi
    where vi.sacolinha_id = new.id;

    select caixas_coletivas, caixas_individuais
    into v_col, v_ind
    from public.fn_sugerir_caixas(coalesce(v_frascos_5, 0), coalesce(v_frascos_20, 0));

    if coalesce(v_col, 0) > 0 then
      select coalesce(quantidade, 0) into v_tem
      from public.estoque_insumos
      where owner_id = new.owner_id and tipo = 'caixa_coletiva';
      if coalesce(v_tem, 0) < v_col then
        raise exception 'Sem caixa coletiva suficiente no estoque: precisa de %, tem %.',
          v_col, coalesce(v_tem, 0)
          using errcode = 'P0001', hint = 'Adicione caixas na tela Estoque.';
      end if;
      update public.estoque_insumos
        set quantidade = quantidade - v_col
        where owner_id = new.owner_id and tipo = 'caixa_coletiva';
    end if;

    if coalesce(v_ind, 0) > 0 then
      select coalesce(quantidade, 0) into v_tem
      from public.estoque_insumos
      where owner_id = new.owner_id and tipo = 'caixa_individual';
      if coalesce(v_tem, 0) < v_ind then
        raise exception 'Sem caixa individual suficiente no estoque: precisa de %, tem %.',
          v_ind, coalesce(v_tem, 0)
          using errcode = 'P0001', hint = 'Adicione caixas na tela Estoque.';
      end if;
      update public.estoque_insumos
        set quantidade = quantidade - v_ind
        where owner_id = new.owner_id and tipo = 'caixa_individual';
    end if;

  end if;

  return new;
end;
$$;


-- ----------------------------------------------------------------------------
-- vw_frete: total de frete ainda não pago (a receber de frete).
-- ----------------------------------------------------------------------------
create or replace view public.vw_frete
with (security_invoker = on) as
select
  coalesce(sum(valor_frete) filter (where not frete_pago), 0) as a_receber_frete
from public.sacolinhas;


-- ----------------------------------------------------------------------------
-- vw_sacolinhas_resumo: acrescenta frete_pago no fim (a tela precisa do status).
-- ----------------------------------------------------------------------------
create or replace view public.vw_sacolinhas_resumo
with (security_invoker = on) as
with itens as (
  select
    vi.sacolinha_id,
    count(*) filter (where vi.frasco_ml = 5)::integer   as frascos_5,
    count(*) filter (where vi.frasco_ml = 20)::integer  as frascos_20,
    count(*) filter (where vi.tipo = 'decant')::integer as qtd_decants,
    coalesce(sum(vi.preco_venda), 0)                    as valor_itens,
    coalesce(sum(vi.lucro), 0)                          as lucro,
    bool_or(vi.status_pagamento_perfume = 'pendente')   as tem_perfume_pendente,
    bool_or(vi.status_pagamento_frete = 'pendente')     as tem_frete_pendente
  from public.vendas_itens vi
  group by vi.sacolinha_id
)
select
  s.id,
  s.cliente_id,
  c.nome     as cliente_nome,
  c.whatsapp as cliente_whatsapp,
  s.status_envio,
  s.valor_frete,
  coalesce(i.qtd_decants, 0)              as qtd_decants,
  coalesce(i.frascos_5, 0)                as frascos_5ml,
  coalesce(i.frascos_20, 0)               as frascos_20ml,
  cx.caixas_coletivas                     as caixas_coletivas_sugeridas,
  cx.caixas_individuais                   as caixas_individuais_sugeridas,
  coalesce(i.valor_itens, 0)              as valor_itens,
  coalesce(i.lucro, 0)                    as lucro,
  coalesce(i.tem_perfume_pendente, false) as tem_perfume_pendente,
  coalesce(i.tem_frete_pendente, false)   as tem_frete_pendente,
  s.created_at,
  s.frete_pago
from public.sacolinhas s
join public.clientes c on c.id = s.cliente_id
left join itens i on i.sacolinha_id = s.id
left join lateral public.fn_sugerir_caixas(
  coalesce(i.frascos_5, 0),
  coalesce(i.frascos_20, 0)
) cx on true;
