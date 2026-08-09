# Autotuning PostgreSQL — Frontend

> **Status: TCC concluído, projeto arquivado.** Ver
> [`Autotuning-PostgreSQL-Pipeline`](../Autotuning-PostgreSQL-Pipeline) para
> o objetivo completo do projeto e os resultados finais do meta-modelo. O
> autor está migrando para um novo tema de TCC; este repositório fica
> mantido como referência funcional (builda limpo, verificado em
> 2026-08-09).

## Papel deste repositório

Interface web (React + TypeScript) pra acompanhar e controlar a coleta de
benchmark do projeto de autotuning PostgreSQL, consumindo a API do
repositório irmão [`Autotuning-PostgreSQL-Backend`](../Autotuning-PostgreSQL-Backend)
(Java + Spring Boot), que por sua vez orquestra o
[`Autotuning-PostgreSQL-Pipeline`](../Autotuning-PostgreSQL-Pipeline)
(Python).

6 abas, sempre montadas simultaneamente (visibilidade alternada só por
classe CSS, nunca desmontagem condicional) — pra não derrubar as 3 conexões
SSE de terminal nem recriar os gráficos de hardware ao trocar de aba:

- **Início** — máquina de estados do fluxo de trabalho (gerar → preparar
  imagens Docker → rodar fila de benchmarks → ver resultados), com
  transição automática entre etapas.
- **Fila** — tarefas de benchmark pendentes/rodando/concluídas, com
  filtro por tier e status.
- **Configurações** — todas as combinações de parâmetros PostgreSQL geradas
  por Latin Hypercube Sampling, com expansão de detalhe por linha.
- **Hardware** — métricas em tempo real (CPU%, temperatura por sensor,
  disco, rede) via polling de 1s, com gráficos de linha (janela de 30
  amostras) e grid de sensores usando IDs estáveis expostos pelo backend.
- **Terminal** — 3 streams de log em tempo real (gerador, preparo de
  imagens, runner), via Server-Sent Events + xterm.js.
- **Resultados** — lista de tarefas concluídas com detalhe (gráfico de
  barras das métricas TPC-H/TPC-DS, configuração usada, resumo de
  hardware).

## Stack

Vite + React 18 + TypeScript, Tailwind CSS v4, `@tanstack/react-query` para
polling (fila/status @3s, métricas de hardware @1s), `useReducer` para a
máquina de estados do fluxo de trabalho, `@xterm/xterm` para os terminais,
`react-chartjs-2` para os gráficos. Reescrita completa (2026-08) de uma
versão anterior em JavaScript puro — decisão de stack do autor, não
motivada por limitação técnica da versão anterior.

## Rodando localmente

Pré-requisitos: Node 22+, e o backend
([`Autotuning-PostgreSQL-Backend`](../Autotuning-PostgreSQL-Backend))
rodando em `http://localhost:8000` (configurável via `.env.development`,
variável `VITE_API_BASE`).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build de produção em dist/
```
