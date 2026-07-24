-- ============================================================================
-- Dados COMPARTILHADOS (Caminho B): todo usuário logado vê e mexe nos mesmos
-- dados (um único espaço de trabalho, o negócio). O acesso é controlado por
-- quem ganha login (cadastro público desligado no painel).
--
-- Mudanças:
--   1. RLS: de "só o dono (auth.uid())" para "qualquer usuário autenticado".
--      Anônimo continua bloqueado (default deny).
--   2. Unicidade global: WhatsApp único no negócio; estoque único por tipo
--      (um estoque só, compartilhado).
--   3. Gatilhos do estoque: localizam o insumo por TIPO (não mais por dono).
--
-- owner_id continua existindo como "quem criou" (histórico) — deixa de controlar
-- acesso, mas fica pronto pra uma auditoria futura ("quem mexeu em quê").
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. RLS — qualquer usuário autenticado acessa tudo (anon segue negado)
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['perfumes', 'clientes', 'sacolinhas', 'estoque_insumos', 'vendas_itens']
  loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);
  end loop;
end $$;

-- Nomes antigos usavam prefixos curtos ('estoque_*', 'vendas_itens_*'); garante
-- que sumiram também.
drop policy if exists estoque_select on public.estoque_insumos;
drop policy if exists estoque_insert on public.estoque_insumos;
drop policy if exists estoque_update on public.estoque_insumos;
drop policy if exists estoque_delete on public.estoque_insumos;

-- Recria: acesso liberado para o papel 'authenticated' (usuário logado).
do $$
declare
  t text;
begin
  foreach t in array array['perfumes', 'clientes', 'sacolinhas', 'estoque_insumos', 'vendas_itens']
  loop
    execute format('create policy %I_select on public.%I for select to authenticated using (true)', t, t);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (true)', t, t);
    execute format('create policy %I_update on public.%I for update to authenticated using (true) with check (true)', t, t);
    execute format('create policy %I_delete on public.%I for delete to authenticated using (true)', t, t);
  end loop;
end $$;


-- ----------------------------------------------------------------------------
-- 2. Unicidade global (não mais por dono)
-- ----------------------------------------------------------------------------
alter table public.clientes drop constraint if exists uq_whatsapp_por_owner;
alter table public.clientes add constraint uq_whatsapp unique (whatsapp);

alter table public.estoque_insumos drop constraint if exists uq_insumo_por_owner;
alter table public.estoque_insumos add constraint uq_insumo_tipo unique (tipo);


-- ----------------------------------------------------------------------------
-- 3. Gatilhos: estoque localizado por TIPO (estoque compartilhado)
-- ----------------------------------------------------------------------------

-- 3a. Antes da venda: carimba o custo do frasco a partir do estoque (por tipo).
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
  select * into v_perfume
  from public.perfumes
  where id = new.perfume_id
  for update;

  if not found then
    raise exception 'Perfume não encontrado ou sem permissão de acesso.'
      using errcode = 'P0001';
  end if;

  if v_perfume.finalizado_em is not null then
    raise exception 'O perfume "%" foi finalizado e não aceita novas vendas.', v_perfume.nome
      using errcode = 'P0001',
            hint = 'Reative o perfume antes de vender.';
  end if;

  new.custo_por_ml_snapshot := v_perfume.custo_por_ml;

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

  v_ml_livres := v_perfume.area_decants_ml - v_perfume.ml_vendidos_decants;
  if new.ml > v_ml_livres then
    raise exception
      'TRAVA DO APC: "%" tem apenas %ml livres na área de decants. Vender %ml invadiria o APC de %ml.',
      v_perfume.nome, v_ml_livres, new.ml, v_perfume.tamanho_apc_ml
      using errcode = 'P0001',
            hint = 'Este frasco atingiu o limite da área de decants.';
  end if;

  new.preco_venda := coalesce(new.preco_venda, new.ml * v_perfume.valor_venda_por_ml);

  v_insumo := case
                when public.fn_frasco_para_ml(new.ml) = 5 then 'frasco_5ml'
                else 'frasco_20ml'
              end::public.tipo_insumo;

  select coalesce(custo_unitario, 0) into new.custo_frasco_snapshot
  from public.estoque_insumos
  where tipo = v_insumo;

  new.custo_frasco_snapshot := coalesce(new.custo_frasco_snapshot, 0);

  return new;
end;
$$;

-- 3b. Depois da venda: baixa/devolve o frasco no estoque compartilhado (por tipo).
create or replace function public.fn_venda_item_after()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item   record;
  v_sinal  integer;
  v_insumo public.tipo_insumo;
begin
  if tg_op = 'INSERT' then
    v_item  := new;
    v_sinal := 1;
  else
    v_item  := old;
    v_sinal := -1;
  end if;

  if v_item.tipo = 'apc' then
    update public.perfumes
       set apc_vendido = (tg_op = 'INSERT')
     where id = v_item.perfume_id;
    return null;
  end if;

  update public.perfumes
     set ml_vendidos_decants = ml_vendidos_decants + (v_sinal * v_item.ml)
   where id = v_item.perfume_id;

  v_insumo := case when v_item.frasco_ml = 5 then 'frasco_5ml'
                   else 'frasco_20ml' end::public.tipo_insumo;

  update public.estoque_insumos
     set quantidade = quantidade - v_sinal
   where tipo = v_insumo;

  if not found then
    raise exception 'Sem registro de estoque para "%". Cadastre o insumo antes de vender.', v_insumo
      using errcode = 'P0001';
  end if;

  return null;
end;
$$;

-- 3c. Envio: debita as caixas do estoque compartilhado (por tipo).
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

    if exists (
      select 1 from public.vendas_itens vi
      where vi.sacolinha_id = new.id
        and vi.status_pagamento_perfume = 'pendente'
    ) then
      raise exception 'Não dá pra enviar: há itens não pagos nesta sacolinha.'
        using errcode = 'P0001', hint = 'Marque todos os itens como pagos antes de enviar.';
    end if;

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
      where tipo = 'caixa_coletiva';
      if coalesce(v_tem, 0) < v_col then
        raise exception 'Sem caixa coletiva suficiente no estoque: precisa de %, tem %.',
          v_col, coalesce(v_tem, 0)
          using errcode = 'P0001', hint = 'Adicione caixas na tela Estoque.';
      end if;
      update public.estoque_insumos
        set quantidade = quantidade - v_col
        where tipo = 'caixa_coletiva';
    end if;

    if coalesce(v_ind, 0) > 0 then
      select coalesce(quantidade, 0) into v_tem
      from public.estoque_insumos
      where tipo = 'caixa_individual';
      if coalesce(v_tem, 0) < v_ind then
        raise exception 'Sem caixa individual suficiente no estoque: precisa de %, tem %.',
          v_ind, coalesce(v_tem, 0)
          using errcode = 'P0001', hint = 'Adicione caixas na tela Estoque.';
      end if;
      update public.estoque_insumos
        set quantidade = quantidade - v_ind
        where tipo = 'caixa_individual';
    end if;

  end if;

  return new;
end;
$$;
