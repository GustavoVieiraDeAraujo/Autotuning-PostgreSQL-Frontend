import { useState } from 'react';
import { Header } from './components/layout/Header';
import { NavTabs, type TabName } from './components/layout/NavTabs';
import { WorkflowPane } from './components/workflow/WorkflowPane';
import { QueuePane } from './components/queue/QueuePane';
import { ConfigsPane } from './components/configs/ConfigsPane';
import { ResultsPane } from './components/results/ResultsPane';
import { HardwarePane } from './components/hardware/HardwarePane';
import { TerminalPane } from './components/terminal/TerminalPane';
import type { TerminalKey } from './hooks/useTerminalStream';
import { useHwMetricsQuery, useProcessStatusQuery, useQueueQuery, useServerInfoQuery } from './api/queries';
import { useWorkflowState } from './state/workflow/useWorkflowState';

function App() {
  const [activeTab, setActiveTab] = useState<TabName>('workflow');
  const [activeTerminalSub, setActiveTerminalSub] = useState<TerminalKey>('generate');

  // As 3 queries de polling ficam aqui (nao dentro de cada painel) porque
  // devem continuar rodando independente da aba ativa — mesmo
  // comportamento do app original (setInterval nunca gated pela aba visivel).
  const queueQuery = useQueueQuery();
  const statusQuery = useProcessStatusQuery();
  const hwQuery = useHwMetricsQuery();
  const serverInfoQuery = useServerInfoQuery();

  const tasks = queueQuery.data ?? [];

  const { displayMode } = useWorkflowState(queueQuery.data, statusQuery.data, (target) => {
    setActiveTab(target.tab);
    setActiveTerminalSub(target.sub);
  });

  const showQueueConfigs = tasks.length > 0;
  const showResults = tasks.some((t) => t.status === 'done');

  return (
    <>
      <Header hw={hwQuery.data} />
      <NavTabs
        active={activeTab}
        onChange={setActiveTab}
        showQueueConfigs={showQueueConfigs}
        showResults={showResults}
      />
      {/* Todas as abas ficam sempre montadas — so a visibilidade alterna via
          classe CSS. Renderizacao condicional desmontaria as 3 conexoes SSE
          do terminal e os graficos de hardware a cada troca de aba. */}
      <main className="main-content">
        <div className={`pane ${activeTab !== 'workflow' ? 'hidden' : ''}`}>
          <WorkflowPane
            mode={displayMode}
            tasks={tasks}
            status={statusQuery.data}
            onGoToTerminal={(sub) => {
              setActiveTab('terminal');
              setActiveTerminalSub(sub);
            }}
            onGoToResults={() => setActiveTab('results')}
          />
        </div>
        <div className={`pane ${activeTab !== 'queue' ? 'hidden' : ''}`}>
          <QueuePane tasks={tasks} />
        </div>
        <div className={`pane ${activeTab !== 'configs' ? 'hidden' : ''}`}>
          <ConfigsPane tasks={tasks} />
        </div>
        <div className={`pane ${activeTab !== 'results' ? 'hidden' : ''}`}>
          <ResultsPane tasks={tasks} active={activeTab === 'results'} />
        </div>
        <div className={`pane ${activeTab !== 'hardware' ? 'hidden' : ''}`}>
          <HardwarePane hw={hwQuery.data} serverInfo={serverInfoQuery.data} />
        </div>
        <div className={`pane ${activeTab !== 'terminal' ? 'hidden' : ''}`}>
          <TerminalPane activeSub={activeTerminalSub} onChangeSub={setActiveTerminalSub} />
        </div>
      </main>
    </>
  );
}

export default App;
