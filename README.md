# 🧁 Cupcakes Gourmet

E-commerce de confeitaria artesanal — **Projeto Integrador Transdisciplinar em Engenharia de Software II**
(Cruzeiro do Sul Virtual). Estudante: **Kleber Renan Pacheco Ferreira Netto** · RGM 36746746.

Aplicação completa em três camadas: **front-end** mobile-first (HTML/CSS/JS), **back-end** Node.js/Express
no padrão **MVC** e banco de dados **MySQL 8**. Cobre as **18 histórias de usuário** do planejamento (SP1) e
possui **21 testes automatizados de integração**.

## Executar (3 minutos)

Pré-requisitos: **Node.js 18+** e **Docker** (ou um MySQL 8 já instalado — veja o Manual de Uso).

```bash
docker compose up -d db          # sobe o MySQL 8
cd backend
cp .env.example .env             # Windows: copy .env.example .env
npm install
npm start                        # cria tabelas + dados de demonstração na 1ª vez
```

Abra **http://localhost:3000**.

| Perfil | Acesso |
|---|---|
| Administrador | `admin@cupcakesgourmet.com.br` / `admin1234` (tela `/admin.html`) |
| Cliente | crie uma conta na tela de login |
| Cupom | `CUPCAKE10` (10% em pedidos a partir de R$ 20) |
| CEP na área / fora da área | `01310-100` / `20000-009` |

```bash
npm test             # 21 testes de integração (usa o banco cupcakes_gourmet_test)
npm run db:reset     # apaga e recria o banco (volta aos dados de demonstração)
```

## Estrutura

```
backend/
  server.js                 inicialização
  src/app.js                monta o Express (API + arquivos do front-end)
  src/routes/               endpoints REST
  src/controllers/          HTTP <-> regra de negócio
  src/services/             regras (checkout, frete, cupom, autenticação)
  src/models/               acesso às tabelas (SQL parametrizado)
  src/middlewares/          autenticação JWT, autorização, erros
  src/db/schema.sql         DDL do banco físico (13 tabelas, 3FN)
  src/db/pool.js            conexão MySQL e transações
  src/db/setup.js           cria banco/tabelas e insere dados de demonstração
  tests/api.test.js         testes de integração
frontend/                   telas, CSS (design system) e JS
docker/, docker-compose.yml, Dockerfile
docs/                       documentação (veja abaixo)
```

## Tecnologias e bibliotecas

| Biblioteca | Para que serve |
|---|---|
| `express` 5 | servidor HTTP e roteamento da API REST |
| `mysql2` | driver do MySQL (consultas parametrizadas, transações) |
| `bcryptjs` | hash das senhas |
| `jsonwebtoken` | sessão stateless (JWT) |
| `cors` | permite chamadas à API de outras origens |
| `node:test` (nativo do Node) | testes automatizados — sem biblioteca extra |
| Google Fonts (Fraunces, Karla) | tipografia do front-end (carregada pela internet; há fontes de reserva) |

O front-end não usa frameworks: é HTML/CSS/JavaScript puro.

## Documentação (`docs/`)

| Arquivo | Conteúdo |
|---|---|
| `Cupcakes_Gourmet_SP2_KleberRenan.docx` | Relatório técnico da SP2 (UX, banco físico, front-end, padrões de back-end, testes) |
| `Manual_de_Uso_Cupcakes_Gourmet.docx` | Instalação e guia do cliente e do administrador |
| `Registro_de_Revisao_e_Feedback.docx` | Melhoria contínua PI1 → SP1 → SP2 → SP3, feedback de colegas e checklist de entrega |
| `Laudo_de_Teste_TEMPLATE.docx` | Formulário para os 5 colegas testadores (SP3) |
| `Roteiros_dos_Videos.docx` | Roteiros dos vídeos da SP2 e da SP3 |
| `GIT.md` | Como publicar no GitHub e entregar o link ao tutor |
| `PUBLICACAO.md` | Como publicar o sistema na internet (Render + Aiven) para os testes da SP3 |
| `planejamento/` | Documentos de planejamento do PI1 e da SP1 |

## Limitações conhecidas

Pagamento, e-mail de recuperação de senha e cálculo de frete por CEP são **simulados**; não há envio de
fotos de produtos. Detalhes e justificativas no Manual de Uso (seção 8) e no Registro de Revisão.
