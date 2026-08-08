// ─────────────────────────────────────────────────────────────────
// Formatação e helpers genéricos
// ─────────────────────────────────────────────────────────────────

const fmtMs = ms =>
  ms == null ? '–'
  : ms < 1000 ? ms.toFixed(0) + ' ms'
  : ms < 60000 ? (ms / 1000).toFixed(1) + ' s'
  : `${Math.floor(ms / 60000)}m ${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}s`;

const fmtDur = s => s == null ? '–' : fmtMs(s * 1000);

const tierCls = t => ({ low: 'tier-low', medium: 'tier-medium', high: 'tier-high' }[t] || '');

function animateVal(id, newVal, suffix = '') {
  const el = document.getElementById(id);
  if (!el) return;
  const cur = parseFloat(el.textContent) || 0;
  if (Math.abs(cur - newVal) < .5) { el.textContent = Math.round(newVal) + suffix; return; }
  const s = performance.now();
  const tick = now => {
    const t = Math.min((now - s) / 450, 1), e = 1 - Math.pow(1 - t, 2);
    el.textContent = Math.round(cur + (newVal - cur) * e) + suffix;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
