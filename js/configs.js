// ─────────────────────────────────────────────────────────────────
// Painel de configurações
// ─────────────────────────────────────────────────────────────────

function setCfgFilter(val) {
  _cfgTier = val;
  ['all', 'low', 'medium', 'high'].forEach(x => {
    const b = document.getElementById('cf-tier-' + x);
    if (b) b.className = 'btn btn-sm ' + (x === val ? 'btn-active' : 'btn-ghost') + (x !== 'all' ? ' ' + tierCls(x) : '');
  });
  renderConfigs();
}

function renderConfigs() {
  const combo  = document.getElementById('cf-combo').value;
  const search = (document.getElementById('cf-search').value || '').toLowerCase();
  let vis = _tasks;
  if (_cfgTier !== 'all') vis = vis.filter(t => t.tier === _cfgTier);
  if (combo !== 'all')    vis = vis.filter(t => t.combination === combo);
  if (search) vis = vis.filter(t => {
    const cfg = t.config || {};
    return Object.keys(cfg).some(k => k.includes(search) || String(cfg[k]).toLowerCase().includes(search));
  });
  document.getElementById('cf-count').textContent = `${vis.length} de ${_tasks.length}`;
  const tbody = document.getElementById('cfg-tbody');
  if (!vis.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-10 text-center text-gray-600">Nenhuma config.</td></tr>`;
    return;
  }
  tbody.innerHTML = vis.map(t => {
    const cfg = t.config || {};
    const detail = Object.entries(cfg).map(([k, v]) =>
      `<span class="inline-flex gap-1 px-2 py-0.5 rounded bg-gray-800 border border-gray-700 text-xs">
         <span class="text-blue-400">${k}</span><span class="text-gray-600">=</span><span class="text-gray-300">${v}</span>
       </span>`).join('');
    return `
      <tr class="cfg-row border-t border-gray-800/50" onclick="toggleCfgRow(${t.id})">
        <td class="px-4 py-2.5 text-gray-700 text-xs">
          <svg id="cfa-${t.id}" class="w-3 h-3 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
        </td>
        <td class="px-4 py-2.5 mono text-xs text-gray-500">${t.id}</td>
        <td class="px-4 py-2.5 font-semibold text-xs ${tierCls(t.tier)}">${t.tier}</td>
        <td class="px-4 py-2.5 mono text-xs text-gray-400">${t.combination}</td>
      </tr>
      <tr id="cfr-${t.id}" class="cfg-detail border-t border-gray-800/20">
        <td colspan="4" class="px-6 py-3 bg-gray-900/60"><div class="flex flex-wrap gap-1.5">${detail}</div></td>
      </tr>`;
  }).join('');
}

function toggleCfgRow(id) {
  document.getElementById('cfr-' + id).classList.toggle('open');
  const a = document.getElementById('cfa-' + id);
  if (a) a.style.transform = document.getElementById('cfr-' + id).classList.contains('open') ? 'rotate(90deg)' : '';
}
