// ─────────────────────────────────────────────────────────────────
// Terminal (xterm.js + SSE)
// ─────────────────────────────────────────────────────────────────

const _TKEYS    = ['generate', 'prepare', 'runner'];
const _TSTREAMS = { generate: `${API_BASE}/stream/generate`, prepare: `${API_BASE}/stream/prepare`, runner: `${API_BASE}/stream/runner` };
const _TIDLE    = {
  generate: ['  \x1b[90mNenhuma geração executada ainda.\x1b[0m',   '  \x1b[90mClique Gerar Configurações para iniciar.\x1b[0m'],
  prepare:  ['  \x1b[90mNenhum prepare executado ainda.\x1b[0m',     '  \x1b[90mInicia automaticamente após a geração.\x1b[0m'],
  runner:   ['  \x1b[90mNenhuma execução ativa.\x1b[0m',             '  \x1b[90mClique Executar Benchmarks para iniciar.\x1b[0m'],
};

const _terms = {}, _fits = {}, _sses = {};
const _hasCont    = { generate: false, prepare: false, runner: false };
const _autoScroll = { generate: true,  prepare: true,  runner: true  };
const _retries    = { generate: 0,     prepare: 0,     runner: 0     };
let _activeTermTab = 'generate', _termsInited = false;

function openTerminal(key) {
  showTab('terminal');
  if (key) showTermTab(key);
}

function refitTerminals() {
  _TKEYS.forEach(k => { if (_fits[k]) _fits[k].fit(); });
}

function initTerminals() {
  if (_termsInited) return;
  _termsInited = true;
  _TKEYS.forEach(k => _initOneTerm(k));
  window.addEventListener('resize', () => refitTerminals());
}

function _initOneTerm(key) {
  if (_terms[key]) return;
  _terms[key] = new Terminal({
    theme: { background: '#030712', foreground: '#e5e7eb', cursor: '#60a5fa', selectionBackground: 'rgba(96,165,250,.3)' },
    fontSize: 13,
    fontFamily: '"JetBrains Mono","Fira Code",monospace',
    scrollback: 50000,
    convertEol: true,
    cursorBlink: false,
  });
  _fits[key] = new FitAddon.FitAddon();
  _terms[key].loadAddon(_fits[key]);
  _terms[key].open(document.getElementById('twrap-' + key));
  requestAnimationFrame(() => requestAnimationFrame(() => { if (_fits[key]) _fits[key].fit(); }));
  _terms[key].element.addEventListener('wheel', () => {
    const buf = _terms[key].buffer.active;
    if (buf.viewportY < buf.length - _terms[key].rows) _setAutoScroll(key, false);
  });
  _connectSSE(key);
}

function showTermTab(key) {
  _TKEYS.forEach(k => {
    document.getElementById('twrap-' + k).classList.toggle('hidden', k !== key);
    const btn = document.getElementById('tsub-' + k);
    if (btn) btn.classList.toggle('active', k === key);
  });
  _activeTermTab = key;
  if (_fits[key]) requestAnimationFrame(() => _fits[key].fit());
}

function _clearTerm(key) {
  if (!_terms[key]) return;
  _terms[key].clear(); _hasCont[key] = false; _setAutoScroll(key, true);
}

function _setAutoScroll(key, on) {
  _autoScroll[key] = on;
  const lb = document.getElementById('term-live-btn');
  if (lb && key === _activeTermTab) lb.classList.toggle('hidden', on);
}

function termScrollBottomActive() {
  const key = _activeTermTab;
  if (_terms[key]) _terms[key].scrollToBottom();
  _setAutoScroll(key, true);
}

function clearActiveTerm() {
  const key = _activeTermTab;
  if (!_terms[key]) return;
  _terms[key].clear(); _hasCont[key] = false;
  _setAutoScroll(key, true);
}

function reconnectActiveTerm() {
  const key = _activeTermTab;
  if (!_terms[key]) return;
  _terms[key].clear(); _hasCont[key] = false; _retries[key] = 0;
  _setAutoScroll(key, true); _connectSSE(key);
}

function _writeKey(key, bytes) {
  if (!_hasCont[key]) { _hasCont[key] = true; _terms[key].clear(); }
  _terms[key].write(bytes);
  if (_autoScroll[key]) _terms[key].scrollToBottom();
}

function _showIdle(key) {
  if (_hasCont[key] || !_terms[key]) return;
  _hasCont[key] = true;
  _terms[key].writeln('\x1b[2m' + '─'.repeat(60) + '\x1b[0m');
  _TIDLE[key].forEach(l => _terms[key].writeln(l));
  _terms[key].writeln('');
}

function _updateSSEStatus(key, state) {
  if (key !== _activeTermTab) return;
  const dot = document.getElementById('tdot-active');
  const txt = document.getElementById('ttext-active');
  dot.style.animation = '';
  if (state === 'connecting') {
    dot.className = 'w-1.5 h-1.5 rounded-full bg-yellow-400'; dot.style.animation = 'pulse 1.2s infinite';
    txt.textContent = _retries[key] > 0 ? `Reconectando (${_retries[key]}×)` : 'Conectando...';
    txt.className = 'text-xs text-yellow-300';
  } else if (state === 'connected') {
    dot.className = 'w-1.5 h-1.5 rounded-full bg-green-400';
    txt.textContent = 'Conectado'; txt.className = 'text-xs text-green-400';
  } else {
    dot.className = 'w-1.5 h-1.5 rounded-full bg-red-400';
    txt.textContent = 'Desconectado'; txt.className = 'text-xs text-red-400';
  }
}

function _connectSSE(key) {
  if (_sses[key]) _sses[key].close();
  _updateSSEStatus(key, 'connecting');
  const sse = new EventSource(_TSTREAMS[key]);
  _sses[key] = sse;
  sse.onopen    = () => { _retries[key] = 0; _updateSSEStatus(key, 'connected'); setTimeout(() => { if (!_hasCont[key]) _showIdle(key); }, 800); };
  sse.onmessage = e => {
    try {
      const b = atob(e.data), u = new Uint8Array(b.length);
      for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
      _writeKey(key, u);
    } catch (_) {}
  };
  sse.addEventListener('reset', () => { _hasCont[key] = false; _terms[key].clear(); _setAutoScroll(key, true); });
  sse.onerror = () => {
    _retries[key]++;
    _updateSSEStatus(key, 'disconnected');
    sse.close();
    setTimeout(() => _connectSSE(key), Math.min(3000 * _retries[key], 15000));
  };
}

function updateTermPill() { /* pill removed with drawer */ }
