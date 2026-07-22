-- ============================================================================
-- Regra: só é possível enviar uma sacolinha quando TODOS os itens dela estão
-- pagos. Recria fn_sacolinha_enviar acrescentando essa checagem antes de
-- debitar as caixas. O resto (debitar caixas, carimbar enviado_em) continua igual.
-- ============================================================================

create or replace function public.fn_sacolinha_enviar()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_frascos_5  integer;
  v_frascos_20 integer;
  v_col        integer;  -- caixas coletivas sugeridas
  v_ind        integer;  -- caixas individuais sugeridas
  v_tem        integer;  -- quanto há no estoque
begin
  -- só faz algo quando a sacolinha PASSA a 'enviado' (não em qualquer update)
  if new.status_envio = 'enviado' and old.status_envio is distinct from 'enviado' then

    -- TRAVA DE PAGAMENTO: não envia se sobrar algum item não pago.
    if exists (
      select 1 from public.vendas_itens vi
      where vi.sacolinha_id = new.id
        and vi.status_pagamento_perfume = 'pendente'
    ) then
      raise exception 'Não dá pra enviar: há itens não pagos nesta sacolinha.'
        using errcode = 'P0001', hint = 'Marque todos os itens como pagos antes de enviar.';
    end if;

    -- carimba a data de envio (obrigatória quando status='enviado')
    if new.enviado_em is null then
      new.enviado_em := now();
    end if;

    -- conta os frascos da sacolinha, igual à vw_sacolinhas_resumo
    select
      count(*) filter (where vi.frasco_ml = 5),
      count(*) filter (where vi.frasco_ml = 20)
    into v_frascos_5, v_frascos_20
    from public.vendas_itens vi
    where vi.sacolinha_id = new.id;

    -- caixas sugeridas para esses frascos
    select caixas_coletivas, caixas_individuais
    into v_col, v_ind
    from public.fn_sugerir_caixas(coalesce(v_frascos_5, 0), coalesce(v_frascos_20, 0));

    -- ----- debita caixas coletivas -----
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

    -- ----- debita caixas individuais -----
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
