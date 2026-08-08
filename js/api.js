// ─────────────────────────────────────────────────────────────────
// Controles de API e polling de status
// ─────────────────────────────────────────────────────────────────

async function fetchStatus() {
  const wasGen = _generatorRunning, wasRun = _runnerRunning, wasPrep = _prepareRunning;
  try {
    const [rg, rr, rp, ri] = await Promise.all([
      fetch(`${API_BASE}/api/generator/status`),
      fetch(`${API_BASE}/api/runner/status`),
      fetch(`${API_BASE}/api/prepare/status`),
      fetch(`${API_BASE}/api/images/status`),
    ]);
    if (!rg.ok || !rr.ok || !rp.ok) return;
    const { running: gR } = await rg.json();
    const { running: rR } = await rr.json();
    const { running: pR } = await rp.json();
    const imagesReady = ri.ok ? (await ri.json()).ready : false;
    _generatorRunning = gR; _runnerRunning = rR; _prepareRunning = pR;
    if (!rR) _stopRequested = false;

    // Transições de estado
    if (wasGen  && !gR && _tasks.length > 0) { _setStep('generated'); fetch(`${API_BASE}/api/prepare/start`, { method: 'POST' }).catch(() => {}); _clearTerm('prepare'); openTerminal('prepare'); }
    if (!wasPrep && pR)                       { _clearTerm('prepare'); openTerminal('prepare'); }
    if (wasPrep  && !pR && _step === 'generated') { _setStep('prepared'); }
    if (_step === 'generated' && !pR && imagesReady && _tasks.length > 0) { _setStep('prepared'); }
    if (!wasRun  && rR)                       { _clearTerm('runner'); openTerminal('runner'); }
    if (wasRun   && !rR && _tasks.some(t => t.status === 'done')) { _setStep('ran'); }

    updateTermPill(gR, rR, pR);

    if (!document.getElementById('pane-workflow').classList.contains('hidden')) renderWorkflowPane();
  } catch (_) {}
}

function updateGenPreview() {
  const el  = document.getElementById('gen-n-configs');
  const pre = document.getElementById('gen-preview');
  if (!el || !pre) return;
  const n = parseInt(el.value) || 50;
  pre.textContent = `${n} configs × 7 combinações = ${n * 7} tarefas`;
}

async function generatorStartValidation() {
  const el = document.getElementById('gen-n-configs');
  if (el) el.value = 3;
  updateGenPreview();
  await generatorStart(3);
}

async function generatorStart(nOverride) {
  try {
    const el     = document.getElementById('gen-n-configs');
    const elSeed = document.getElementById('gen-seed');
    const n      = nOverride !== undefined ? nOverride : (el ? (parseInt(el.value) || 51) : 51);
    const seed   = elSeed && elSeed.value.trim() !== '' ? parseInt(elSeed.value) : null;

    let url = `${API_BASE}/api/generator/start?n_configs=${n}`;
    if (seed !== null) url += `&seed=${seed}`;

    const r = await fetch(url, { method: 'POST' });
    const d = await r.json();
    if (d.error) { alert(d.error); return; }
    _generatorRunning = true;
    _clearTerm('generate'); openTerminal('generate');
    await new Promise(res => setTimeout(res, 300));
    await fetchQueue();
    await fetchStatus();
  } catch (e) { alert('Erro: ' + e); }
}

async function prepareStart(force = false) {
  try {
    const url = force ? `${API_BASE}/api/prepare/start?force=true` : `${API_BASE}/api/prepare/start`;
    const r   = await fetch(url, { method: 'POST' });
    const d   = await r.json();
    if (d.error) { alert(d.error); return; }
    _clearTerm('prepare'); openTerminal('prepare');
    await fetchStatus();
  } catch (e) { alert('Erro: ' + e); }
}

async function runnerStart() {
  try {
    const r = await fetch(`${API_BASE}/api/runner/start`, { method: 'POST' });
    const d = await r.json();
    if (d.error) { alert(d.error); return; }
    _clearTerm('runner'); openTerminal('runner');
    await fetchStatus();
  } catch (e) { alert('Erro: ' + e); }
}

async function resetAll() {
  if (_generatorRunning || _prepareRunning || _runnerRunning) {
    alert('Pare todos os processos antes de resetar.'); return;
  }
  if (!confirm('Isso irá apagar a fila, todos os resultados e logs.\n\nConfirmar reset completo?')) return;
  _showLoader('Reiniciando...');
  try {
    _setLoaderProgress(20, 'Removendo arquivos...');
    const r = await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
    if (!r.ok) { _hideLoader(); alert('Erro ao resetar (HTTP ' + r.status + '). Reinicie o servidor e tente novamente.'); return; }
    const d = await r.json();
    if (d.error) { _hideLoader(); alert(d.error); return; }
    _setLoaderProgress(60, 'Atualizando estado...');
    _tasks = []; _wfMode = '';
    localStorage.removeItem('pga_step'); _step = 'idle';
    updateTabVisibility(); renderWorkflowPane();
    _setLoaderProgress(85, 'Sincronizando...');
    await fetchQueue(); await fetchStatus();
    _setLoaderProgress(100, 'Pronto');
  } catch (e) { _hideLoader(); alert('Erro: ' + e); return; }
  _hideLoader();
}

async function stopActive() {
  _stopRequested = true;
  const endpoint = _generatorRunning ? `${API_BASE}/api/generator/stop`
    : _prepareRunning ? `${API_BASE}/api/prepare/stop`
    : `${API_BASE}/api/runner/stop`;
  try {
    const r = await fetch(endpoint, { method: 'POST' });
    const d = await r.json();
    if (d.error) { alert(d.error); _stopRequested = false; }
    await fetchStatus();
  } catch (e) { alert('Erro: ' + e); _stopRequested = false; }
}
