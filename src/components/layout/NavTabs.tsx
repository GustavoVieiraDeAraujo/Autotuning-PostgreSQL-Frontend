export type TabName = 'workflow' | 'queue' | 'configs' | 'results' | 'hardware' | 'terminal';

interface Props {
  active: TabName;
  onChange: (tab: TabName) => void;
  showQueueConfigs: boolean;
  showResults: boolean;
}

const TAB_LABELS: Record<TabName, string> = {
  workflow: 'Início',
  queue: 'Fila',
  configs: 'Configurações',
  results: 'Resultados',
  hardware: 'Hardware',
  terminal: 'Terminal',
};

// Ordem de exibicao — "Fila" e "Configuracoes" vem primeiro no app original
const ORDER: TabName[] = ['queue', 'workflow', 'configs', 'hardware', 'terminal', 'results'];

export function NavTabs({ active, onChange, showQueueConfigs, showResults }: Props) {
  const visible = ORDER.filter((tab) => {
    if ((tab === 'queue' || tab === 'configs') && !showQueueConfigs) return false;
    if (tab === 'results' && !showResults) return false;
    return true;
  });

  return (
    <nav className="flex items-center gap-6 px-5 border-b border-gray-800">
      {visible.map((tab) => (
        <button
          key={tab}
          className={`nav-tab ${active === tab ? 'active' : ''}`}
          onClick={() => onChange(tab)}
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </nav>
  );
}
