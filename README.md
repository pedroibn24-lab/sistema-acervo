# sistema-acervo

Aplicação web para gestão de um negócio de **decants de perfume** — do estoque à venda e ao envio. Frontend em React + Supabase (Postgres), com as regras de negócio garantidas no próprio banco de dados.

> 🚧 Em desenvolvimento — modelagem do banco concluída, frontend em construção.

## Funcionalidades

- Cadastro de frascos e fracionamento em decants
- Vendas com regras de negócio aplicadas no banco (triggers e constraints)
- Controle de estoque de insumos e sugestão de embalagem
- Pedidos por cliente, com status independentes de pagamento e envio
- Painel financeiro: faturamento e lucro por venda

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite |
| Estilo | Tailwind CSS v4 |
| Dados | TanStack Query · react-hook-form · zod |
| Backend | Supabase — Postgres, RLS, Auth, Storage, Edge Functions |

## Como rodar

Pré-requisitos: Node.js 20+ e um projeto Supabase (local ou na nuvem).

```bash
npm install
cp .env.example .env.local   # preencha com as credenciais do seu Supabase
npm run dev
```

O schema do banco está versionado em [`supabase/migrations/`](supabase/migrations/) e é aplicado com o [Supabase CLI](https://supabase.com/docs/guides/cli).

## Configuração

As variáveis de ambiente necessárias estão documentadas em [`.env.example`](.env.example). Copie o arquivo para `.env.local` e preencha com os valores do seu projeto.

## Estrutura

```
src/
  features/      # cada funcionalidade: components, hooks, api, schemas
  components/ui/ # componentes reutilizáveis
  lib/           # client Supabase e utilitários
  routes/        # telas
supabase/
  migrations/    # schema do banco (SQL versionado)
```
