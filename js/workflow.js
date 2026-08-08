// ─────────────────────────────────────────────────────────────────
// Painel de início (workflow)
// ─────────────────────────────────────────────────────────────────

// Rastreia o último modo renderizado para evitar reflash a cada poll.
let _wfMode = '';

function _wfCurrentMode() {
  if (_runnerRunning)    return 'running';
  if (_generatorRunning) return 'generating';
  if (_prepareRunning)   return 'preparing';
  if (_step === 'ran')       return 'ran';
  if (_step === 'prepared')  return 'prepared';
  if (_step === 'generated') return 'generated';
  return 'idle';
}

function _updateRunningProgress() {
  const done  = _tasks.filter(t => t.status === 'done').length;
  const pend  = _tasks.filter(t => t.status === 'pending').length;
  const total = _tasks.length;
  const pct   = total > 0 ? (done / total * 100).toFixed(1) : 0;
  const pb = document.getElementById('wfr-bar');
  const pl = document.getElementById('wfr-label');
  if (pb) pb.style.width = pct + '%';
  if (pl) pl.textContent = `${done} / ${total} (${pct}%)`;
  const ids = { 'wfr-pend': pend, 'wfr-done': done };
  Object.entries(ids).forEach(([id, v]) => { const e = document.getElementById(id); if (e) e.textContent = v; });
}

function renderWorkflowPane() {
  const el = document.getElementById('wf-card');
  if (!el) return;

  const mode = _wfCurrentMode();

  // Modo running: atualiza progresso in-place sem re-renderizar
  if (mode === 'running' && _wfMode === 'running') {
    _updateRunningProgress();
    return;
  }

  // Mesmo modo que antes — não re-renderiza (evita flicker de animação)
  if (mode === _wfMode) return;
  _wfMode = mode;

  const done  = _tasks.filter(t => t.status === 'done').length;
  const pend  = _tasks.filter(t => t.status === 'pending').length;
  const total = _tasks.length;
  const pct   = total > 0 ? (done / total * 100).toFixed(1) : 0;

  const byTier = {};
  _tasks.forEach(t => { byTier[t.tier] = (byTier[t.tier] || 0) + 1; });
  const tierBadges = Object.entries(byTier).map(([tier, n]) =>
    `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border border-gray-700 bg-gray-800">
      <span class="${tierCls(tier)}">${tier}</span>
      <span class="text-gray-400">${n}</span>
    </span>`).join('');

  if (mode === 'running') {
    el.innerHTML = `
      <div class="hero anim-fadeUp">
        <div class="hero-icon bg-yellow-500/15 border border-yellow-500/20 mx-auto">
          <svg class="w-6 h-6 text-yellow-400 anim-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-100 mb-1">Benchmarks em execução</h2>
        <p class="text-sm text-gray-500 mb-6">A fila está sendo processada. Acompanhe o progresso abaixo.</p>
        <div class="mb-6 text-left bg-gray-800/60 rounded-xl p-4">
          <div class="flex justify-between text-xs text-gray-500 mb-2">
            <span>Progresso</span>
            <span id="wfr-label" class="mono">${done} / ${total} (${pct}%)</span>
          </div>
          <div class="prog mb-4"><div id="wfr-bar" class="prog-fill" style="width:${pct}%"></div></div>
          <div class="grid grid-cols-3 gap-3 text-center">
            <div><div id="wfr-pend"   class="text-lg font-bold text-gray-300">${pend}</div><div class="text-xs text-gray-600">Pendentes</div></div>
            <div><div class="text-lg font-bold text-yellow-400">1</div><div class="text-xs text-gray-600">Executando</div></div>
            <div><div id="wfr-done"   class="text-lg font-bold text-green-400">${done}</div><div class="text-xs text-gray-600">Concluídas</div></div>
          </div>
        </div>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <button onclick="stopActive()" class="btn btn-red btn-lg">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm5-2.25A.75.75 0 017.75 7h4.5a.75.75 0 01.75.75v4.5a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-4.5z" clip-rule="evenodd"/></svg>
            Pausar Execução
          </button>
          <button onclick="showTab('queue')" class="btn btn-ghost btn-lg">Ver fila</button>
        </div>
        <p class="text-xs text-gray-700 mt-4">A tarefa em execução será concluída antes de parar</p>
      </div>`;
  } else if (mode === 'ran') {
    el.innerHTML = `
      <div class="hero anim-fadeUp">
        <div class="hero-icon bg-green-500/15 border border-green-500/25 mx-auto">
          <svg class="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-100 mb-1">Benchmarks concluídos</h2>
        <p class="text-sm text-gray-500 mb-6">${done} tarefas concluídas</p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <button onclick="showTab('results')" class="btn btn-primary btn-lg">Ver Resultados</button>
          ${pend > 0 ? `<button onclick="runnerStart()" class="btn btn-green btn-lg">Continuar (${pend} restantes)</button>` : ''}
        </div>
        <div class="mt-6 pt-5 border-t border-gray-800/60">
          <p class="text-sm font-semibold text-gray-300 mb-3">Nova Rodada</p>
          <p class="text-xs text-gray-500 mb-4">Faça o backup dos resultados antes de iniciar. O Reiniciar abaixo apaga tudo para uma execução limpa.</p>
          <div class="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <div class="flex flex-col items-start gap-1">
              <label class="text-xs text-gray-500">Seed LHS (opcional)</label>
              <input id="gen-seed" type="number" min="0" placeholder="ex: 2025"
                class="w-36 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm px-3 py-2 focus:outline-none focus:border-indigo-500"/>
            </div>
          </div>
          <button onclick="generatorStart()" class="btn btn-primary btn-lg">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Gerar Nova Rodada
          </button>
        </div>
        <div class="mt-6 pt-5 border-t border-gray-800/60">
          <button onclick="resetAll()" class="btn btn-red btn-lg">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            Reiniciar
          </button>
          <p class="text-xs text-gray-600 mt-3">Apaga permanentemente: fila de tarefas, todos os resultados de benchmark e arquivos de log.</p>
        </div>
      </div>`;
  } else if (mode === 'preparing') {
    el.innerHTML = `
      <div class="hero anim-fadeUp">
        <div class="hero-icon bg-violet-500/15 border border-violet-500/20 mx-auto">
          <svg class="w-6 h-6 text-violet-400 anim-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-100 mb-1">Preparando imagens Docker</h2>
        <p class="text-sm text-gray-500 mb-5">Construindo 6 imagens (TPC-H + TPC-DS × 3 tiers)…</p>
        <button onclick="showTab('terminal')" class="btn btn-ghost">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          Acompanhar no terminal
        </button>
      </div>`;
  } else if (mode === 'prepared') {
    el.innerHTML = `
      <div class="hero anim-fadeUp">
        <div class="hero-icon bg-green-500/15 border border-green-500/25 mx-auto">
          <svg class="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-100 mb-1">Pronto para executar</h2>
        <p class="text-sm text-gray-500 mb-2">Imagens Docker preparadas. ${total} tarefas na fila.</p>
        <div class="flex flex-wrap gap-2 justify-center mb-6">${tierBadges}</div>
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <button onclick="runnerStart()" class="btn btn-green btn-lg">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>
            Executar Benchmarks
          </button>
          <button onclick="showTab('queue')" class="btn btn-ghost btn-lg">Ver fila</button>
        </div>
        <div class="mt-6 pt-5 border-t border-gray-800/60">
          <button onclick="resetAll()" class="btn btn-red btn-lg">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            Reiniciar
          </button>
          <p class="text-xs text-gray-600 mt-3">Apaga permanentemente: fila de tarefas, todos os resultados de benchmark e arquivos de log.</p>
        </div>
      </div>`;
  } else if (mode === 'generated') {
    el.innerHTML = `
      <div class="hero anim-fadeUp">
        <div class="hero-icon bg-blue-500/15 border border-blue-500/25 mx-auto">
          <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-100 mb-1">Configurações geradas</h2>
        <p class="text-sm text-gray-500 mb-2">${total} tarefas criadas com Latin Hypercube Sampling.</p>
        <div class="flex flex-wrap gap-2 justify-center mb-6">${tierBadges}</div>
        <div class="flex flex-col sm:flex-row gap-3 justify-center mb-2">
          <button onclick="prepareStart(false)" class="btn btn-primary btn-lg">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M3.505 2.365A41.369 41.369 0 019 2c1.863 0 3.697.124 5.495.365 1.247.167 2.18 1.108 2.435 2.268a4.45 4.45 0 00-.577-.069 43.141 43.141 0 00-4.706 0C9.229 4.696 7.5 6.727 7.5 8.998v2.24c0 1.413.67 2.735 1.76 3.562l-2.98 2.98A.75.75 0 015 17.25v-3.443c-.501-.05-.997-.109-1.49-.173 1.255-1.88 1.99-4.084 1.99-6.497V5.818c0-.858-.494-1.638-1.272-1.997zM8.5 8.998c0-1.656 1.346-3.003 3-3.003a41.51 41.51 0 014.473.243C17.153 6.4 18 7.507 18 8.749V11c0 2.27-.978 4.32-2.545 5.76a.75.75 0 01-1.04-.04l-1.51-1.51c-.325.189-.68.34-1.055.445V17.5h.5a.75.75 0 010 1.5h-3a.75.75 0 010-1.5H11v-1.845a5.5 5.5 0 01-2.5-4.655V8.998z"/></svg>
            Preparar Imagens
          </button>
          <button onclick="prepareStart(true)" class="btn btn-ghost btn-lg" title="Reconstrói todas as imagens mesmo que já existam — necessário após upgrade de versão do PostgreSQL">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            Reconstruir (force)
          </button>
        </div>
        <p class="text-xs text-gray-600 mb-0">Use <strong class="text-gray-500">Reconstruir</strong> após upgrade de versão do PostgreSQL</p>
        <div class="mt-6 pt-5 border-t border-gray-800/60">
          <button onclick="resetAll()" class="btn btn-red btn-lg">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            Reiniciar
          </button>
          <p class="text-xs text-gray-600 mt-3">Apaga permanentemente: fila de tarefas, todos os resultados de benchmark e arquivos de log.</p>
        </div>
      </div>`;
  } else if (mode === 'generating') {
    el.innerHTML = `
      <div class="hero anim-fadeUp">
        <div class="hero-icon bg-blue-500/15 border border-blue-500/20 mx-auto">
          <svg class="w-6 h-6 text-blue-400 anim-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-100 mb-1">Gerando configurações…</h2>
        <p class="text-sm text-gray-500 mb-5">Executando amostragem Latin Hypercube nos espaços de parâmetros.</p>
        <button onclick="showTab('terminal')" class="btn btn-ghost">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          Acompanhar no terminal
        </button>
      </div>`;
  } else {
    // Idle — estado inicial
    el.innerHTML = `
      <div class="hero anim-fadeUp">
        <div class="hero-icon bg-blue-500/15 border border-blue-500/25 mx-auto">
          <svg class="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-100 mb-2">PostgreSQL Autotuning</h2>
        <p class="text-sm text-gray-500 mb-1 max-w-md mx-auto">Explore o espaço de configurações do PostgreSQL com benchmarks TPC-H e TPC-DS usando Latin Hypercube Sampling.</p>
        <p class="text-xs text-gray-700 mb-6">3 tiers de hardware · 7 combinações de estágios · métricas de hardware por configuração</p>

        <div class="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 mb-5 text-left max-w-sm mx-auto space-y-3">
          <div class="flex items-center justify-between gap-4">
            <div>
              <div class="text-xs font-semibold text-gray-300">Configs por combinação</div>
              <div class="text-xs text-gray-600 mt-0.5">N configs × 7 combinações de estágios</div>
            </div>
            <input id="gen-n-configs" type="number" min="3" max="501" step="3" value="51"
              style="width:72px;background:#111827;border:1px solid #374151;border-radius:.5rem;padding:.375rem .5rem;font-size:.875rem;color:#e5e7eb;text-align:center;outline:none;"
              oninput="updateGenPreview()">
          </div>
          <div class="flex items-center justify-between gap-4">
            <div>
              <div class="text-xs font-semibold text-gray-300">Seed LHS</div>
              <div class="text-xs text-gray-600 mt-0.5">Vazio = não-determinístico</div>
            </div>
            <input id="gen-seed" type="number" min="0" placeholder="ex: 2025"
              style="width:90px;background:#111827;border:1px solid #374151;border-radius:.5rem;padding:.375rem .5rem;font-size:.875rem;color:#e5e7eb;text-align:center;outline:none;">
          </div>
          <div id="gen-preview" class="text-xs text-gray-600 text-center mono"></div>
        </div>

        <div class="flex flex-col sm:flex-row gap-3 justify-center mb-2">
          <button onclick="generatorStart()" class="btn btn-primary btn-lg">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clip-rule="evenodd"/></svg>
            Gerar Configurações
          </button>
          <button onclick="generatorStartValidation()" class="btn btn-ghost btn-lg" title="3 configs por combinação — confirma que o pipeline funciona antes da rodada completa">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Modo Validação
          </button>
        </div>
        <p class="text-xs text-gray-700">Modo Validação usa 3 configs (21 tarefas) para confirmar que o pipeline está correto antes da rodada completa</p>
      </div>`;
    updateGenPreview();
  }
}
