# Simulação de 5 testadores (personas)

> ⚠️ **Isto é uma simulação, não são colegas reais.** Serve como ensaio e para achar defeitos antes dos testes
> com pessoas. A Situação-Problema 3 continua exigindo **5 colegas de verdade** e laudos reais.

`sim.js` executa 5 sessões em um navegador Chromium real (Playwright) com dispositivos emulados e o verificador de
acessibilidade **axe-core** (WCAG 2.1 A/AA):

| Persona | Perfil | O que observa |
|---|---|---|
| P1 Ana | iPhone SE, comprando pela 1ª vez | fluxo de compra, botões cobertos, áreas de toque, fontes pequenas, rolagem horizontal |
| P2 Carlos | Android pequeno, rede lenta/instável | tempo de carregamento, queda de internet, clique duplo no checkout |
| P3 Marina | Desktop, só teclado | ordem do Tab, foco visível, acessibilidade (axe) em 7 telas |
| P4 Diego | Dev curioso | XSS, entradas inválidas, injeção de SQL, acesso a dados alheios, token forjado |
| P5 Júlia | Confeiteira (admin), tablet | painel de produtos e pedidos, cancelamento, alvos de toque |

## Resultados

- `resultado_1a_rodada_antes_das_correcoes.json` — 23 observações de problema (22 válidas + 1 alarme falso).
- `resultado_3a_rodada_final.json` — **0** problemas depois das correções (commits `3b3691b`, `9dd7d53`, `62e9ce5`).

A análise, as decisões e os commits estão em `docs/Registro_de_Revisao_e_Feedback.docx` (seções 3 e 4).

## Como repetir

```bash
# 1. sistema no ar (de preferência com banco limpo)
cd backend && npm install && npm run db:reset && npm start

# 2. em outro terminal
cd docs/simulacao
npm init -y && npm install playwright axe-core && npx playwright install chromium
BASE=http://localhost:3000 node sim.js      # grava resultado.json
```

Observação: o teste "token forjado" só é reprovado se o servidor usar o segredo JWT padrão; inicie com
`NODE_ENV=production JWT_SECRET=<chave longa> npm start` para simular uma publicação real.

## Execução do roteiro do Laudo de Teste (5 testadores × 13 tarefas)

`roteiro_laudo.js` segue **exatamente** as 13 tarefas do `Laudo_de_Teste_TEMPLATE.docx`, só pela interface
(toques/cliques e digitação), em 5 perfis de dispositivo (iPhone SE, Android grande, computador, tablet e Android
pequeno — todos **emulados**). Registra apenas: funcionou, falhou ou não testou. Sem opiniões.

- Resultado: `resultado_roteiro_laudo_5_testadores.json` — **65 de 65 tarefas funcionaram**, 0 erros técnicos.
- Registrado na seção 3.1 de `docs/Registro_de_Revisao_e_Feedback.docx`.
- Limites: roteiro conhecido e automatizado, ambiente local, aparelhos emulados. **Não substitui** os laudos de
  colegas reais.

```bash
BASE=http://localhost:3000 node roteiro_laudo.js   # grava resultado_roteiro_laudo.json (precisa de playwright)
```
