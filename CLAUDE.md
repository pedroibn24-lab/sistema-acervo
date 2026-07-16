# sistema-acervo

Sistema web de gestão de decants de perfume. Frontend React (Vite) + Supabase (Postgres, Auth, Storage, Edge Functions).

## Estado atual

Scaffold Vite + React 19 vazio. Não existe ainda: Supabase configurado, router, camada de dados, design system.
Já existe: a migration inicial do banco em `supabase/migrations/`.
As regras abaixo definem o alvo — ao implementar cada parte, siga-as desde o primeiro commit.

## Comandos

```bash
npm run dev      # dev server
npm run build    # build de produção
npm run lint     # eslint
```

## Stack definida

Não introduza alternativas sem me perguntar antes.

| Camada | Escolha |
|---|---|
| Linguagem | JavaScript (ESM). **Sem TypeScript — decisão fechada, não proponha migração.** Tipagem por JSDoc nos limites (ver *JavaScript*). |
| UI | React 19 + Vite |
| Rotas | react-router |
| Estado de servidor | TanStack Query |
| Estado de UI | `useState`/`useReducer` + Context. Sem Redux/Zustand sem justificativa. |
| Formulários | react-hook-form + zod |
| Estilo | Tailwind v4 com tokens em CSS variables |
| Backend | Supabase (Postgres + RLS, Auth, Storage, Edge Functions) |

## Comunicação e trabalho

**Com quem você fala.** Estou aprendendo — sou estagiário, não desenvolvedor sênior. Não presuma que eu já conheço os termos.

- Ao usar um termo técnico (RLS, trigger, migration, índice, JWT, container/Docker...), explique em **uma linha** o que é na primeira vez que ele aparecer. Jargão sem explicação me perde.
- Prefira frase curta, analogia e exemplo concreto. Um conceito de cada vez.
- Quando precisar de uma decisão minha, apresente as opções em português simples e **recomende uma** — não me entregue o trade-off cru pra eu resolver sozinho.
- Não existe pergunta boba. Se eu perguntar algo básico, responda direto, sem me tratar como se eu devesse já saber.
- Cheque se eu acompanhei antes de empilhar o próximo passo.

- Responda em **português (PT-BR)**. Código, identificadores, commits e comentários em **inglês**.
- Antes de mudança grande (mexer na arquitetura ou em mais de ~3 arquivos): mostre o plano em português simples e espere eu aprovar.
- Faça o que foi pedido, nada além. Sem refatoração oportunista, sem "já que estou aqui".
- Nunca invente schema, tabela ou coluna. Se não souber a estrutura do banco, leia as migrations ou pergunte.
- Ao terminar, teste o que mudou de verdade (abrir a tela, rodar a query). Só passar no lint não é teste.
- Se algo falhar, diga que falhou e mostre o erro. Não venda sucesso parcial como sucesso.

## Segurança — regras invioláveis

Estas não têm exceção. Se uma tarefa parecer exigir quebrar uma delas, pare e me avise.
(Termos como "chave", "RLS" e "trigger" estão explicados na primeira vez que aparecem, mais abaixo.)

**Chaves e segredos** — chave = uma senha longa que dá acesso ao banco.

- Tudo que começa com `VITE_` **vai junto pro navegador** (fica visível pra qualquer usuário). Só a URL do projeto e a `anon key` (a chave pública) podem ficar aí.
- A `service_role` key é a chave de administrador: nunca aparece no frontend, em `VITE_*`, em log, em teste ou em commit. Só em Edge Function/servidor.
- A `anon key` não é segredo — ela sozinha não protege nada. **Quem protege é a RLS** (explicada abaixo).
- `.env.local` e `.env*` ficam fora do git. Sem exceção.

**RLS (Row Level Security)** — regra no banco que decide, linha por linha, quem pode ver/mexer em cada registro. É o que garante que um usuário só acesse os próprios dados.

- RLS **habilitada em toda tabela** do schema `public`, inclusive tabelas auxiliares. Tabela nova sem regra = tabela inacessível, e é assim que deve ser.
- Postura *default deny* (nega por padrão): a regra concede acesso, nunca só restringe.
- Uma regra separada por operação (`select`, `insert`, `update`, `delete`). Nada de `for all`.
- Dono sempre por `auth.uid()` (o ID do usuário logado) dentro da regra. **Nunca** confie em `user_id` vindo do navegador — use `default auth.uid()` na coluna e `with check (user_id = auth.uid())`.
- Papel/permissão do usuário vive em tabela própria (`user_roles`) ou em `app_metadata`. **Nunca em `user_metadata`** — o próprio usuário consegue editar seu `user_metadata` pelo navegador, então papel guardado ali é brecha de segurança de graça.
- Checagem de papel dentro de regra vai por função `security definer` com `set search_path = ''` (detalhe técnico que evita um tipo de ataque; se precisar, eu explico na hora).
- Toda coluna usada em regra de RLS precisa de índice (índice = atalho que o banco usa pra achar linhas rápido), porque a RLS roda linha a linha.

**Servidor**

- Qualquer operação sensível (papéis, pagamentos, dados de terceiros) vai para Edge Function (código que roda no servidor do Supabase, não no navegador) que confere quem está chamando. Nunca resolva isso no navegador.
- Quem decide se pode ou não é o banco/servidor. Esconder um botão na tela é aparência, não segurança.
- Validação em três camadas: zod no navegador, checagem na Edge Function, constraint/regra no Postgres. As três, sempre.
- Rate limiting (limite de chamadas por tempo) em toda Edge Function pública.

**Storage (arquivos: fotos, etc.)**

- Buckets (pastas de arquivos) privados por padrão. Acesso por signed URL (link temporário que expira).
- Regra de storage por pasta (`(storage.foldername(name))[1] = auth.uid()::text`).
- No upload: confira o tipo e o tamanho real do arquivo no servidor, não pela extensão do nome. Nunca sirva arquivo enviado por usuário do mesmo endereço do app.

**Frontend (a tela no navegador)**

- `dangerouslySetInnerHTML` proibido (é a porta de entrada mais comum pra código malicioso). Se for inevitável, sanitize e me explique o porquê.
- Nada de senha, token ou dado pessoal em `console.log` ou em mensagem de erro na tela.
- Erro pro usuário é genérico ("algo deu errado"); o detalhe vai pro log do servidor.
- A sessão do login é gerenciada pelo SDK do Supabase. Não mexa no token na mão.

## Banco de dados

- Toda mudança no banco é uma **migration**: um arquivo de SQL versionado em `supabase/migrations/`. **Nunca** mude o banco pelo painel do site — o que não está em migration não existe.
- Migration já aplicada em produção não se edita; corrige-se com uma migration nova.
- Tipos gerados: `supabase gen types typescript > src/types/database.d.ts`. Regenere após **cada** migration — se o banco e o código saem de sincronia, vira bug em produção.
- `snake_case` no Postgres (`valor_venda`), `camelCase` no JavaScript (`valorVenda`).
- FK (chave estrangeira = ligação de uma tabela pra outra) sempre com `on delete` explícito. Datas em `timestamptz`, nunca `timestamp`.
- Registro de acervo não some: use *delete lógico* (marcar `deleted_at`) em vez de apagar de verdade.
- `select('col_a, col_b')` com as colunas que precisa. `select('*')` (traz tudo) só quando justificado.
- Toda listagem com paginação (`range()`). Nenhuma query sem limite.
- Nada de N+1 (buscar em loop, uma query por item): use o join/embed do Supabase.

## Arquitetura

Organização por feature (funcionalidade), não por tipo de arquivo:

```
src/
  features/<feature>/    # components, hooks, api, schemas daquela funcionalidade
  components/ui/         # peças reutilizáveis (Button, Dialog, Input)
  lib/supabase.js        # o client do Supabase, um só (singleton)
  lib/                   # utilitários compartilhados
  routes/                # definição das rotas/telas
  types/database.d.ts    # gerado pelo Supabase (só tipos, nunca vai pro navegador)
```

- Um client Supabase só, exportado de `lib/supabase.js`. Nunca crie outro.
- Componente de tela **não** chama `supabase` direto. Vai por um hook da feature (ex: `useVendas`) que embrulha a query num lugar só.
- Uma feature não importa de dentro de outra feature. O que for comum sobe pra `components/ui` ou `lib`.

## JavaScript

Sem TypeScript por decisão do projeto. O que o TypeScript pegaria de graça vira responsabilidade nossa — então estas regras não são opcionais.

- `jsconfig.json` com `checkJs: true`: faz o editor conferir os tipos por JSDoc e apontar erro na hora. Não é build, não vai pro navegador.
- O client Supabase carrega os tipos gerados por JSDoc — é isso que dá autocompletar de tabela/coluna e erro no editor quando o schema muda:
  ```js
  /** @type {import('@supabase/supabase-js').SupabaseClient<import('../types/database').Database>} */
  export const supabase = createClient(url, anonKey)
  ```
- JSDoc (comentário que descreve tipos) onde paga: client Supabase, hooks de dados, utilitários e props de componente reutilizável. **Não** em toda tela nem em callback local — vira ruído.
- **zod é o contrato de runtime** (valida os dados quando o app roda). Schema pra todo formulário e toda resposta de Edge Function. Faça `parse` na entrada, não valide depois de já ter usado o dado.
- PropTypes foi removido no React 19. Não use — tipagem de props é JSDoc.
- Nome de tabela/coluna é texto solto aqui: um erro de digitação em `.from()` só aparece na cara do usuário. Por isso nenhuma query fica na tela — toda `.from()` vive no hook da feature, num lugar só.

## React

- Só componentes de função.
- Dado que vem do servidor é responsabilidade do TanStack Query — nunca `useEffect` + `useState` pra buscar dados.
- `useEffect` só pra sincronizar com algo externo. Valor derivado se calcula na hora de renderizar.
- Todo dado que vem do servidor trata os quatro estados: **carregando, vazio, erro, sucesso**. Nenhum é opcional.
- Error boundary (tela de fallback quando algo quebra) por rota.
- Key de lista é um ID estável. Nunca o índice (a posição na lista).
- Depois de gravar algo (mutação), invalide a query relacionada pra a tela atualizar.
- Componente passando de ~150 linhas ou com mais de uma responsabilidade: quebre em partes.

## Design

O padrão é "isso parece um produto pago", não só "isso funciona".

- **Tokens, sempre.** Cor, espaçamento, arredondamento, sombra, fonte vêm de variáveis CSS. Nada de valor solto no componente.
- Espaçamento na escala de 4px. Tamanhos de fonte numa escala definida — nada aleatório.
- Contraste mínimo **WCAG AA (4.5:1)** em texto (garante que dá pra ler). Cor nunca é a única forma de passar uma informação.
- Foco visível em tudo que é clicável. Navegável só pelo teclado. HTML semântico antes de ARIA; `<div onClick>` não é botão.
- Modo claro e escuro desde o início, os dois por tokens.
- Mobile-first. Testado em 360px de largura (celular pequeno).
- Carregando é *skeleton* (esqueleto cinza com a forma do conteúdo), não spinner girando no meio da tela.
- Tela vazia explica o que é aquilo e oferece a próxima ação. Nunca só "Nenhum resultado".
- Erro diz o que aconteceu e como tentar de novo.
- Animação entre 150–250ms, suave. Respeite `prefers-reduced-motion` (usuário que pediu menos animação).
- Sem "pulo" de layout: reserve o espaço de imagem e conteúdo que carrega depois.
- Toda ação destrutiva (apagar) tem confirmação e, quando dá, desfazer.

## Domínio — gestão de decants de perfume

Operação de decantação: compro frascos de perfume, fraciono em decants (frascos menores), vendo e envio.
Schema em `supabase/migrations/`. Grão: **1 linha na tabela `perfumes` = 1 frasco físico** (comprar outro 100ml do mesmo perfume é outra linha).

**Vocabulário** — use estes termos no código, sem traduzir e sem inventar sinônimo:

- **APC** (Apresentação Completa): a venda do frasco original + todo o restante de ml de uma vez. 30ml ou 40ml reservados por frasco. Um APC por perfume, um comprador só.
- **Área de decants**: `volume_total_ml - tamanho_apc_ml`. É o único saldo que pode ser vendido em frações.
- **Trava do APC**: quando a área de decants acaba, a venda fracionada é bloqueada e o frasco fica esperando o comprador do APC.
- **Sacolinha**: pedido aberto de um cliente, acumulando decants até enviar tudo junto. Um cliente tem no máximo uma sacolinha aberta.
- **Relação de frascos**: só existem frascos físicos de 5ml e 20ml. 3ml e 5ml → frasco de 5ml; 10ml e 20ml → frasco de 20ml.

**Regras que vivem no banco.** Não reimplemente nenhuma no frontend — a tela lê o resultado, não recalcula:

- Frações de decant: 3, 5, 10, 20ml. Nada mais.
- Relação de frascos: é a coluna gerada `vendas_itens.frasco_ml`.
- Trava do APC: `chk_trava_apc` + a função `fn_venda_item_before()`. Na tela dá pra avisar o usuário, mas quem decide de verdade é o banco.
- Custo e preço são "carimbados" pelo banco na hora da venda (`custo_por_ml_snapshot`). Reajustar o perfume depois não reescreve venda antiga.
- `vendas_itens` não se edita em perfume, ml, tipo e custo (é registro financeiro). Corrigir = apagar e recriar.
- `perfumes.ml_vendidos_decants` só é escrito por trigger (código que o banco roda sozinho a cada venda). Nunca faça `update` nessa coluna.
- **Caixa coletiva**: a capacidade **não** é soma linear. Cabe: até `4×5ml`; ou `2×20ml`; ou `1×20ml + 1×5ml`. Um 20ml na caixa derruba a capacidade de 5ml pra no máximo 1 (`2×5ml + 1×20ml` não cabe). Regra em `fn_sugerir_caixas`.

**Leitura vai por view** (consulta pronta no banco), não por conta no frontend: `vw_perfumes_saldo` (saldo e situação de cada frasco), `vw_sacolinhas_resumo` (itens + caixas sugeridas), `vw_financeiro` (faturamento e lucro).
Toda view nova precisa de `with (security_invoker = on)` — sem isso ela ignora a RLS e mostra dado de todo mundo.

**Pendências em aberto (decidir com o usuário antes de implementar):**
- Quando debitar as caixas do estoque (frascos já são debitados automático; caixas só têm sugestão por enquanto).
- `endereco` do cliente está como texto livre. Se for gerar etiqueta de correio, separar em CEP/rua/número/cidade/UF.
