import { useState } from 'react';
import type { Task } from '../../api/types';
import type { CombinedStatus } from '../../api/queries';
import {
  useGeneratorStart,
  usePrepareStart,
  useResetAll,
  useRunnerStart,
  useRunnerStop,
} from '../../api/queries';
import type { DisplayMode } from '../../state/workflow/deriveDisplayMode';

interface Props {
  mode: DisplayMode;
  tasks: Task[];
  status: CombinedStatus | undefined;
  onGoToTerminal: (sub: 'generate' | 'prepare' | 'runner') => void;
  onGoToResults: () => void;
}

export function WorkflowPane({ mode, tasks, status, onGoToTerminal, onGoToResults }: Props) {
  const [nConfigs, setNConfigs] = useState(51);
  const [seed, setSeed] = useState('');

  const generatorStart = useGeneratorStart();
  const prepareStart = usePrepareStart();
  const runnerStart = useRunnerStart();
  const runnerStop = useRunnerStop();
  const resetAll = useResetAll();

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const abandonedTasks = tasks.filter((t) => t.status === 'abandoned').length;
  const pendingTasks = tasks.filter((t) => t.status === 'pending').length;

  function startGenerate(n: number) {
    const parsedSeed = seed.trim() ? Number.parseInt(seed, 10) : undefined;
    generatorStart.mutate({ nConfigs: n, seed: parsedSeed });
    onGoToTerminal('generate');
  }

  return (
    <div className="pane pane-workflow p-8 flex items-center justify-center">
      <div className="hero w-full max-w-2xl anim-fadeUp">
        {mode === 'idle' && (
          <>
            <div className="hero-icon bg-blue-600/20 mx-auto text-2xl">🧬</div>
            <h2 className="text-xl font-semibold mb-2">Gerar configurações</h2>
            <p className="text-gray-500 text-sm mb-6">
              Gera configurações PostgreSQL via Latin Hypercube Sampling, para os 3 tiers de hardware.
            </p>
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="text-left">
                <label className="text-xs text-gray-500 block mb-1">Configs por combinação</label>
                <input
                  type="number"
                  min={3}
                  max={501}
                  step={3}
                  value={nConfigs}
                  onChange={(e) => setNConfigs(Number(e.target.value))}
                  className="btn btn-ghost w-32"
                />
              </div>
              <div className="text-left">
                <label className="text-xs text-gray-500 block mb-1">Seed (opcional)</label>
                <input
                  type="text"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="aleatório"
                  className="btn btn-ghost w-32"
                />
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-6">
              {nConfigs} configs × 7 combinações = {nConfigs * 7} tarefas
            </p>
            <div className="flex items-center justify-center gap-3">
              <button className="btn btn-primary btn-lg" onClick={() => startGenerate(nConfigs)}>
                Gerar Configurações
              </button>
              <button className="btn btn-ghost" onClick={() => startGenerate(3)}>
                Validação Rápida
              </button>
            </div>
          </>
        )}

        {mode === 'generating' && (
          <>
            <div className="hero-icon bg-blue-600/20 mx-auto text-2xl anim-spin">⚙️</div>
            <h2 className="text-xl font-semibold mb-2">Gerando configurações...</h2>
            <p className="text-gray-500 text-sm mb-6">Acompanhe o progresso na aba Terminal.</p>
            <button className="btn btn-ghost" onClick={() => onGoToTerminal('generate')}>
              Ver Terminal
            </button>
          </>
        )}

        {mode === 'generated' && (
          <>
            <div className="hero-icon bg-emerald-600/20 mx-auto text-2xl">📦</div>
            <h2 className="text-xl font-semibold mb-2">Configurações geradas</h2>
            <p className="text-gray-500 text-sm mb-6">{totalTasks} tarefas criadas com Latin Hypercube Sampling.</p>
            <div className="flex items-center justify-center gap-3">
              <button className="btn btn-primary btn-lg" onClick={() => { prepareStart.mutate(false); onGoToTerminal('prepare'); }}>
                Preparar Imagens
              </button>
              <button className="btn btn-ghost" onClick={() => { prepareStart.mutate(true); onGoToTerminal('prepare'); }}>
                Reconstruir (force)
              </button>
            </div>
          </>
        )}

        {mode === 'preparing' && (
          <>
            <div className="hero-icon bg-blue-600/20 mx-auto text-2xl anim-spin">🐳</div>
            <h2 className="text-xl font-semibold mb-2">Construindo imagens Docker...</h2>
            <p className="text-gray-500 text-sm mb-6">Pode levar 30–90 minutos. Acompanhe no Terminal.</p>
            <button className="btn btn-ghost" onClick={() => onGoToTerminal('prepare')}>
              Ver Terminal
            </button>
          </>
        )}

        {mode === 'prepared' && (
          <>
            <div className="hero-icon bg-emerald-600/20 mx-auto text-2xl">✅</div>
            <h2 className="text-xl font-semibold mb-2">Imagens prontas</h2>
            <p className="text-gray-500 text-sm mb-6">
              {status?.images.ready ? 'Todas as imagens Docker estão disponíveis.' : 'Verificando imagens...'}
            </p>
            <button className="btn btn-primary btn-lg" onClick={() => runnerStart.mutate()}>
              Executar Benchmarks
            </button>
          </>
        )}

        {mode === 'running' && (
          <>
            <div className="hero-icon bg-amber-600/20 mx-auto text-2xl anim-spin">🏃</div>
            <h2 className="text-xl font-semibold mb-2">Executando benchmarks...</h2>
            <div className="prog my-4">
              <div className="prog-fill" style={{ width: totalTasks > 0 ? `${(doneTasks / totalTasks) * 100}%` : '0%' }} />
            </div>
            <p className="text-gray-500 text-sm mb-6">
              {doneTasks + abandonedTasks} de {totalTasks} concluídas · {pendingTasks} pendentes
            </p>
            <div className="flex items-center justify-center gap-3">
              <button className="btn btn-ghost" onClick={() => onGoToTerminal('runner')}>
                Ver Terminal
              </button>
              <button className="btn btn-red" onClick={() => runnerStop.mutate()}>
                Pausar
              </button>
            </div>
          </>
        )}

        {mode === 'ran' && (
          <>
            <div className="hero-icon bg-emerald-600/20 mx-auto text-2xl">🎉</div>
            <h2 className="text-xl font-semibold mb-2">Execução concluída</h2>
            <p className="text-gray-500 text-sm mb-6">
              {doneTasks} concluídas · {abandonedTasks} abandonadas de {totalTasks} tarefas
            </p>
            <div className="flex items-center justify-center gap-3 mb-6">
              <button className="btn btn-primary btn-lg" onClick={onGoToResults}>
                Ver Resultados
              </button>
            </div>
            <hr className="border-gray-800 my-4" />
            <div className="text-left max-w-xs mx-auto">
              <label className="text-xs text-gray-500 block mb-1">Nova rodada — seed (opcional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="aleatório"
                  className="btn btn-ghost flex-1"
                />
                <button className="btn btn-green" onClick={() => startGenerate(nConfigs)}>
                  Gerar Nova Rodada
                </button>
              </div>
            </div>
            <button
              className="btn btn-red btn-sm mt-6"
              onClick={() => {
                if (confirm('Isso apaga permanentemente a fila, resultados e logs. Continuar?')) {
                  resetAll.mutate();
                }
              }}
            >
              Reiniciar (apaga tudo)
            </button>
          </>
        )}
      </div>
    </div>
  );
}
