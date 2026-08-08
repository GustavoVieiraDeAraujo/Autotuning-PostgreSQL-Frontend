// ─────────────────────────────────────────────────────────────────
// Fila de tarefas
// ─────────────────────────────────────────────────────────────────

async function fetchQueue() {
  try {
    const r = await fetch(`${API_BASE}/api/queue`);
    if (!r.ok) return;
    const data = await r.json();
    _tasks = Array.isArray(data) ? data : [];
    if (!Array.isArray(data)) { inferStepFromTasks(); updateTabVisibility(); renderWorkflowPane(); return; }
    renderQueue();
    populateCombos();
    inferStepFromTasks();
    updateTabVisibility();
    if (!document.getElementById('pane-workflow').classList.contains('hidden')) renderWorkflowPane();
  } catch (_) {}
  const u = document.getElementById('hdr-updated');
  if (u) u.textContent = new Date().toLocaleTimeString('pt-BR');
}

function inferStepFromTasks() {
  if (_tasks.length === 0) {
    if (_step !== 'idle') _setStep('idle');
  } else if (_tasks.some(t => t.status === 'done')) {
    if (_step !== 'ran') _setStep('ran');
  } else if (_step === 'idle') {
    _setStep('generated');
  }
}

function renderQueue() {
  const cnt = { pending: 0, running: 0, done: 0, abandoned: 0 };
  _tasks.forEach(t => cnt[t.status] !== undefined && cnt[t.status]++);
  animateVal('c-pending',   cnt.pending);
  animateVal('c-running',   cnt.running);
  animateVal('c-done',      cnt.done);
  animateVal('c-abandoned', cnt.abandoned);

  const total = _tasks.length;
  const pct   = total > 0 ? (cnt.done / total * 100).toFixed(1) : 0;
  document.getElementById('prog-bar').style.width = pct + '%';
  document.getElementById('prog-label').textContent = `${cnt.done} de ${total} (${pct}%)`;

  const vis   = _filter === 'all' ? _tasks : _tasks.filter(t => t.status === _filter);
  const tbody = document.getElementById('task-tbody');
  if (!vis.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="py-3 text-center text-gray-600">Nenhuma tarefa.</td></tr>`;
    return;
  }

  const _ABANDONED_LABELS = {
    invalid_config: 'Configuração inválida',
    timeout:        'Limite de tempo excedido',
    max_retries:    'Falha de infra (3 tentativas)',
  };

  tbody.innerHTML = vis.map(t => {
    const res    = t.result || {};
    const tpchOk  = res.tpc_h_n_success  != null ? `${res.tpc_h_n_success}/20`  : '–';
    const tpchMs  = res.tpc_h_total_ms   != null ? fmtMs(res.tpc_h_total_ms)   : '–';
    const tpcdsOk = res.tpc_ds_n_success != null ? `${res.tpc_ds_n_success}/98` : '–';
    const tpcdsMs = res.tpc_ds_total_ms  != null ? fmtMs(res.tpc_ds_total_ms)  : '–';
    const dur     = res.duration_s       != null ? fmtDur(res.duration_s)       : '–';
    const retryTip = t.retry_count > 0 ? ` title="${t.retry_count} tentativa(s) anteriores"` : '';
    const abandonedReason = t.abandoned_reason ? _ABANDONED_LABELS[t.abandoned_reason] || t.abandoned_reason : '';
    const statusCell = t.status === 'abandoned' && abandonedReason
      ? `<span class="badge badge-abandoned" title="${abandonedReason}">${t.status} · ${abandonedReason}</span>`
      : `<span class="badge badge-${t.status}"${retryTip}>${t.status}${t.retry_count > 0 ? ` (${t.retry_count}×)` : ''}</span>`;
    return `<tr class="${t.status === 'running' ? 'row-running' : ''}">
      <td class="px-4 py-2.5 text-gray-600 mono text-xs">${t.id}</td>
      <td class="px-4 py-2.5 font-semibold text-xs ${tierCls(t.tier)}">${t.tier}</td>
      <td class="px-4 py-2.5 text-gray-400 mono text-xs">${t.combination}</td>
      <td class="px-4 py-2.5">${statusCell}</td>
      <td class="px-4 py-2.5 text-blue-300 mono text-xs">${tpchOk}</td>
      <td class="px-4 py-2.5 text-blue-300 mono text-xs">${tpchMs}</td>
      <td class="px-4 py-2.5 text-violet-300 mono text-xs">${tpcdsOk}</td>
      <td class="px-4 py-2.5 text-violet-300 mono text-xs">${tpcdsMs}</td>
      <td class="px-4 py-2.5 text-gray-500 text-xs">${dur}</td>
    </tr>`;
  }).join('');
}

function setFilter(f) {
  _filter = f;
  ['all', 'pending', 'running', 'done', 'abandoned'].forEach(x => {
    const b = document.getElementById('f-' + x);
    if (b) b.className = 'btn btn-sm ' + (x === f ? 'btn-active' : 'btn-ghost');
  });
  renderQueue();
}

function populateCombos() {
  const combos = [...new Set(_tasks.map(t => t.combination))].sort();
  const sel = document.getElementById('cf-combo');
  const cur = sel.value;
  sel.innerHTML = '<option value="all">Todas as combinações</option>';
  combos.forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c;
    if (c === cur) o.selected = true;
    sel.appendChild(o);
  });
}
