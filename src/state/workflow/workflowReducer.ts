export type WorkflowStep = 'idle' | 'generated' | 'prepared' | 'ran';

export interface WorkflowState {
  step: WorkflowStep;
}

export type WorkflowAction =
  | { type: 'TASKS_UPDATED'; hasTasks: boolean; hasDone: boolean }
  | { type: 'GENERATOR_FINISHED' }
  | { type: 'PREPARE_FINISHED' }
  | { type: 'PROMOTE_TO_PREPARED_IF_READY'; imagesReady: boolean; prepareRunning: boolean; hasTasks: boolean }
  | { type: 'SET_STEP'; step: WorkflowStep };

/**
 * Unica fonte de verdade pra transicao do passo persistido do workflow.
 *
 * Consolida as duas heuristicas ad-hoc do app vanilla original
 * (`inferStepFromTasks`, que so olhava o conteudo da fila, e a comparacao
 * prev/new dos booleanos de processo dentro de `fetchStatus`) num unico
 * reducer explicito: mais facil de raciocinar e testar isoladamente.
 */
export function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  switch (action.type) {
    case 'SET_STEP':
      return { step: action.step };

    case 'TASKS_UPDATED':
      if (!action.hasTasks) return { step: 'idle' };
      if (action.hasDone) return { step: 'ran' };
      if (state.step === 'idle') return { step: 'generated' };
      return state;

    case 'GENERATOR_FINISHED':
      return { step: 'generated' };

    case 'PREPARE_FINISHED':
      return state.step === 'generated' ? { step: 'prepared' } : state;

    // Cobre reload de pagina apos o prepare ja ter terminado sem essa app
    // ter visto a transicao rodando->parado (ex: prepare rodou e terminou
    // com a pagina fechada).
    case 'PROMOTE_TO_PREPARED_IF_READY':
      if (
        state.step === 'generated' &&
        !action.prepareRunning &&
        action.imagesReady &&
        action.hasTasks
      ) {
        return { step: 'prepared' };
      }
      return state;

    default:
      return state;
  }
}

const STORAGE_KEY = 'pga_step';

export function loadPersistedStep(): WorkflowStep {
  const s = localStorage.getItem(STORAGE_KEY);
  if (s === 'idle' || s === 'generated' || s === 'prepared' || s === 'ran') {
    return s;
  }
  return 'idle';
}

export function persistStep(step: WorkflowStep): void {
  localStorage.setItem(STORAGE_KEY, step);
}
