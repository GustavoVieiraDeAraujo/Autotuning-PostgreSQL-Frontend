// ─────────────────────────────────────────────────────────────────
// Monitoramento de hardware em tempo real
// ─────────────────────────────────────────────────────────────────

let _hwChartCpu = null, _hwChartTemp = null;
const _HW_MAX = 30, _hwLbls = [], _hwCpuD = [], _hwTmpD = [];
let _hwTempBuilt = false, _hwInterval = null;

const _hwTStr = v => v != null ? v.toFixed(1) + ' °C' : '–';
const _hwPStr = v => v != null ? v.toFixed(1) + '%'   : '–';
const _hwMStr = v => v != null ? v.toFixed(2) + ' MB/s' : '–';
const _hwCol  = (v, mid, hi) => v == null ? undefined : v >= hi ? '#f87171' : v >= mid ? '#fbbf24' : '#34d399';

function initHwCharts() {
  if (_hwChartCpu) return;
  const opts = (unit, yExtra) => ({
    responsive: true,
    animation: { duration: 200 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1f2937', borderColor: '#374151', borderWidth: 1,
        callbacks: { label: ctx => ' ' + (ctx.raw != null ? ctx.raw.toFixed(1) : '–') + ' ' + unit },
      },
    },
    scales: {
      x: { ticks: { color: '#4b5563', font: { size: 10 }, maxTicksLimit: 6 }, grid: { color: '#1f2937' } },
      y: { ...yExtra, ticks: { color: '#6b7280', font: { size: 10 }, callback: v => parseFloat(v).toFixed(1) + ' ' + unit }, grid: { color: '#1f2937' } },
    },
  });
  _hwChartCpu  = new Chart(document.getElementById('hw-chart-cpu'),  {
    type: 'line',
    data: { labels: _hwLbls, datasets: [{ data: _hwCpuD, borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,.1)', borderWidth: 2, pointRadius: 0, fill: true, tension: .3 }] },
    options: opts('%', { min: 0, max: 100 }),
  });
  _hwChartTemp = new Chart(document.getElementById('hw-chart-temp'), {
    type: 'line',
    data: { labels: _hwLbls, datasets: [{ data: _hwTmpD, borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,.08)', borderWidth: 2, pointRadius: 0, fill: true, tension: .3 }] },
    options: opts('°C', {}),
  });
}

// Nomes mnemônicos dos sensores
const _SENSOR_LABELS = {
  cpu_package:  { label: 'CPU (Pacote)',   desc: 'Temperatura geral do processador',       cls: 'text-red-400'    },
  cpu_core:     { label: 'CPU Core',       desc: 'Núcleo individual do processador',       cls: 'text-red-300'    },
  cpu_die_amd:  { label: 'CPU Die',        desc: 'Dado de silício AMD (CCD)',              cls: 'text-red-300'    },
  nvme:         { label: 'SSD NVMe',       desc: 'Temperatura Armazenamento',              cls: 'text-yellow-300' },
  gpu_edge:     { label: 'GPU (Borda)',     desc: 'Temperatura da borda do chip gráfico',  cls: 'text-purple-300' },
  gpu_junction: { label: 'GPU (Junção)',    desc: 'Ponto mais quente da GPU',              cls: 'text-purple-400' },
  gpu_mem:      { label: 'GPU (Memória)',   desc: 'Temperatura da VRAM',                   cls: 'text-purple-200' },
  ram_dimm:     { label: 'RAM DIMM',       desc: 'Temperatura do módulo de memória DDR5', cls: 'text-cyan-300'   },
  acpitz:       { label: 'Placa-mãe',      desc: 'Zona térmica ACPI do chipset',          cls: 'text-blue-300'   },
  wifi:         { label: 'Adaptador WiFi', desc: 'Temperatura do chip de rede sem fio',   cls: 'text-green-300'  },
};

function _buildTempGrid(m) {
  const cards = [];
  const add = (key, label, val, desc) => {
    if (val != null) {
      const s = _SENSOR_LABELS[key] || {};
      cards.push({ label: label || s.label, val, cls: s.cls || 'text-gray-300', desc: desc || s.desc || '' });
    }
  };

  const isIntel = m.cpu_temp_sensor === 'coretemp';
  (m.cpu_temp_cores_c || []).forEach((v, i) =>
    add('cpu_core', isIntel ? `CPU Core ${i}` : `CPU Die ${i + 1}`, v,
        isIntel ? `Núcleo ${i} do Processador` : `CCD ${i + 1} do Processador`)
  );
  (m.nvme_temps_c || []).forEach((v, i) =>
    add('nvme', (m.nvme_temps_c.length > 1) ? `SSD NVMe ${i + 1}` : 'SSD NVMe', v)
  );
  add('gpu_edge',     null, m.gpu_edge_c);
  add('gpu_junction', null, m.gpu_junction_c);
  add('gpu_mem',      null, m.gpu_mem_c);
  (m.ram_temps_c || []).forEach((v, i) =>
    add('ram_dimm', (m.ram_temps_c.length > 1) ? `RAM DIMM ${i + 1}` : 'RAM DIMM', v)
  );

  if (!cards.length) return;
  document.getElementById('hw-temp-grid').innerHTML = cards.map(c =>
    `<div class="card p-4 flex flex-col items-center justify-center text-center min-h-[90px]" title="${c.desc}">
       <div class="text-xs text-gray-500 mb-1 font-medium">${c.label}</div>
       <div id="hwt-${c.label.replace(/[\s\/\(\)]+/g, '-').toLowerCase()}" class="text-xl font-bold mono ${c.cls}">${_hwTStr(c.val)}</div>
       <div class="text-xs text-gray-600 mt-1 leading-tight">${c.desc}</div>
     </div>`).join('');
  document.getElementById('hw-temp-section').classList.remove('hidden');
  _hwTempBuilt = true;
}

function _updTempGrid(m) {
  const upd = (label, val) => {
    const el = document.getElementById('hwt-' + label.replace(/[\s\/\(\)]+/g, '-').toLowerCase());
    if (el) el.textContent = _hwTStr(val);
  };
  const isIntel = m.cpu_temp_sensor === 'coretemp';
  (m.cpu_temp_cores_c || []).forEach((v, i) => upd(isIntel ? `CPU Core ${i}` : `CPU Die ${i + 1}`, v));
  (m.nvme_temps_c     || []).forEach((v, i) => upd((m.nvme_temps_c.length > 1) ? `SSD NVMe ${i + 1}` : 'SSD NVMe', v));
  upd('GPU (Borda)',   m.gpu_edge_c);
  upd('GPU (Junção)',  m.gpu_junction_c);
  upd('GPU (Memória)', m.gpu_mem_c);
  (m.ram_temps_c || []).forEach((v, i) => upd((m.ram_temps_c.length > 1) ? `RAM DIMM ${i + 1}` : 'RAM DIMM', v));
}

function _setHw(id, text, color) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  if (color) el.style.color = color;
}

function renderHwMetrics(m) {
  const dot = document.getElementById('hw-dot');
  if (dot) { dot.className = 'w-2 h-2 rounded-full bg-green-400 flex-shrink-0'; dot.style.animation = 'pulse 2s infinite'; }
  const upd = document.getElementById('hw-updated');
  if (upd) upd.textContent = 'Última leitura: ' + new Date().toLocaleTimeString('pt-BR');

  _setHw('hw-cpu-pct',  _hwPStr(m.cpu_percent),       _hwCol(m.cpu_percent, 70, 90));
  _setHw('hw-cpu-freq', m.cpu_freq_mhz != null ? m.cpu_freq_mhz.toFixed(0) + ' MHz' : '–');
  _setHw('hw-cpu-tctl', _hwTStr(m.cpu_temp_tctl_c),   _hwCol(m.cpu_temp_tctl_c, 75, 90));
  const sensorEl = document.getElementById('hw-cpu-sensor');
  if (sensorEl && m.cpu_temp_sensor) sensorEl.textContent = 'sensor ' + m.cpu_temp_sensor;
  _setHw('hw-mem-pct',    _hwPStr(m.mem_percent),      _hwCol(m.mem_percent, 70, 90));
  _setHw('hw-mem-detail', m.mem_used_gb != null ? m.mem_used_gb.toFixed(1) + ' GB usados' : '–');
  _setHw('hw-disk-r', _hwMStr(m.disk_read_mb_s));
  _setHw('hw-disk-w', _hwMStr(m.disk_write_mb_s));

  if (!_hwTempBuilt) _buildTempGrid(m); else _updTempGrid(m);
  if (m.rapl_energy_uj != null) {
    document.getElementById('hw-rapl-section').classList.remove('hidden');
    _setHw('hw-rapl-val', (m.rapl_energy_uj / 1e6).toFixed(2) + ' kJ');
  }

  // Mini stats no header
  _setHw('hm-cpu-pct',  _hwPStr(m.cpu_percent),     _hwCol(m.cpu_percent, 70, 90));
  _setHw('hm-cpu-temp', _hwTStr(m.cpu_temp_tctl_c), _hwCol(m.cpu_temp_tctl_c, 75, 90));
  _setHw('hm-ram-pct',  _hwPStr(m.mem_percent),     _hwCol(m.mem_percent, 70, 90));

  const ramTemp = (m.ram_temps_c && m.ram_temps_c.length) ? m.ram_temps_c[0] : null;
  const ramTempSep = document.getElementById('hm-ram-temp-sep');
  const ramTempEl  = document.getElementById('hm-ram-temp');
  if (ramTemp == null) {
    if (ramTempSep) ramTempSep.style.display = 'none';
    if (ramTempEl)  ramTempEl.style.display  = 'none';
  } else {
    if (ramTempSep) ramTempSep.style.display = '';
    if (ramTempEl)  { ramTempEl.style.display = ''; _setHw('hm-ram-temp', _hwTStr(ramTemp), _hwCol(ramTemp, 60, 80)); }
  }

  const ssdTemp  = (m.nvme_temps_c && m.nvme_temps_c.length) ? m.nvme_temps_c[0] : null;
  const ssdBlock = document.getElementById('hm-ssd-block');
  const ssdSep   = document.getElementById('hm-ssd-sep');
  if (ssdTemp != null) {
    if (ssdBlock) ssdBlock.style.display = 'flex';
    if (ssdSep)   ssdSep.style.display   = '';
    _setHw('hm-ssd-temp', _hwTStr(ssdTemp), _hwCol(ssdTemp, 55, 70));
  }

  const _fmtMb = v => v == null ? '–' : v < 1 ? v.toFixed(2) + ' MB/s' : v.toFixed(1) + ' MB/s';
  _setHw('hm-disk-r', _fmtMb(m.disk_read_mb_s),  m.disk_read_mb_s  > 100 ? '#f87171' : m.disk_read_mb_s  > 30 ? '#fbbf24' : '#e5e7eb');
  _setHw('hm-disk-w', _fmtMb(m.disk_write_mb_s), m.disk_write_mb_s > 100 ? '#f87171' : m.disk_write_mb_s > 30 ? '#fbbf24' : '#e5e7eb');
}

function _hwPushChart(m) {
  if (!_hwChartCpu || !_hwChartTemp) return;
  const lbl = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  _hwLbls.push(lbl); _hwCpuD.push(m.cpu_percent ?? null); _hwTmpD.push(m.cpu_temp_tctl_c ?? null);
  if (_hwLbls.length > _HW_MAX) { _hwLbls.shift(); _hwCpuD.shift(); _hwTmpD.shift(); }
  _hwChartCpu.update('none'); _hwChartTemp.update('none');
}

async function fetchHwMetrics() {
  try {
    const r = await fetch(`${API_BASE}/api/metrics`);
    if (!r.ok) return;
    const m = await r.json();
    renderHwMetrics(m);
    _hwPushChart(m);
  } catch (_) {}
}

function _startHwPolling() {
  if (_hwInterval) return;
  _hwInterval = setInterval(fetchHwMetrics, 1000);
  _loadServerInfo();
}

async function _loadServerInfo() {
  try {
    const r = await fetch(`${API_BASE}/api/server-info`);
    if (!r.ok) return;
    const d = await r.json();
    const m   = document.getElementById('si-cpu-model');
    const c   = document.getElementById('si-cpu-cores');
    const mem = document.getElementById('si-mem-total');
    if (m)   m.textContent   = d.cpu_model || '–';
    if (c)   c.textContent   = `${d.cpu_physical} físicos / ${d.cpu_logical} lógicos`;
    if (mem) mem.textContent = `${d.mem_total_gb} GB`;
  } catch (_) {}
}
