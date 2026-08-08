// ─────────────────────────────────────────────────────────────────
// Gerenciamento de abas
// ─────────────────────────────────────────────────────────────────

const _ALL_TABS = ['workflow', 'queue', 'configs', 'results', 'hardware', 'terminal'];

function showTab(name) {
  _ALL_TABS.forEach(t => {
    const pane = document.getElementById('pane-' + t);
    if (pane) pane.classList.toggle('hidden', t !== name);
    const btn = document.getElementById('tab-' + t);
    if (btn) btn.classList.toggle('active', t === name);
  });
  if (name === 'configs')  renderConfigs();
  if (name === 'results')  renderResultTaskList();
  if (name === 'hardware') { initHwCharts(); fetchHwMetrics(); }
  if (name === 'terminal') { initTerminals(); setTimeout(() => refitTerminals(), 50); }
}

function updateTabVisibility() {
  const hasQueue   = _tasks.length > 0;
  const hasResults = _tasks.some(t => t.status === 'done');
  const setHidden  = (id, hide) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (hide !== el.classList.contains('hidden')) el.classList.toggle('hidden', hide);
  };
  setHidden('tab-queue',   !hasQueue);
  setHidden('tab-configs', !hasQueue);
  setHidden('tab-results', !hasResults);
}
