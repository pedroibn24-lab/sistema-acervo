-- ============================================================================
-- Enviar sacolinha: ao marcar uma sacolinha como 'enviado', debita as caixas
-- sugeridas do estoque, tudo na mesma transação (ou vai tudo, ou nada).
--
-- - As caixas sugeridas saem da mesma conta que a tela mostra (fn_sugerir_caixas
--   sobre os frascos da sacolinha), então o que debita bate com o que aparece.
-- - Se faltar caixa no estoque, o envio é BLOQUEADO com mensagem clara (mesma
--   postura dos frascos: não envia sem ter a caixa).
-- - Preenche enviado_em (a constraint chk_enviado_em exige quando status='enviado').
--
-- Gatilho BEFORE UPDATE: só age na transição para 'enviado'.
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

drop trigger if exists trg_sacolinha_enviar on public.sacolinhas;

create trigger trg_sacolinha_enviar
  before update on public.sacolinhas
  for each row
  execute function public.fn_sacolinha_enviar();
