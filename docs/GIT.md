# Git: publicar o projeto e entregar o link ao tutor

O repositório já vem com o histórico de commits organizado (`git log --oneline`). Falta apenas enviá-lo ao GitHub.

## 1. Configure sua identidade (uma vez)

```bash
git config --global user.name  "Kleber Renan Pacheco Ferreira Netto"
git config --global user.email "seu-email-do-github@exemplo.com"
```

Os commits iniciais foram criados com um e-mail provisório. Para que o GitHub os associe à **sua** conta,
reescreva o autor (apenas uma vez, antes do primeiro `push`):

```bash
git rebase --root --exec "git commit --amend --no-edit --reset-author"
```

## 2. Crie o repositório no GitHub

1. Entre em github.com → **New repository**.
2. Nome sugerido: `cupcakes-gourmet`. **Não** marque "Add a README" (o projeto já tem um).
3. Escolha **Public** (mais simples para o tutor ver) ou **Private** e adicione o tutor em
   *Settings → Collaborators*.

## 3. Envie o código

```bash
git remote add origin https://github.com/SEU-USUARIO/cupcakes-gourmet.git
git branch -M main
git push -u origin main
git push --tags
```

## 4. Adicione os PDFs de planejamento

Copie os PDFs do PI1 e da SP1 para `docs/planejamento/` (veja o `LEIAME.md` da pasta) e faça um commit.

## 5. Entregue o link

Envie ao tutor o endereço `https://github.com/SEU-USUARIO/cupcakes-gourmet`.

## Rotina na Situação-Problema 3

Cada mudança decorrente de um laudo vira **um commit** com mensagem clara. Isso prova, no histórico, o que foi
alterado e por quê:

```bash
git add -A
git commit -m "fix: ajusta mensagem de CEP fora da área (laudo do colega X)"
git push
```

Prefixos usados no projeto: `feat` (novidade), `fix` (correção), `docs` (documentação), `test` (testes), `chore` (infraestrutura).
