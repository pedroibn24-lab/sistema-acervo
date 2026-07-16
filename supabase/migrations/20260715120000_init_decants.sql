-- ============================================================================
-- sistema-acervo — schema inicial: gestão de decants de perfume
--
-- Grão das tabelas principais:
--   perfumes       1 linha = 1 FRASCO FÍSICO comprado (não é catálogo de marca).
--                  Comprou outro 100ml do mesmo perfume? É outra linha.
--   vendas_itens   1 linha = 1 decant OU 1 APC. É o livro-caixa: imutável em
--                  perfume/ml/tipo depois de criado.
--   sacolinhas     1 linha = 1 pedido acumulado de um cliente, aberto até o envio.
--
-- Regras de negócio que moram NO BANCO (não no frontend):
--   - Trava do APC ......... chk_trava_apc + fn_venda_item_before()
--   - Relação de frascos ... coluna gerada frasco_ml
--   - Caixas da sacolinha .. fn_sugerir_caixas()
--   - Estoque de frascos ... chk_estoque_nao_negativo + fn_venda_item_after()
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. Enums
-- ----------------------------------------------------------------------------
create type public.tipo_item_venda  as enum ('decant', 'apc');
create type public.status_pagamento as enum ('pendente', 'pago');
create type public.status_envio     as enum ('aguardando_envio', 'preparado', 'enviado');
create type public.tipo_insumo      as enum (
  'frasco_5ml', 'frasco_20ml',
  'caixa_individual', 'caixa_coletiva',
  'caixa_correio'
);


-- ----------------------------------------------------------------------------
-- 2. Funções puras de regra de negócio
--    Immutable e sem acesso a tabela: servem em coluna gerada, em view e como
--    RPC pro frontend fazer preview antes de gravar. Uma fonte de verdade só.
-- ----------------------------------------------------------------------------

-- REGRA DE RELAÇÃO DE FRASCOS: só existem frascos físicos de 5ml e 20ml.
--   3ml e 5ml  -> frasco de 5ml
--   10ml e 20ml -> frasco de 20ml
create or replace function public.fn_frasco_para_ml(p_ml integer)
returns integer
language sql
immutable
parallel safe
as $$
  select case when p_ml <= 5 then 5 else 20 end;
$$;


-- ----------------------------------------------------------------------------
-- 3. Tabelas
-- ----------------------------------------------------------------------------

create table public.perfumes (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null default auth.uid()
                        references auth.users(id) on delete cascade,

  nome                text not null,
  marca               text,
  volume_total_ml     integer not null,
  tamanho_apc_ml      integer not null,
  preco_custo_total   numeric(10,2) not null,
  valor_venda_por_ml  numeric(10,2) not null,
  -- Preço fechado do APC. Se null, o APC é cobrado por ml na venda.
  preco_apc           numeric(10,2),

  -- Contador materializado: é o que torna a checagem da trava O(1) e, junto com
  -- o lock de linha em fn_venda_item_before(), o que serializa vendas
  -- concorrentes. NUNCA escreva nele direto — quem mantém é o trigger.
  ml_vendidos_decants integer not null default 0,
  apc_vendido         boolean not null default false,

  area_decants_ml     integer generated always as (volume_total_ml - tamanho_apc_ml) stored,
  custo_por_ml        numeric(12,6) generated always as (preco_custo_total / volume_total_ml) stored,

  created_at          timestamptz not null default now(),

  constraint chk_nome_perfume       check (length(trim(nome)) > 0),
  constraint chk_volume_positivo    check (volume_total_ml > 0),
  constraint chk_apc_tamanho        check (tamanho_apc_ml in (30, 40)),
  constraint chk_apc_cabe_no_frasco check (tamanho_apc_ml < volume_total_ml),
  constraint chk_valores            check (preco_custo_total >= 0 and valor_venda_por_ml >= 0),

  -- ======================= REGRA DE OURO: TRAVA DO APC ======================
  -- A soma de ml vendidos em decants nunca passa da área de decants.
  -- Isto é o backstop no nível do storage: vale mesmo pra INSERT direto no SQL
  -- editor, pra service_role e pra qualquer trigger que alguém desabilite.
  constraint chk_trava_apc check (
    ml_vendidos_decants >= 0
    and ml_vendidos_decants <= volume_total_ml - tamanho_apc_ml
  )
);

comment on table public.perfumes is
  '1 linha = 1 frasco físico. Dois frascos do mesmo perfume = duas linhas.';
comment on column public.perfumes.ml_vendidos_decants is
  'Mantido só por trigger. Escrever à mão aqui corrompe a trava do APC.';


create table public.clientes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid()
               references auth.users(id) on delete cascade,
  nome       text not null,
  whatsapp   text not null,
  endereco   text,
  created_at timestamptz not null default now(),

  constraint chk_nome_cliente check (length(trim(nome)) > 0),
  constraint uq_whatsapp_por_owner unique (owner_id, whatsapp)
);


create table public.sacolinhas (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid()
                   references auth.users(id) on delete cascade,
  cliente_id     uuid not null references public.clientes(id) on delete restrict,

  status_envio   public.status_envio not null default 'aguardando_envio',
  valor_frete    numeric(10,2) not null default 0,
  codigo_rastreio text,
  enviado_em     timestamptz,
  created_at     timestamptz not null default now(),

  constraint chk_frete_nao_negativo check (valor_frete >= 0),
  -- enviado_em existe se e somente se o status é 'enviado'
  constraint chk_enviado_em check ((status_envio = 'enviado') = (enviado_em is not null))
);

-- O cliente só pode ter UMA sacolinha aberta por vez: é nela que os decants
-- vão se acumulando até o envio. Depois de enviada, a próxima compra abre outra.
create unique index uq_sacolinha_aberta_por_cliente
  on public.sacolinhas (cliente_id)
  where status_envio <> 'enviado';


create table public.estoque_insumos (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid()
                   references auth.users(id) on delete cascade,
  tipo           public.tipo_insumo not null,
  quantidade     integer not null default 0,
  custo_unitario numeric(10,2) not null default 0,

  constraint uq_insumo_por_owner unique (owner_id, tipo),
  -- Bloqueia venda sem frasco em estoque: o trigger debita, o check recusa o
  -- saldo negativo. Não precisa de "if quantidade > 0" em lugar nenhum.
  constraint chk_estoque_nao_negativo check (quantidade >= 0),
  constraint chk_custo_insumo check (custo_unitario >= 0)
);


create table public.vendas_itens (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid()
                 references auth.users(id) on delete cascade,
  sacolinha_id uuid not null references public.sacolinhas(id) on delete cascade,
  perfume_id   uuid not null references public.perfumes(id) on delete restrict,

  tipo         public.tipo_item_venda not null default 'decant',
  -- Decant: 3/5/10/20. APC: preenchido pelo trigger com o que sobrou do frasco.
  ml           integer,

  -- A regra de relação de frascos vira coluna gerada: o frontend LÊ, nunca
  -- calcula. APC não usa frasco novo (leva o original), por isso fica null.
  frasco_ml    integer generated always as (
                 case when tipo = 'decant' then public.fn_frasco_para_ml(ml) end
               ) stored,

  -- Snapshots carimbados pelo servidor no INSERT. Reprecificar o perfume amanhã
  -- não pode reescrever o lucro de uma venda de ontem.
  preco_venda           numeric(10,2),
  custo_por_ml_snapshot numeric(12,6),
  custo_frasco_snapshot numeric(10,2) not null default 0,

  custo_total numeric(12,4) generated always as (
                ml * custo_por_ml_snapshot + custo_frasco_snapshot
              ) stored,
  lucro       numeric(12,4) generated always as (
                preco_venda - (ml * custo_por_ml_snapshot + custo_frasco_snapshot)
              ) stored,

  status_pagamento_perfume public.status_pagamento not null default 'pendente',
  status_pagamento_frete   public.status_pagamento not null default 'pendente',

  created_at timestamptz not null default now(),

  constraint chk_fracao_valida check (
    (tipo = 'decant' and ml in (3, 5, 10, 20))
    or (tipo = 'apc' and ml > 0)
  ),
  constraint chk_preco_venda check (preco_venda >= 0)
);

-- "Apenas 1 pessoa pode comprar o APC por perfume", garantido pelo índice.
create unique index uq_apc_unico_por_perfume
  on public.vendas_itens (perfume_id)
  where tipo = 'apc';


-- ----------------------------------------------------------------------------
-- 4. Índices
--    Postgres NÃO indexa chave estrangeira sozinho, e toda coluna usada em
--    policy de RLS é avaliada linha a linha. Estes não são opcionais.
-- ----------------------------------------------------------------------------
create index idx_perfumes_owner        on public.perfumes (owner_id);
create index idx_clientes_owner        on public.clientes (owner_id);
create index idx_sacolinhas_owner      on public.sacolinhas (owner_id);
create index idx_sacolinhas_cliente    on public.sacolinhas (cliente_id);
create index idx_estoque_owner         on public.estoque_insumos (owner_id);
create index idx_vendas_itens_owner    on public.vendas_itens (owner_id);
create index idx_vendas_itens_sacolinha on public.vendas_itens (sacolinha_id);
create index idx_vendas_itens_perfume  on public.vendas_itens (perfume_id);


-- ============================================================================
-- 5. TRAVA DO APC — validação antes de gravar
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
  -- FOR UPDATE trava a linha do perfume até o fim da transação. É isto que
  -- impede duas vendas simultâneas de lerem o mesmo saldo e furarem o APC:
  -- a segunda fica bloqueada aqui e só relê depois que a primeira commitar.
  select * into v_perfume
  from public.perfumes
  where id = new.perfume_id
  for update;

  if not found then
    raise exception 'Perfume não encontrado ou sem permissão de acesso.'
      using errcode = 'P0001';
  end if;

  if v_perfume.apc_vendido then
    raise exception 'Perfume "%" está esgotado: o APC já foi vendido.', v_perfume.nome
      using errcode = 'P0001',
            hint = 'Este frasco acabou. Cadastre um novo frasco para seguir vendendo.';
  end if;

  -- Custo NUNCA vem do cliente: é sempre carimbado a partir do perfume.
  new.custo_por_ml_snapshot := v_perfume.custo_por_ml;

  v_ml_livres := v_perfume.area_decants_ml - v_perfume.ml_vendidos_decants;

  -- ---------------------------------------------------------------- APC -----
  if new.tipo = 'apc' then
    -- O APC leva o frasco original + TODOS os mls que sobraram.
    new.ml := v_perfume.volume_total_ml - v_perfume.ml_vendidos_decants;
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
  if new.ml > v_ml_livres then
    raise exception
      'TRAVA DO APC: "%" tem apenas %ml livres na área de decants. Vender %ml invadiria o APC de %ml.',
      v_perfume.nome, v_ml_livres, new.ml, v_perfume.tamanho_apc_ml
      using errcode = 'P0001',
            hint = 'Este frasco está reservado para a venda do APC.';
  end if;

  new.preco_venda := coalesce(new.preco_venda, new.ml * v_perfume.valor_venda_por_ml);

  -- Custo do frasco vazio, carimbado do estoque. (new.frasco_ml ainda é null
  -- aqui: coluna gerada só é calculada DEPOIS do trigger BEFORE.)
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


-- ============================================================================
-- 6. Efeitos colaterais — contador do perfume e baixa de frasco
-- ============================================================================
create or replace function public.fn_venda_item_after()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  -- NEW no INSERT, OLD no DELETE — decidido por TG_OP, sem coalesce de record
  -- (coalesce sobre linha inteira só é null com TODAS as colunas nulas: frágil).
  v_item   record;
  v_sinal  integer;
  v_insumo public.tipo_insumo;
begin
  if tg_op = 'INSERT' then
    v_item  := new;
    v_sinal := 1;   -- venda: soma no contador, debita frasco
  else
    v_item  := old;
    v_sinal := -1;  -- estorno: subtrai do contador, devolve frasco
  end if;

  if v_item.tipo = 'apc' then
    update public.perfumes
       set apc_vendido = (tg_op = 'INSERT')
     where id = v_item.perfume_id;
    return null;
  end if;

  -- O contador é atualizado aqui. Se algo escapou da validação do BEFORE,
  -- chk_trava_apc estoura neste UPDATE e a transação inteira volta atrás.
  update public.perfumes
     set ml_vendidos_decants = ml_vendidos_decants + (v_sinal * v_item.ml)
   where id = v_item.perfume_id;

  -- Baixa (ou devolução) do frasco vazio, pela regra de relação de frascos.
  v_insumo := case when v_item.frasco_ml = 5 then 'frasco_5ml'
                   else 'frasco_20ml' end::public.tipo_insumo;

  update public.estoque_insumos
     set quantidade = quantidade - v_sinal
   where owner_id = v_item.owner_id and tipo = v_insumo;

  if not found then
    raise exception 'Sem registro de estoque para "%". Cadastre o insumo antes de vender.', v_insumo
      using errcode = 'P0001';
  end if;

  return null;
end;
$$;


-- Item de venda é registro financeiro: não se edita o que já aconteceu.
-- Corrigir ml/perfume/tipo = apagar e recriar, para o estorno passar pelos
-- triggers e o estoque + contador voltarem certos.
create or replace function public.fn_venda_item_imutavel()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.perfume_id is distinct from old.perfume_id
     or new.ml is distinct from old.ml
     or new.tipo is distinct from old.tipo
     or new.custo_por_ml_snapshot is distinct from old.custo_por_ml_snapshot then
    raise exception 'Item de venda é imutável em perfume, ml, tipo e custo. Apague e recrie.'
      using errcode = 'P0001',
            hint = 'Editável: preço, status de pagamento e status de frete.';
  end if;
  return new;
end;
$$;


create trigger trg_venda_item_before
  before insert on public.vendas_itens
  for each row execute function public.fn_venda_item_before();

create trigger trg_venda_item_imutavel
  before update on public.vendas_itens
  for each row execute function public.fn_venda_item_imutavel();

create trigger trg_venda_item_after
  after insert or delete on public.vendas_itens
  for each row execute function public.fn_venda_item_after();


-- ============================================================================
-- 7. Sugestão de caixas para a sacolinha
--
-- A capacidade da caixa coletiva NÃO é uma soma linear de slots. Um 20ml na
-- caixa derruba a capacidade de 5ml. Combinações que cabem em UMA coletiva:
--     até 4x 5ml   |   2x 20ml   |   1x 20ml + 1x 5ml
-- (2x5ml + 1x20ml NÃO cabe, apesar de "dar 4 slots".)
--
-- Empacotamento (minimiza total de caixas; empate -> menos coletivas, que são
-- as caras). Verificado contra empacotador ótimo por força bruta em
-- scratchpad/pack_test.mjs para a e b até 12/6.
--   - 20ml pareiam de 2 em 2 numa coletiva (b/2 caixas).
--   - 5ml empacotam de 4 em 4; resto 2-3 fecha 1 coletiva, resto 1 vira individual.
--   - Um 20ml avulso decide entre ir sozinho (individual) ou puxar 1x 5ml
--     (coletiva mista) — o que gerar menos caixas.
-- ============================================================================
create or replace function public.fn_sugerir_caixas(p_frascos_5 integer, p_frascos_20 integer)
returns table (
  caixas_coletivas   integer,
  caixas_individuais integer
)
language plpgsql
immutable
parallel safe
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


-- ============================================================================
-- 8. Views de leitura
--    security_invoker = on é OBRIGATÓRIO: sem isso a view roda com os direitos
--    do dono e devolve dado de todo mundo, furando a RLS das tabelas abaixo.
-- ============================================================================

create or replace view public.vw_perfumes_saldo
with (security_invoker = on) as
select
  p.*,
  p.area_decants_ml - p.ml_vendidos_decants as ml_livres_decants,
  -- O que o comprador do APC leva hoje: frasco original + tudo que sobrou.
  p.volume_total_ml - p.ml_vendidos_decants as apc_ml_atual,
  case
    when p.apc_vendido then 'esgotado'
    -- Sobrar 1ml ou 2ml é o mesmo que estar travado: a menor fração é 3ml.
    when (p.area_decants_ml - p.ml_vendidos_decants) < 3 then 'travado_apc'
    else 'disponivel'
  end as situacao
from public.perfumes p;


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
  s.created_at
from public.sacolinhas s
join public.clientes c on c.id = s.cliente_id
left join itens i on i.sacolinha_id = s.id
left join lateral public.fn_sugerir_caixas(
  coalesce(i.frascos_5, 0),
  coalesce(i.frascos_20, 0)
) cx on true;


create or replace view public.vw_financeiro
with (security_invoker = on) as
select
  coalesce(sum(vi.preco_venda), 0)                                                  as faturamento_bruto,
  coalesce(sum(vi.preco_venda) filter (where vi.status_pagamento_perfume = 'pago'), 0) as faturamento_recebido,
  coalesce(sum(vi.preco_venda) filter (where vi.status_pagamento_perfume = 'pendente'), 0) as a_receber,
  coalesce(sum(vi.custo_total), 0)                                                  as custo_proporcional_total,
  coalesce(sum(vi.lucro), 0)                                                        as lucro_liquido,
  count(*) filter (where vi.tipo = 'decant')                                        as decants_vendidos,
  count(*) filter (where vi.tipo = 'apc')                                           as apcs_vendidos
from public.vendas_itens vi;


-- ============================================================================
-- 9. RLS — default deny em tudo, policy explícita por operação
-- ============================================================================
alter table public.perfumes        enable row level security;
alter table public.clientes        enable row level security;
alter table public.sacolinhas      enable row level security;
alter table public.estoque_insumos enable row level security;
alter table public.vendas_itens    enable row level security;

-- (select auth.uid()) e não auth.uid(): assim o planner avalia uma vez por
-- query (InitPlan) em vez de uma vez por linha.

create policy perfumes_select on public.perfumes for select
  using (owner_id = (select auth.uid()));
create policy perfumes_insert on public.perfumes for insert
  with check (owner_id = (select auth.uid()));
create policy perfumes_update on public.perfumes for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy perfumes_delete on public.perfumes for delete
  using (owner_id = (select auth.uid()));

create policy clientes_select on public.clientes for select
  using (owner_id = (select auth.uid()));
create policy clientes_insert on public.clientes for insert
  with check (owner_id = (select auth.uid()));
create policy clientes_update on public.clientes for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy clientes_delete on public.clientes for delete
  using (owner_id = (select auth.uid()));

create policy sacolinhas_select on public.sacolinhas for select
  using (owner_id = (select auth.uid()));
create policy sacolinhas_insert on public.sacolinhas for insert
  with check (owner_id = (select auth.uid()));
create policy sacolinhas_update on public.sacolinhas for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy sacolinhas_delete on public.sacolinhas for delete
  using (owner_id = (select auth.uid()));

create policy estoque_select on public.estoque_insumos for select
  using (owner_id = (select auth.uid()));
create policy estoque_insert on public.estoque_insumos for insert
  with check (owner_id = (select auth.uid()));
create policy estoque_update on public.estoque_insumos for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy estoque_delete on public.estoque_insumos for delete
  using (owner_id = (select auth.uid()));

create policy vendas_itens_select on public.vendas_itens for select
  using (owner_id = (select auth.uid()));
create policy vendas_itens_insert on public.vendas_itens for insert
  with check (owner_id = (select auth.uid()));
create policy vendas_itens_update on public.vendas_itens for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy vendas_itens_delete on public.vendas_itens for delete
  using (owner_id = (select auth.uid()));
