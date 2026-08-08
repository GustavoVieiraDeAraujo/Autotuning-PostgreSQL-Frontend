import '@xterm/xterm/css/xterm.css';
import { useEffect, useRef } from 'react';
import { useTerminalStream, type TerminalKey } from '../../hooks/useTerminalStream';

interface Props {
  activeSub: TerminalKey;
  onChangeSub: (key: TerminalKey) => void;
}

const LABELS: Record<TerminalKey, string> = {
  generate: 'Gerar',
  prepare: 'Preparar',
  runner: 'Executar',
};

const STATUS_COLOR: Record<string, string> = {
  connecting: 'bg-amber-400',
  connected: 'bg-emerald-400',
  disconnected: 'bg-red-400',
};

export function TerminalPane({ activeSub, onChangeSub }: Props) {
  const genRef = useRef<HTMLDivElement>(null);
  const prepRef = useRef<HTMLDivElement>(null);
  const runnerRef = useRef<HTMLDivElement>(null);

  // As 3 conexoes SSE/instancias xterm sao criadas aqui e persistem
  // enquanto TerminalPane estiver montado — como o painel inteiro nunca e
  // desmontado (so tem visibilidade alternada via CSS, ver App.tsx), elas
  // ficam vivas em background mesmo trocando de aba/sub-aba.
  const generate = useTerminalStream('generate', genRef);
  const prepare = useTerminalStream('prepare', prepRef);
  const runner = useTerminalStream('runner', runnerRef);

  const streams = { generate, prepare, runner };
  const active = streams[activeSub];

  useEffect(() => {
    active.refit();
  }, [activeSub, active]);

  return (
    <div className="pane pane-terminal p-5">
      <div className="flex items-center gap-1 mb-3 shrink-0">
        {(Object.keys(LABELS) as TerminalKey[]).map((key) => (
          <button
            key={key}
            className={`tsub ${activeSub === key ? 'active' : ''}`}
            onClick={() => onChangeSub(key)}
          >
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${STATUS_COLOR[streams[key].connectionState]}`} />
            {LABELS[key]}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button className="btn btn-sm btn-ghost" onClick={active.scrollToBottom}>
            Ao vivo
          </button>
          <button className="btn btn-sm btn-ghost" onClick={active.clear}>
            Limpar
          </button>
          <button className="btn btn-sm btn-ghost" onClick={active.reconnect}>
            Reconectar
          </button>
        </div>
      </div>
      <div className="term-card card p-2">
        <div ref={genRef} className={`term-wrap ${activeSub !== 'generate' ? 'hidden' : ''}`} />
        <div ref={prepRef} className={`term-wrap ${activeSub !== 'prepare' ? 'hidden' : ''}`} />
        <div ref={runnerRef} className={`term-wrap ${activeSub !== 'runner' ? 'hidden' : ''}`} />
      </div>
    </div>
  );
}
