import { useEffect, useRef, useState, type RefObject } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { API_BASE } from '../api/client';

export type TerminalKey = 'generate' | 'prepare' | 'runner';

const IDLE_MESSAGES: Record<TerminalKey, string> = {
  generate: '\x1b[90mAguardando geração de configurações...\x1b[0m',
  prepare: '\x1b[90mAguardando construção das imagens Docker...\x1b[0m',
  runner: '\x1b[90mAguardando execução da fila de benchmarks...\x1b[0m',
};

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

/**
 * Abre uma conexao SSE persistente pra um dos 3 logs (generate/prepare/runner)
 * e escreve o conteudo direto num terminal xterm.js. Porta de terminal.js do
 * app vanilla original — mesmo decode base64->bytes, mesmo backoff linear de
 * reconexao, mesmo evento customizado "reset" (log truncado por nova execucao).
 */
export function useTerminalStream(key: TerminalKey, containerRef: RefObject<HTMLDivElement | null>) {
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const hasContentRef = useRef(false);
  const autoScrollRef = useRef(true);
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const connectRef = useRef<(() => void) | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const term = new Terminal({
      theme: { background: '#030712', foreground: '#e5e7eb', cursor: '#60a5fa' },
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
      scrollback: 50000,
      convertEol: true,
      cursorBlink: false,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(container);
    termRef.current = term;
    fitRef.current = fit;

    requestAnimationFrame(() => requestAnimationFrame(() => fit.fit()));

    const onWheel = () => {
      const buf = term.buffer.active;
      if (buf.viewportY < buf.length - term.rows) {
        autoScrollRef.current = false;
      }
    };
    container.addEventListener('wheel', onWheel);

    function writeData(bytes: Uint8Array) {
      if (!hasContentRef.current) {
        term.clear();
        hasContentRef.current = true;
      }
      term.write(bytes);
      if (autoScrollRef.current) {
        term.scrollToBottom();
      }
    }

    function showIdle() {
      if (hasContentRef.current) return;
      term.write(IDLE_MESSAGES[key]);
    }

    function connect() {
      setConnectionState('connecting');
      const sse = new EventSource(`${API_BASE}/stream/${key}`);
      sseRef.current = sse;

      sse.onopen = () => {
        retriesRef.current = 0;
        setConnectionState('connected');
        idleTimerRef.current = window.setTimeout(showIdle, 800);
      };

      sse.onmessage = (e) => {
        const bin = atob(e.data);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        writeData(bytes);
      };

      sse.addEventListener('reset', () => {
        term.clear();
        hasContentRef.current = false;
      });

      sse.onerror = () => {
        sse.close();
        retriesRef.current += 1;
        setConnectionState('disconnected');
        const delay = Math.min(3000 * retriesRef.current, 15000);
        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };
    }

    connectRef.current = connect;
    connect();

    return () => {
      container.removeEventListener('wheel', onWheel);
      sseRef.current?.close();
      if (reconnectTimerRef.current !== null) window.clearTimeout(reconnectTimerRef.current);
      if (idleTimerRef.current !== null) window.clearTimeout(idleTimerRef.current);
      term.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    connectionState,
    scrollToBottom: () => {
      autoScrollRef.current = true;
      termRef.current?.scrollToBottom();
    },
    clear: () => {
      termRef.current?.clear();
      hasContentRef.current = false;
    },
    reconnect: () => {
      sseRef.current?.close();
      retriesRef.current = 0;
      termRef.current?.clear();
      hasContentRef.current = false;
      if (reconnectTimerRef.current !== null) window.clearTimeout(reconnectTimerRef.current);
      connectRef.current?.();
    },
    refit: () => fitRef.current?.fit(),
  };
}
