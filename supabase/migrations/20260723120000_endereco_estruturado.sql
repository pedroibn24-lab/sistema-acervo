-- ============================================================================
-- Endereço estruturado do cliente: troca o campo único `endereco` (texto livre)
-- por campos separados, pra permitir etiqueta de correio e preenchimento por CEP.
--
-- Banco já limpo, então dá pra remover o `endereco` sem perder dados.
-- Todos os campos são opcionais (nem todo cliente terá endereço completo).
-- ============================================================================

alter table public.clientes drop column if exists endereco;

alter table public.clientes
  add column if not exists cep         text,
  add column if not exists rua         text,
  add column if not exists numero      text,
  add column if not exists complemento text,
  add column if not exists bairro      text,
  add column if not exists cidade      text,
  add column if not exists estado      text;

-- UF tem no máximo 2 letras (ex.: SP, RJ). Nulo é permitido (endereço opcional).
alter table public.clientes
  add constraint chk_uf check (estado is null or char_length(estado) <= 2);
