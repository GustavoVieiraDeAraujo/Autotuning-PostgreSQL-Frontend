// ─────────────────────────────────────────────────────────────────
// Painel de resultados
// ─────────────────────────────────────────────────────────────────

let _currentResultData = null, _chart = null, _chartData = null, _selectedPath = null;

async function renderResultTaskList() {
  let files = [];
  try {
    const r = await fetch(`${API_BASE}/api/results/list`);
    if (r.ok) ({ files } = await r.json());
  } catch (_) {}
  const taskMap = {};
  _tasks.forEach(t => { taskMap[t.id] = t; });
  const vis = _resTier === 'all' ? files : files.filter(f => f.tier === _resTier);
  document.getElementById('res-count').textContent = `${vis.length} resultado(s)`;
  const list = document.getElementById('res-task-list');
  if (!vis.length) {
    list.innerHTML = `<div class="p-6 text-center text-gray-600 text-sm">Nenhum resultado.</div>`;
    return;
  }
  list.innerHTML = vis.map(f => {
    const id  = parseInt(f.name.replace('task_', '').replace('.json', ''));
    const t   = taskMap[id] || {}, res = t.result || {};
    const path = `${f.tier}/${f.combo}/${f.name}`;
    const sel  = _selectedPath === path;
    const tpchOk  = res.tpc_h_n_success  != null ? `${res.tpc_h_n_success}/20`  : '–';
    const tpcdsOk = res.tpc_ds_n_success != null ? `${res.tpc_ds_n_success}/98` : '–';
    const dur     = res.duration_s       != null ? fmtDur(res.duration_s)       : '–';
    return `<div class="task-card m-2 ${sel ? 'sel' : ''}" onclick="selectResultTask('${path}',this)">
      <div class="flex items-center justify-between mb-1.5">
        <div class="flex items-center gap-2">
          <span class="mono text-xs font-bold text-gray-400">#${id}</span>
          <span class="font-semibold text-xs ${tierCls(f.tier)}">${f.tier}</span>
          <span class="mono text-xs text-gray-600">${f.combo}</span>
        </div>
        <span class="badge badge-done">done</span>
      </div>
      <div class="flex items-center gap-3 text-xs text-gray-600">
        <span class="text-blue-400/70">H:${tpchOk}</span>
        <span class="text-violet-400/70">DS:${tpcdsOk}</span>
        <span>${dur}</span>
      </div>
    </div>`;
  }).join('');
}

function setResTier(t) {
  _resTier = t;
  ['all', 'low', 'medium', 'high'].forEach(x => {
    const b = document.getElementById('rt-' + x);
    if (b) b.className = 'btn btn-sm flex-1 justify-center ' + (x === t ? 'btn-active' : 'btn-ghost') + (x !== 'all' ? ' ' + tierCls(x) : '');
  });
  renderResultTaskList();
}

async function selectResultTask(path, el) {
  _selectedPath = path;
  document.querySelectorAll('.task-card').forEach(c => c.classList.remove('sel'));
  el.classList.add('sel');
  const [tier, combo, fn] = path.split('/');
  try {
    const r = await fetch(`${API_BASE}/api/results/${tier}/${combo}/${fn}`);
    if (r.ok) renderResult(await r.json());
  } catch (_) {}
}

function setResBenchmark(bm) {
  _resBenchmark = bm;
  ['tpc_h', 'tpc_ds'].forEach(b => {
    const btn = document.getElementById('rb-' + b);
    if (btn) btn.className = 'btn btn-sm ' + (b === bm ? 'btn-active' : 'btn-ghost');
  });
  if (_currentResultData) renderResult(_currentResultData);
}

function renderResult(data) {
  _currentResultData = data;
  let bm;
  if (data.tpc_h || data.tpc_ds) bm = data[_resBenchmark] || {};
  else bm = data.benchmark || {};
  const sum = bm.summary || {}, qs = bm.queries || [], nQ = _nQ(_resBenchmark);

  document.getElementById('res-title').textContent    = `Tarefa #${data.task_id} — ${data.tier} / ${data.combination}`;
  document.getElementById('res-subtitle').textContent = data.started_at
    ? `Executada em ${new Date(data.started_at).toLocaleString('pt-BR')}` : '';

  const badge = document.getElementById('res-status-badge');
  badge.className = `badge badge-${data.status}`;
  badge.textContent = data.status;

  const banner = document.getElementById('res-abandoned-banner');
  if (data.status === 'abandoned') {
    banner.classList.remove('hidden');
    const reasonLabels = {
      'timeout':        'Limite de tempo excedido — a configuração demorou mais do que o permitido para o tier (' + data.tier + ').',
      'invalid_config': 'Configuração inválida — o PostgreSQL rejeitou um ou mais parâmetros da configuração gerada.',
      'max_retries':    'Falha de infraestrutura — a tarefa falhou 3 vezes consecutivas (Docker, disco ou rede).',
    };
    document.getElementById('res-abandoned-reason').textContent =
      reasonLabels[data.abandoned_reason] || data.abandoned_reason || 'Razão não registrada.';
    document.getElementById('res-abandoned-error').textContent = data.error || '–';
  } else {
    banner.classList.add('hidden');
  }

  document.getElementById('r-geo').textContent    = sum.geo_mean_exec_ms       != null ? fmtMs(sum.geo_mean_exec_ms)        : '–';
  document.getElementById('r-cache').textContent  = sum.overall_cache_hit_ratio != null ? sum.overall_cache_hit_ratio + '%'  : '–';
  document.getElementById('r-spill').textContent  = sum.queries_with_spill      != null ? sum.queries_with_spill + '/' + nQ  : '–';
  document.getElementById('r-para').textContent   = sum.queries_with_parallelism!= null ? sum.queries_with_parallelism + '/' + nQ : '–';
  document.getElementById('r-total').textContent  = fmtMs(sum.total_exec_ms);
  document.getElementById('r-median').textContent = fmtMs(sum.median_exec_ms);
  document.getElementById('r-p95').textContent    = fmtMs(sum.p95_exec_ms);
  document.getElementById('r-max').textContent    = fmtMs(sum.max_exec_ms);
  document.getElementById('r-min').textContent    = fmtMs(sum.min_exec_ms);
  document.getElementById('r-std').textContent    = fmtMs(sum.stddev_exec_ms);
  document.getElementById('queries-summary').textContent = `${bm.n_success || 0}/${nQ} OK`;

  _chartData = { labels: qs.map(q => `Q${q.id}`), values: qs.map(q => q.exec_ms || 0), names: qs.map(q => q.name) };
  renderChart();

  document.getElementById('pg-config').innerHTML = Object.entries(data.pg_config || {}).map(([k, v]) =>
    `<div class="flex justify-between gap-4 py-0.5 border-b border-gray-800/40">
       <span class="text-blue-400">${k}</span><span class="text-gray-300">${v}</span>
     </div>`).join('');

  document.getElementById('query-tbody').innerHTML = qs.map(q => {
    const spill = (q.temp_written_blocks || 0) > 0
      ? `<span class="text-orange-400">${q.temp_written_blocks}</span>` : '–';
    return `<tr class="border-t border-gray-800/30">
      <td class="px-4 py-2 mono font-bold text-gray-500">Q${q.id}</td>
      <td class="px-4 py-2 text-gray-400">${q.name}</td>
      <td class="px-4 py-2 mono ${q.exec_ms > 60000 ? 'text-red-400 font-bold' : 'text-gray-200'}">${fmtMs(q.exec_ms)}</td>
      <td class="px-4 py-2 text-gray-500">${q.cache_hit_ratio != null ? q.cache_hit_ratio + '%' : '–'}</td>
      <td class="px-4 py-2 mono text-gray-600">${q.shared_read?.toLocaleString('pt-BR') || '–'}</td>
      <td class="px-4 py-2">${spill}</td>
      <td class="px-4 py-2 text-gray-600">${q.workers_launched ?? '–'}</td>
      <td class="px-4 py-2">${q.success ? '<span class="text-green-400">✓</span>' : '<span class="text-red-400">✗</span>'}</td>
    </tr>`;
  }).join('');

  // Métricas de hardware da tarefa
  const hwEl = document.getElementById('res-hw-summary');
  const hw   = data.hw_metrics && data.hw_metrics.summary ? data.hw_metrics.summary : null;
  if (hw && Object.keys(hw).length > 0) {
    hwEl.classList.remove('hidden');
    const f1 = v => v != null ? v.toFixed(1) : '–';
    document.getElementById('rhw-cpu-avg').textContent  = f1(hw.cpu_percent_avg) + '%';
    document.getElementById('rhw-cpu-max').textContent  = f1(hw.cpu_percent_max) + '%';
    document.getElementById('rhw-temp-avg').textContent = f1(hw.cpu_temp_tctl_c_avg) + ' °C';
    document.getElementById('rhw-temp-max').textContent = f1(hw.cpu_temp_tctl_c_max) + ' °C';
    document.getElementById('rhw-mem-avg').textContent  = f1(hw.mem_percent_avg) + '%';
    document.getElementById('rhw-mem-max').textContent  = f1(hw.mem_percent_max) + '%';
    document.getElementById('rhw-disk-r').textContent   = f1(hw.disk_read_mb_s_avg) + ' MB/s';
    document.getElementById('rhw-disk-w').textContent   = f1(hw.disk_write_mb_s_avg) + ' MB/s';
    document.getElementById('rhw-energy').textContent   =
      hw.rapl_energy_total_j != null ? (hw.rapl_energy_total_j / 1000).toFixed(2) + ' kJ' : '–';
    document.getElementById('rhw-power').textContent    =
      hw.rapl_avg_power_w != null ? hw.rapl_avg_power_w.toFixed(1) + ' W' : '–';
    document.getElementById('rhw-samples').textContent  = (hw.n_samples ?? '–') + ' amostras · ' + f1(hw.duration_s) + ' s';
  } else {
    hwEl.classList.add('hidden');
  }

  document.getElementById('result-body').classList.remove('hidden');
  document.getElementById('result-empty').classList.add('hidden');
}

function renderChart() {
  if (!_chartData) return;
  const useLog = document.getElementById('log-scale').checked;
  const colors = _chartData.values.map(v =>
    v > 600000 ? 'rgba(248,113,113,.85)' : v > 60000 ? 'rgba(251,191,36,.85)' : 'rgba(96,165,250,.85)');
  if (_chart) _chart.destroy();
  _chart = new Chart(document.getElementById('query-chart'), {
    type: 'bar',
    data: {
      labels: _chartData.labels,
      datasets: [{ data: _chartData.values, backgroundColor: colors, borderRadius: 4, borderSkipped: false }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1f2937', borderColor: '#374151', borderWidth: 1,
          callbacks: {
            title: ctx => `Q${ctx[0].dataIndex + 1} — ${_chartData.names[ctx[0].dataIndex]}`,
            label: ctx => ' ' + fmtMs(ctx.raw),
          },
        },
      },
      scales: {
        x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { color: '#1f2937' } },
        y: {
          type: useLog ? 'logarithmic' : 'linear',
          ticks: { color: '#6b7280', font: { size: 10 }, callback: v => fmtMs(v) },
          grid: { color: '#1f2937' },
        },
      },
    },
  });
}
