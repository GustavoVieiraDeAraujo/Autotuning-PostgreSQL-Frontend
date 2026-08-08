// ─────────────────────────────────────────────────────────────────
// Loading overlay
// ─────────────────────────────────────────────────────────────────

function _showLoader(msg) {
  const el    = document.getElementById('app-loader');
  const bar   = document.getElementById('loader-bar');
  const msgEl = document.getElementById('loader-msg');
  if (msgEl) msgEl.textContent = msg || 'Carregando...';
  if (bar) bar.style.width = '0%';
  if (el)  { el.style.opacity = '1'; el.style.transition = ''; el.style.display = 'flex'; }
}

function _hideLoader() {
  const el  = document.getElementById('app-loader');
  const bar = document.getElementById('loader-bar');
  if (bar) bar.style.width = '100%';
  setTimeout(() => {
    if (el) { el.style.opacity = '0'; el.style.transition = 'opacity .35s'; }
    setTimeout(() => { if (el) el.style.display = 'none'; }, 360);
  }, 200);
}

function _setLoaderProgress(pct, msg) {
  const bar   = document.getElementById('loader-bar');
  const msgEl = document.getElementById('loader-msg');
  if (bar)   bar.style.width = pct + '%';
  if (msgEl && msg) msgEl.textContent = msg;
}
