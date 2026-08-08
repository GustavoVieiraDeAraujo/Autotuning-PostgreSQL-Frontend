// ─────────────────────────────────────────────────────────────────
// Inicialização da aplicação
// ─────────────────────────────────────────────────────────────────

async function _init() {
  _showLoader('Carregando...');
  showTab('workflow');
  setFilter('all');
  try {
    _setLoaderProgress(30, 'Buscando fila...');
    await fetchQueue();
    _setLoaderProgress(65, 'Buscando status...');
    await fetchStatus();
    _setLoaderProgress(90, 'Inicializando hardware...');
    _startHwPolling();
    _setLoaderProgress(100, 'Pronto');
  } catch (_) {
    _startHwPolling();
  }
  _hideLoader();
  setInterval(() => { fetchQueue(); fetchStatus(); }, 3000);
}

_init();
