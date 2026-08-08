// ─────────────────────────────────────────────────────────────────
// Estado global da aplicação
// ─────────────────────────────────────────────────────────────────

let _tasks = [], _filter = 'all', _cfgTier = 'all', _resTier = 'all';
let _resBenchmark = 'tpc_h';
let _runnerRunning = false, _generatorRunning = false, _prepareRunning = false;
let _stopRequested = false;

// Workflow step persistido em localStorage
// 'idle' | 'generated' | 'prepared' | 'ran'
let _step = localStorage.getItem('pga_step') || 'idle';

function _setStep(s) {
  const prev = _step;
  _step = s;
  localStorage.setItem('pga_step', s);
  if (prev !== s) {
    updateTabVisibility();
    renderWorkflowPane();
  }
}

// Número de queries esperado por benchmark
const _nQ = bm => (bm || _resBenchmark) === 'tpc_h' ? 20 : 98;
