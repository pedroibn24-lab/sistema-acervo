-- ============================================================================
-- Guarda o token do Melhor Envio (OAuth). Uma linha só (id = 1).
--
-- RLS habilitada e SEM policy de propósito: nem anon nem usuário logado acessam.
-- Só a Edge Function (service_role, que ignora RLS) lê/grava. O token fica 100%
-- no servidor, nunca chega ao navegador — é um segredo.
-- ============================================================================

create table public.melhor_envio_tokens (
  id            integer primary key default 1,
  access_token  text,
  refresh_token text,
  expires_at    timestamptz,
  updated_at    timestamptz not null default now(),
  constraint melhor_envio_singleton check (id = 1)
);

alter table public.melhor_envio_tokens enable row level security;
