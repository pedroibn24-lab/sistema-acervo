-- ============================================================================
-- Correção da lógica do APC.
--
-- Modelo CORRETO: o APC é a quantidade FIXA reservada por frasco (tamanho_apc_ml),
-- vendida uma única vez a um comprador. Vender o APC:
--   - leva sempre tamanho_apc_ml (30 ou 40), não "o restante do frasco";
--   - NÃO trava os decants — a área de decants continua sendo vendida em frações,
--     independente do APC já ter sido vendido ou não.
--
-- Antes (errado): o APC levava "todo o ml restante" e marcava o perfume como
-- esgotado, bloqueando as vendas de decant.
--
-- Estas são substituições (create or replace) da função e da view — a estrutura
-- das tabelas não muda.
-- ============================================================================

create or replace function public.fn_venda_item_before()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_perfume   public.perfumes%rowtype;
  v_ml_livres integer;
  v_insumo    public.tipo_insumo;
begin
  -- FOR UPDATE trava a linha do perfume até o fim da transação, serializando
  -- vendas concorrentes do mesmo frasco.
  select * into v_perfume
  from public.perfumes
  where id = new.perfume_id
  for update;

  if not found then
    raise exception 'Perfume não encontrado ou sem permissão de acesso.'
      using errcode = 'P0001';
  end if;

  -- Custo NUNCA vem do cliente: é sempre carimbado a partir do perfume.
  new.custo_por_ml_snapshot := v_perfume.custo_por_ml;

  -- ---------------------------------------------------------------- APC -----
  -- O APC é a quantidade FIXA reservada. É vendido uma vez só (um por frasco).
  -- Vender o APC não mexe na área de decants (são porções separadas do frasco).
  if new.tipo = 'apc' then
    if v_perfume.apc_vendido then
      raise exception 'O APC de "%" já foi vendido.', v_perfume.nome
        using errcode = 'P0001',
              hint = 'Só existe um APC por frasco.';
    end if;
    new.ml := v_perfume.tamanho_apc_ml;
    new.custo_frasco_snapshot := 0;
    new.preco_venda := coalesce(
      new.preco_venda,
      v_perfume.preco_apc,
      new.ml * v_perfume.valor_venda_por_ml
    );
    return new;
  end if;

  -- ------------------------------------------------------------- DECANT -----
  -- A TRAVA: a venda fracionada só passa se couber na área de decants.
  -- O APC já ter sido vendido NÃO bloqueia decants.
  v_ml_livres := v_perfume.area_decants_ml - v_perfume.ml_vendidos_decants;
  if new.ml > v_ml_livres then
    raise exception
      'TRAVA DO APC: "%" tem apenas %ml livres na área de decants. Vender %ml invadiria o APC de %ml.',
      v_perfume.nome, v_ml_livres, new.ml, v_perfume.tamanho_apc_ml
      using errcode = 'P0001',
            hint = 'Este frasco atingiu o limite da área de decants.';
  end if;

  new.preco_venda := coalesce(new.preco_venda, new.ml * v_perfume.valor_venda_por_ml);

  -- Custo do frasco vazio, carimbado do estoque.
  v_insumo := case
                when public.fn_frasco_para_ml(new.ml) = 5 then 'frasco_5ml'
                else 'frasco_20ml'
              end::public.tipo_insumo;

  select coalesce(custo_unitario, 0) into new.custo_frasco_snapshot
  from public.estoque_insumos
  where owner_id = new.owner_id and tipo = v_insumo;

  new.custo_frasco_snapshot := coalesce(new.custo_frasco_snapshot, 0);

  return new;
end;
$$;


-- ----------------------------------------------------------------------------
-- View de saldo: APC vendido e decants passam a ser situações INDEPENDENTES.
--   apc_ml_atual  = o valor fixo do APC (não mais "o que sobrou").
--   pode_vender_decant / pode_vender_apc = flags para a tela.
-- ----------------------------------------------------------------------------
create or replace view public.vw_perfumes_saldo
with (security_invoker = on) as
select
  p.*,
  p.area_decants_ml - p.ml_vendidos_decants as ml_livres_decants,
  p.tamanho_apc_ml as apc_ml_atual,
  case
    when (p.area_decants_ml - p.ml_vendidos_decants) < 3 and p.apc_vendido then 'esgotado'
    when (p.area_decants_ml - p.ml_vendidos_decants) < 3 then 'so_apc'
    when p.apc_vendido then 'apc_vendido'
    else 'disponivel'
  end as situacao,
  ((p.area_decants_ml - p.ml_vendidos_decants) >= 3) as pode_vender_decant,
  (not p.apc_vendido) as pode_vender_apc
from public.perfumes p;
