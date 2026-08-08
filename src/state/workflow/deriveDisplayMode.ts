import type { WorkflowStep } from './workflowReducer';

export type DisplayMode = 'idle' | 'generating' | 'generated' | 'preparing' | 'prepared' | 'running' | 'ran';

export interface LiveProcessFlags {
  generatorRunning: boolean;
  prepareRunning: boolean;
  runnerRunning: boolean;
}

/**
 * Deriva o modo de exibicao do hero card (workflow) sobrepondo os booleanos
 * ao vivo de processo sobre o passo persistido — pura, sem estado proprio.
 * Prioridade: running > generating > preparing > (passo persistido).
 */
export function deriveDisplayMode(step: WorkflowStep, live: LiveProcessFlags): DisplayMode {
  if (live.runnerRunning) return 'running';
  if (live.generatorRunning) return 'generating';
  if (live.prepareRunning) return 'preparing';
  return step;
}
