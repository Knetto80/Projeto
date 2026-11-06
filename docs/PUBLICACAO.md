# Publicar o sistema na internet (Situação-Problema 3)

Para que os 5 colegas testem, o sistema precisa estar em um **endereço público**. Esta é uma combinação **gratuita**
que funciona com o código do projeto:

- **Aiven** — banco **MySQL** gerenciado (o plano gratuito existe, é limitado e não pede cartão, segundo a
  documentação da Aiven consultada em novembro/2026).
- **Render** — hospedagem do servidor **Node.js** (o plano gratuito existe, mas não oferece MySQL gerenciado, por
  isso o banco fica na Aiven).

> ⚠️ Planos gratuitos mudam. Confira os limites vigentes nos painéis antes de começar. Uma alternativa é a
> **Railway**, que oferece MySQL próprio, mas os créditos gratuitos podem ser limitados — verifique no site.
> Eu não consegui executar a publicação por você: este roteiro segue a configuração do projeto, mas os cliques
> nos sites precisam ser feitos por você.

## Parte 1 — Banco MySQL na Aiven

1. Crie uma conta em **aiven.io**.
2. Crie um serviço **MySQL** e escolha o plano **Free**. Aguarde o status **Running**.
3. Na página do serviço, anote: **Host**, **Port**, **User**, **Password** e o nome do **Database** (normalmente `defaultdb`).

## Parte 2 — Código no GitHub

Siga `docs/GIT.md` e deixe o repositório publicado.

## Parte 3 — Servidor na Render

1. Em **render.com**, escolha **New → Web Service** e conecte o repositório do GitHub.
2. Configure:
   - **Runtime:** Node
   - **Build Command:** `cd backend && npm install`
   - **Start Command:** `cd backend && npm start`
   - **Instance Type:** Free
3. Em **Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `DB_HOST` | host da Aiven |
| `DB_PORT` | porta da Aiven |
| `DB_USER` | usuário da Aiven (ex.: `avnadmin`) |
| `DB_PASSWORD` | senha da Aiven |
| `DB_NAME` | `defaultdb` (ou o nome informado) |
| `DB_SSL` | `true` |
| `DB_SSL_REJECT_UNAUTHORIZED` | `false` |
| `JWT_SECRET` | uma frase longa e aleatória (**não** use a padrão) |
| `ADMIN_PASSWORD` | uma senha **sua** para o administrador (**não** deixe `admin1234` em site público) |
| `EMAIL_SIMULADO` | `true` (o link de recuperação aparece na tela; não há envio de e-mail) |

4. Clique em **Create Web Service**. Na primeira inicialização o sistema cria as tabelas e os dados de demonstração.
5. A Render mostrará o endereço, algo como `https://cupcakes-gourmet.onrender.com`.

## Parte 4 — Conferir antes de enviar aos colegas

- [ ] A página inicial abre e lista os 8 cupcakes.
- [ ] Criar conta, adicionar ao carrinho, finalizar um pedido de teste.
- [ ] Entrar em `/admin.html` com `admin@cupcakesgourmet.com.br` e **a senha que você definiu**.
- [ ] "Esqueci minha senha" mostra o link de demonstração.

## Cuidados

- **Primeiro acesso lento:** instâncias gratuitas podem "dormir" quando ficam sem uso e demorar a responder na
  primeira visita. Abra o endereço você mesmo uns minutos antes dos colegas testarem e avise-os.
- **Envie aos colegas apenas o endereço público e o e-mail/senha do administrador, se for preciso testar o painel.**
  Peça que **não usem senhas reais**.
- **Dados de teste:** depois dos testes, você pode apagar tudo no console SQL da Aiven e reiniciar o serviço, ou
  simplesmente excluir o serviço.
- **Segurança:** `DB_SSL_REJECT_UNAUTHORIZED=false` não valida o certificado do banco (aceitável para uma demonstração
  acadêmica). Em produção, forneça a CA em `DB_SSL_CA`.
