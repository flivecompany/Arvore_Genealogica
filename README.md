# Árvore Genealógica · Flive

Sistema web para **gerenciamento de árvores genealógicas** da **Flive Company**.
Cadastre membros da família, visualize um **organograma interativo** com fotos e
conexões claras (pais, filhos, cônjuges e irmãos), pesquise parentes e preserve a
história familiar com segurança.

É um **módulo do ecossistema "Controle Flive"**: reaproveita a mesma stack
(Vite + React + Supabase + Vercel) e identidade visual, com schema próprio
(prefixo `genea_`) que convive com os demais módulos no mesmo projeto Supabase.

## Stack

- **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Organograma:** [family-chart](https://github.com/donatso/family-chart) (D3) — MIT
- **Dados/Auth/Storage:** Supabase (PostgreSQL + RLS + Auth + Storage)
- **Estado servidor:** TanStack Query · **Tema:** next-themes (claro/escuro)
- **PDF/Imagem:** jsPDF + html2canvas · **Interoperabilidade:** export GEDCOM 5.5.1
- **Deploy:** Vercel

## Por que esta stack (pesquisa de mercado)

As principais referências open source — **Webtrees** (PHP), **Gramps Web** (Python),
**GeneWeb** (OCaml) — são robustas, porém em stacks diferentes da Flive e pesadas
para hospedar. Para a visualização adotamos a biblioteca **family-chart** (D3, MIT),
a melhor opção React-friendly para organogramas familiares (cônjuges, pais/filhos,
zoom/pan, cartões com foto). O modelo de dados segue o padrão **GEDCOM** (com
exportação compatível), mas é relacional no Postgres para busca e RLS eficientes.

## Funcionalidades

- **Autenticação** (login, cadastro, recuperação de senha) e **papéis por árvore**
  (Administrador / Editor / Visualizador).
- **Organograma interativo**: cartões com foto, nome, datas e ícone de sexo;
  linhas conectando pais, filhos, cônjuges e irmãos; zoom, navegação e foco.
- **Cadastro completo**: nome, foto, sexo, nascimento/falecimento (data e local),
  pais, cônjuges, biografia, profissão, observações, redes sociais e galeria/anexos.
- **Busca inteligente**: nome, sobrenome, cidade, ano de nascimento, sexo, situação
  e **grau de parentesco** calculado.
- **Destaque visual** de ancestrais e descendentes a partir de uma pessoa.
- **Dashboard** com estatísticas (pessoas, gerações, uniões, sobrenomes, década de
  nascimento, fotos/documentos).
- **Administração**: gestão de membros/permissões e **log de auditoria**.
- **Compartilhamento** por link seguro (somente leitura) e **exportação** em
  PDF / PNG de alta resolução, além de **GEDCOM**.
- **Modo claro/escuro** e design responsivo.

## Rotas

| Rota                    | Descrição                                  |
| ----------------------- | ------------------------------------------ |
| `/`                     | Landing page                               |
| `/auth`                 | Login / cadastro / recuperação de senha    |
| `/arvore`               | Organograma interativo (principal)         |
| `/pessoas`              | Lista + busca avançada                     |
| `/dashboard`            | Painel de estatísticas                     |
| `/admin`                | Membros, permissões e auditoria (admin)    |
| `/compartilhar/:token`  | Visualização pública (somente leitura)     |

## Configuração local

```bash
npm install
cp .env.example .env   # preencha com URL e chave do Supabase
npm run dev            # http://localhost:8080
```

### Variáveis de ambiente (.env)

```
VITE_SUPABASE_URL="https://<REF>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon/publishable key>"
```

## Banco de dados (Supabase)

O schema deste módulo está em
[`supabase/migrations/`](supabase/migrations/) (`0001_init.sql` + `0002_harden_security.sql`).
Já aplicado no projeto Supabase **`Projetos_claude`** (ref `gkwynykxejjjabpfpflt`).
Para reaplicar em outro projeto:

```bash
# via CLI (projeto linkado)
supabase db push
# ou cole o conteúdo dos .sql no SQL Editor do projeto, na ordem
```

`0001` cria as tabelas `genea_*`, políticas **RLS**, **triggers de auditoria**,
funções (criação de árvore, estatísticas, leitura pública por token) e o bucket de
**storage** privado `genea-media`. `0002` faz a **blindagem de privilégios** das
funções (recomendada pelos advisors do Supabase).

### Segurança

- Senhas com hash seguro e sessões gerenciadas pelo **Supabase Auth**.
- **RLS** em todas as tabelas: cada pessoa só acessa as árvores das quais é membro.
- Compartilhamento público apenas via função `SECURITY DEFINER` com token revogável.
- Proteção nativa contra SQL Injection (queries parametrizadas) e armazenamento
  privado de mídia com URLs assinadas temporárias.

## Deploy na Vercel

`vercel.json` já configurado (framework Vite, SPA rewrites). Defina as variáveis
`VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no painel e faça o deploy.

## Identidade visual

Cores e logo centralizados em `src/index.css` (variáveis CSS) e
`src/assets/logo-flive.svg`. Paleta Flive: azul `#1498d5` + laranja `#fd4817`.
