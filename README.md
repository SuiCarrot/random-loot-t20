# Random Loot T20

Gerador de tesouros aleatórios para **Tormenta20**, baseado na planilha oficial de geração de tesouros (Tabela 8-1 ampliada com *Ameaças de Arton*, *Deuses de Arton* e *Heróis de Arton*).

Ferramenta **não oficial**, para apoio de mestres e jogadores na mesa. Se não possuir o livro de um item rolado, use o próximo da lista.

## Funcionalidades

- Rolagem por **ND** (1–20) nas colunas **Dinheiro** e **Itens**
- Tipos de tesouro da criatura: **Padrão**, **Metade** (divide moedas) e **Dobro** (rola duas vezes cada coluna)
- Resolução automática das sub-tabelas: riquezas, itens diversos, equipamentos, poções, itens superiores, mágicos e acessórios mágicos
- Itens superiores com várias melhorias: sorteia **equipamento base** + melhorias na mesma categoria
- Múltiplas poções (`1d3`, `1d4+1`, etc.): sorteia quantidade e depois cada poção
- Valores de moedas e riquezas **rolados** (não só a fórmula)
- Interface em português com resumo legível e detalhes expansíveis (`<details>` + fórmulas/d%)

## Requisitos

- **Node.js 20+** (recomendado; testado com Node 24)
- npm

## Configuração

```bash
npm install
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento em [http://localhost:3000](http://localhost:3000) |
| `npm run build` | Build de produção |
| `npm run start` | Servidor após o build |
| `npm run import:data` | Regenera os JSON em `data/` a partir da planilha `.xlsx` |
| `npm run lint` | ESLint |

## Dados (planilha → JSON)

A planilha fonte fica na raiz do repositório:

`T20 - Tabela de geração de tesouros (1).xlsx`

Os arquivos em [`data/`](data/) são gerados por [`scripts/import-xlsx.ts`](scripts/import-xlsx.ts) e versionados no Git. Após editar a planilha:

```bash
npm run import:data
```

## Como usar na interface

1. Escolha o **ND** da criatura derrotada (1–20).
2. Selecione **Padrão**, **Metade** ou **Dobro** (conforme a ficha da criatura).
3. Clique em **Gerar tesouro**.

Na primeira vista você vê só o resultado (ex.: moedas, nome do item, `3 poções`). Use **Ver passos da rolagem** para abrir a árvore de sub-rolagens, ou **Fórmulas** / **Expandir rolagens e fórmulas** para ver d% e cálculos.

## Estrutura do projeto

```
app/              Páginas Next.js
components/       UI (formulário, trilha de rolagem, shadcn)
data/             Tabelas em JSON (geradas pelo import)
lib/              Motor de rolagem (dice, roll-treasure, types)
scripts/          import-xlsx.ts
```

## Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Dados estáticos em JSON (sem banco de dados)

## Créditos

Tabelas e regras © Jambô Editora / Tormenta20. Este projeto é um utilitário fan-made sem afiliação oficial.
