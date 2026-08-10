import { useEffect, useReducer, useRef } from 'react';
import type { Task } from '../../api/types';
import type { CombinedStatus } from '../../api/queries';
import { usePrepareStart } from '../../api/queries';
import { deriveDisplayMode } from './deriveDisplayMode';
import { loadPersistedStep, persistStep, workflowReducer, type WorkflowStep } from './workflowReducer';

export interface TerminalNavTarget {
  tab: 'terminal';
  sub: 'generate' | 'prepare' | 'runner';
}

/**
 * Fica no nivel de App (nao dentro de cada painel): o workflow precisa
 * reagir a fila/status independente da aba ativa no momento, igual ao
 * comportamento do app original (polling nunca gated pela aba visivel).
 */
export function useWorkflowState(
  tasks: Task[] | undefined,
  status: CombinedStatus | undefined,
  onAutoNavigate: (target: TerminalNavTarget) => void,
) {
  const [state, dispatch] = useReducer(workflowReducer, undefined, () => ({ step: loadPersistedStep() }));
  const prepareStart = usePrepareStart();
  const prevFlags = useRef<{ gen: boolean; prep: boolean; run: boolean } | null>(null);

  useEffect(() => {
    persistStep(state.step);
  }, [state.step]);

  // Reage ao conteudo da fila: equivalente a inferStepFromTasks().
  useEffect(() => {
    if (!tasks) return;
    dispatch({
      type: 'TASKS_UPDATED',
      hasTasks: tasks.length > 0,
      hasDone: tasks.some((t) => t.status === 'done'),
    });
  }, [tasks]);

  // Reage as transicoes dos 3 processos: equivalente ao bloco de comparacao
  // prev/new que existia dentro de fetchStatus() no app original.
  useEffect(() => {
    if (!status) return;
    const gen = status.generator.running;
    const prep = status.prepare.running;
    const run = status.runner.running;
    const hasTasks = (tasks?.length ?? 0) > 0;
    const prev = prevFlags.current;

    if (prev) {
      if (prev.gen && !gen && hasTasks) {
        dispatch({ type: 'GENERATOR_FINISHED' });
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        prepareStart.mutate(false);
        onAutoNavigate({ tab: 'terminal', sub: 'prepare' });
      }
      if (!prev.gen && gen) {
        onAutoNavigate({ tab: 'terminal', sub: 'generate' });
      }
      if (!prev.prep && prep) {
        onAutoNavigate({ tab: 'terminal', sub: 'prepare' });
      }
      if (prev.prep && !prep) {
        dispatch({ type: 'PREPARE_FINISHED' });
      }
      if (!prev.run && run) {
        onAutoNavigate({ tab: 'terminal', sub: 'runner' });
      }
    }

    dispatch({
      type: 'PROMOTE_TO_PREPARED_IF_READY',
      imagesReady: status.images.ready,
      prepareRunning: prep,
      hasTasks,
    });

    prevFlags.current = { gen, prep, run };
    // prepareStart e onAutoNavigate sao estaveis o suficiente pra esse
    // efeito de transicao: so nos importam os valores de status/tasks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const displayMode = deriveDisplayMode(state.step, {
    generatorRunning: status?.generator.running ?? false,
    prepareRunning: status?.prepare.running ?? false,
    runnerRunning: status?.runner.running ?? false,
  });

  return {
    step: state.step,
    displayMode,
    setStep: (step: WorkflowStep) => dispatch({ type: 'SET_STEP', step }),
  };
}
