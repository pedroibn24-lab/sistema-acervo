-- ============================================================================
-- Segurança: fixa o search_path das duas funções puras que ficaram sem ele
-- (aviso "Function Search Path Mutable" do linter do Supabase).
--
-- São funções de cálculo, sem acesso a tabela — então search_path = '' não muda
-- nada no resultado, só fecha a brecha. Recriadas idênticas, com o set adicionado.
-- ============================================================================

create or replace function public.fn_frasco_para_ml(p_ml integer)
returns integer
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case when p_ml <= 5 then 5 else 20 end;
$$;


create or replace function public.fn_sugerir_caixas(p_frascos_5 integer, p_frascos_20 integer)
returns table (
  caixas_coletivas   integer,
  caixas_individuais integer
)
language plpgsql
immutable
parallel safe
set search_path = ''
as $$
declare
  a       integer := coalesce(p_frascos_5, 0);   -- decants em frasco de 5ml
  b       integer := coalesce(p_frascos_20, 0);  -- decants em frasco de 20ml
  doubles integer := coalesce(p_frascos_20, 0) / 2;
  r20     integer := coalesce(p_frascos_20, 0) % 2;
  q integer; r integer;
  coll_i integer; ind_i integer;   -- 20ml avulso sozinho numa individual
  coll_m integer; ind_m integer;   -- 20ml avulso + 1x5ml numa coletiva mista
  col integer := 0; ind integer := 0;
begin
  if a = 0 and b = 0 then
    return query select 0, 0;
    return;
  end if;

  if r20 = 0 then
    -- sem 20ml avulso: só empacotar os 5ml (de 4 em 4)
    q := a / 4; r := a % 4;
    col := doubles + q + case when r >= 2 then 1 else 0 end;
    ind := case when r = 1 then 1 else 0 end;

  elsif a = 0 then
    -- só o 20ml avulso sobrou
    col := doubles;
    ind := 1;

  else
    -- 20ml avulso + a decants de 5ml: escolher a opção com menos caixas
    q := a / 4; r := a % 4;                          -- opção individual
    coll_i := q + case when r >= 2 then 1 else 0 end;
    ind_i  := 1 + case when r = 1 then 1 else 0 end;

    q := (a - 1) / 4; r := (a - 1) % 4;              -- opção mista (consome 1x5ml)
    coll_m := 1 + q + case when r >= 2 then 1 else 0 end;
    ind_m  := case when r = 1 then 1 else 0 end;

    if (coll_m + ind_m) < (coll_i + ind_i)
       or ((coll_m + ind_m) = (coll_i + ind_i) and coll_m < coll_i) then
      col := doubles + coll_m; ind := ind_m;
    else
      col := doubles + coll_i; ind := ind_i;
    end if;
  end if;

  return query select col, ind;
end;
$$;
