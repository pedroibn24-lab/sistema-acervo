# sistema-acervo

Sistema web para **gestão de decants de perfume**: cadastro de frascos, fracionamento em decants, controle de estoque e caixas, vendas e envios (sacolinhas) e financeiro (faturamento e lucro).

> 🚧 **Em desenvolvimento.** O banco de dados já está modelado (migrations); o frontend está sendo construído.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite |
| Linguagem | JavaScript (ESM) |
| Estilo | Tailwind CSS v4 |
| Dados do servidor | TanStack Query |
| Formulários | react-hook-form + zod |
| Backend | Supabase (Postgres + RLS, Auth, Storage, Edge Functions) |

## Pré-requisitos

- **Node.js** 20+ e npm
- **Docker Desktop** — necessário para rodar o Supabase local (uma cópia de teste do banco na sua máquina)
- **Supabase CLI** — sobe e gerencia esse Supabase local

## Rodando o frontend

```bash
npm install      # instala as dependências (só na primeira vez)
npm run dev      # sobe o servidor de desenvolvimento
npm run build    # gera o build de produção
npm run lint     # checagem de código (eslint)
```

O `npm run dev` mostra no terminal o endereço local (algo como `http://localhost:5173`).

## Banco de dados (Supabase local)

O schema do banco vive em **migrations** — arquivos SQL versionados em [`supabase/migrations/`](supabase/migrations/). Para subir uma cópia local:

```bash
supabase start      # sobe o Supabase local (precisa do Docker rodando)
supabase db reset   # apaga e recria o banco do zero, aplicando as migrations
```

- `supabase start` imprime as URLs e chaves **locais** (uso só de desenvolvimento).
- `supabase db reset` é o comando de teste: recria tudo limpo em segundos.
- **Nunca** altere o banco pelo painel do site — toda mudança é uma migration nova. O que não está em migration não existe.

Para aplicar as migrations no projeto real (nuvem):

```bash
supabase link       # conecta ao projeto na nuvem (só uma vez)
supabase db push    # envia as migrations para o banco real
```

## Variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto (ele **não** vai para o git):

```
VITE_SUPABASE_URL=<URL do seu projeto Supabase>
VITE_SUPABASE_ANON_KEY=<chave anon (pública) do seu projeto>
```

> Só a URL e a chave **anon** (pública) entram aqui. A chave `service_role` (de administrador) **nunca** vai para o frontend nem para um `.env` de cliente — ela é usada apenas em Edge Functions / servidor.

## Estrutura do projeto

Organização por **feature** (funcionalidade), não por tipo de arquivo:

```
src/
  features/<feature>/   # cada funcionalidade: components, hooks, api, schemas
  components/ui/         # peças reutilizáveis (Button, Dialog, Input)
  lib/supabase.js        # client único do Supabase (singleton)
  lib/                   # utilitários compartilhados
  routes/                # telas / rotas
  types/                 # tipos gerados do banco
supabase/
  migrations/            # schema do banco (SQL versionado)
```

## Domínio (resumo)

- Cada linha da tabela `perfumes` é **um frasco físico** comprado.
- **APC** (Apresentação Completa): venda do frasco original + todo o restante de ml de uma vez (30ml ou 40ml reservados por frasco).
- **Trava do APC**: quando o saldo fracionável acaba, o sistema bloqueia a venda de decants e o frasco fica reservado para o comprador do APC. Regra garantida no banco.
- **Sacolinha**: pedido de um cliente que acumula decants ao longo do tempo até enviar tudo junto.

As regras de negócio completas (trava do APC, relação de frascos, capacidade das caixas) estão implementadas nas migrations em [`supabase/migrations/`](supabase/migrations/).
