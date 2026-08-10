import '../../lib/chartSetup';
import { useMemo, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import type { Task, Tier } from '../../api/types';
import { useResultDetailQuery, useResultsListQuery } from '../../api/queries';
import { fmtMs, tierCls } from '../../lib/format';

interface Props {
  tasks: Task[];
  active: boolean;
}

const ABANDONED_MESSAGES: Record<string, string> = {
  timeout:
    'Limite de tempo excedido: a configuração demorou mais do que o permitido para o tier.',
  invalid_config:
    'Configuração inválida: o PostgreSQL rejeitou um ou mais parâmetros da configuração gerada.',
  max_retries: 'Falha de infraestrutura: a tarefa falhou 3 vezes consecutivas (Docker, disco ou rede).',
};

export function ResultsPane({ tasks, active }: Props) {
  const [tier, setTier] = useState<'all' | Tier>('all');
  const [benchmark, setBenchmark] = useState<'tpc_h' | 'tpc_ds'>('tpc_h');
  const [selected, setSelected] = useState<{ tier: Tier; combo: string; taskId: number } | null>(null);
  const [logScale, setLogScale] = useState(false);

  const { data: files } = useResultsListQuery(active);
  const { data: detail } = useResultDetailQuery(
    selected?.tier ?? null,
    selected?.combo ?? null,
    selected?.taskId ?? null,
  );

  const taskMap = useMemo(() => {
    const m = new Map<number, Task>();
    for (const t of tasks) m.set(t.id, t);
    return m;
  }, [tasks]);

  const visibleFiles = (files ?? []).filter((f) => tier === 'all' || f.tier === tier);

  const bm = detail ? detail[benchmark] : null;
  const nQ = benchmark === 'tpc_h' ? 20 : 98;

  return (
    <div className="pane pane-results p-5 flex gap-4">
      <div className="w-72 shrink-0 flex flex-col gap-3">
        <div className="flex gap-1.5">
          {(['all', 'low', 'medium', 'high'] as const).map((t) => (
            <button
              key={t}
              className={`btn btn-sm flex-1 justify-center ${tier === t ? 'btn-active' : 'btn-ghost'} ${t !== 'all' ? tierCls(t) : ''}`}
              onClick={() => setTier(t)}
            >
              {t === 'all' ? 'Todas' : t}
            </button>
          ))}
        </div>
        <div className="text-xs text-gray-500">{visibleFiles.length} resultado(s)</div>
        <div className="flex flex-col gap-2 overflow-y-auto">
          {visibleFiles.map((f) => {
            const t = taskMap.get(f.task_id);
            const res = t?.result;
            const isSel = selected?.taskId === f.task_id;
            return (
              <div
                key={f.task_id}
                className={`task-card ${isSel ? 'sel' : ''}`}
                onClick={() => setSelected({ tier: f.tier, combo: f.combo, taskId: f.task_id })}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="mono text-xs font-bold text-gray-400">#{f.task_id}</span>
                    <span className={`font-semibold text-xs ${tierCls(f.tier)}`}>{f.tier}</span>
                    <span className="mono text-xs text-gray-600">{f.combo}</span>
                  </div>
                  <span className={`badge badge-${t?.status ?? 'done'}`}>{t?.status ?? 'done'}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-600">
                  <span className="text-blue-400/70">
                    H:{res?.tpc_h_n_success != null ? `${res.tpc_h_n_success}/20` : '–'}
                  </span>
                  <span className="text-violet-400/70">
                    DS:{res?.tpc_ds_n_success != null ? `${res.tpc_ds_n_success}/98` : '–'}
                  </span>
                </div>
              </div>
            );
          })}
          {visibleFiles.length === 0 && <div className="text-center text-gray-600 text-sm py-6">Nenhum resultado.</div>}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {!detail ? (
          <div className="text-center text-gray-600 py-12">Selecione uma tarefa para ver os detalhes.</div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-lg">
                  Tarefa #{detail.task_id}: {detail.tier} / {detail.combination}
                </div>
                {detail.started_at && (
                  <div className="text-xs text-gray-500">
                    Executada em {new Date(detail.started_at).toLocaleString('pt-BR')}
                  </div>
                )}
              </div>
              <span className={`badge badge-${detail.status}`}>{detail.status}</span>
            </div>

            {detail.status === 'abandoned' && (
              <div className="card card-orange p-4">
                <div className="font-semibold text-orange-400 mb-1">Tarefa abandonada</div>
                <div className="text-sm text-gray-400">
                  {(detail.abandoned_reason && ABANDONED_MESSAGES[detail.abandoned_reason]) ??
                    detail.abandoned_reason ??
                    'Razão não registrada.'}
                </div>
                {detail.error && <div className="text-xs text-gray-600 mt-2 mono">{detail.error}</div>}
              </div>
            )}

            <div className="flex gap-2">
              <button
                className={`btn btn-sm ${benchmark === 'tpc_h' ? 'btn-active' : 'btn-ghost'}`}
                onClick={() => setBenchmark('tpc_h')}
              >
                TPC-H · 20 queries
              </button>
              <button
                className={`btn btn-sm ${benchmark === 'tpc_ds' ? 'btn-active' : 'btn-ghost'}`}
                onClick={() => setBenchmark('tpc_ds')}
              >
                TPC-DS · 98 queries
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <Tile label="Geo Mean" value={fmtMs(bm?.summary?.geo_mean_exec_ms)} color="text-blue-400" />
              <Tile
                label="Cache Hit"
                value={bm?.summary?.overall_cache_hit_ratio != null ? `${bm.summary.overall_cache_hit_ratio}%` : '–'}
                color="text-amber-400"
              />
              <Tile
                label="Spill Queries"
                value={bm?.summary?.queries_with_spill != null ? `${bm.summary.queries_with_spill}/${nQ}` : '–'}
                color="text-orange-400"
              />
              <Tile
                label="Paralelismo"
                value={
                  bm?.summary?.queries_with_parallelism != null ? `${bm.summary.queries_with_parallelism}/${nQ}` : '–'
                }
                color="text-violet-400"
              />
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="sl">exec_ms por Query</div>
                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                  <input type="checkbox" checked={logScale} onChange={(e) => setLogScale(e.target.checked)} />
                  log
                </label>
              </div>
              <Bar
                data={{
                  labels: (bm?.queries ?? []).map((q) => `Q${q.id}`),
                  datasets: [
                    {
                      data: (bm?.queries ?? []).map((q) => q.exec_ms ?? 0),
                      backgroundColor: (bm?.queries ?? []).map((q) =>
                        (q.exec_ms ?? 0) > 600000
                          ? 'rgba(248,113,113,.85)'
                          : (q.exec_ms ?? 0) > 60000
                            ? 'rgba(251,191,36,.85)'
                            : 'rgba(96,165,250,.85)',
                      ),
                      borderRadius: 4,
                    },
                  ],
                }}
                options={{
                  animation: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { type: logScale ? 'logarithmic' : 'linear', ticks: { color: '#6b7280' } },
                    x: { ticks: { color: '#6b7280', font: { size: 10 } } },
                  },
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="card p-4">
                <div className="sl mb-2">Configuração PostgreSQL</div>
                <div className="text-xs mono max-h-56 overflow-y-auto">
                  {Object.entries(detail.pg_config).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-0.5 border-b border-gray-800/40">
                      <span className="text-blue-400">{k}</span>
                      <span className="text-gray-300">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {detail.hw_metrics?.summary && (
                <div className="card p-4">
                  <div className="sl mb-2">Hardware durante a tarefa</div>
                  <div className="text-xs mono space-y-1">
                    <Row k="CPU médio" v={`${detail.hw_metrics.summary.cpu_percent_avg?.toFixed(1) ?? '–'}%`} />
                    <Row k="CPU máx" v={`${detail.hw_metrics.summary.cpu_percent_max?.toFixed(1) ?? '–'}%`} />
                    <Row k="Temp. média" v={`${detail.hw_metrics.summary.cpu_temp_tctl_c_avg?.toFixed(1) ?? '–'} °C`} />
                    <Row k="RAM média" v={`${detail.hw_metrics.summary.mem_percent_avg?.toFixed(1) ?? '–'}%`} />
                    <Row k="Amostras" v={`${detail.hw_metrics.summary.n_samples ?? '–'}`} />
                  </div>
                </div>
              )}
            </div>

            <div className="card overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-900 text-gray-500 uppercase text-[10px]">
                  <tr>
                    <th className="text-left px-4 py-2">Query</th>
                    <th className="text-left px-4 py-2">Nome</th>
                    <th className="text-left px-4 py-2">exec_ms</th>
                    <th className="text-left px-4 py-2">Cache Hit</th>
                    <th className="text-left px-4 py-2">Shared Read</th>
                    <th className="text-left px-4 py-2">Spill</th>
                    <th className="text-left px-4 py-2">OK</th>
                  </tr>
                </thead>
                <tbody>
                  {(bm?.queries ?? []).map((q) => (
                    <tr key={q.id} className="border-t border-gray-800/30">
                      <td className="px-4 py-2 mono font-bold text-gray-500">Q{q.id}</td>
                      <td className="px-4 py-2 text-gray-400">{q.name ?? '–'}</td>
                      <td className={`px-4 py-2 mono ${(q.exec_ms ?? 0) > 60000 ? 'text-red-400 font-bold' : 'text-gray-200'}`}>
                        {fmtMs(q.exec_ms)}
                      </td>
                      <td className="px-4 py-2 text-gray-500">{q.cache_hit_ratio != null ? `${q.cache_hit_ratio}%` : '–'}</td>
                      <td className="px-4 py-2 mono text-gray-600">{q.shared_read?.toLocaleString('pt-BR') ?? '–'}</td>
                      <td className="px-4 py-2">
                        {(q.temp_written_blocks ?? 0) > 0 ? (
                          <span className="text-orange-400">{q.temp_written_blocks}</span>
                        ) : (
                          '–'
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {q.success ? <span className="text-green-400">✓</span> : <span className="text-red-400">✗</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card p-4">
      <div className={`sv ${color}`}>{value}</div>
      <div className="sl">{label}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{k}</span>
      <span className="text-gray-300">{v}</span>
    </div>
  );
}
