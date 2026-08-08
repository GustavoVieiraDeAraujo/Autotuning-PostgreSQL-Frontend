import { useMemo, useState } from 'react';
import type { Task, TaskStatus } from '../../api/types';
import { fmtDur, tierCls } from '../../lib/format';

interface Props {
  tasks: Task[];
}

const ABANDONED_LABELS: Record<string, string> = {
  invalid_config: 'Config inválida',
  timeout: 'Timeout',
  max_retries: 'Falha de infra',
};

const FILTERS: Array<{ key: TaskStatus | 'all'; label: string }> = [
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Pendentes' },
  { key: 'running', label: 'Executando' },
  { key: 'done', label: 'Concluídas' },
  { key: 'abandoned', label: 'Abandonadas' },
];

export function QueuePane({ tasks }: Props) {
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');

  const counts = useMemo(() => {
    const c = { pending: 0, running: 0, done: 0, abandoned: 0 };
    for (const t of tasks) {
      if (t.status in c) c[t.status as keyof typeof c]++;
    }
    return c;
  }, [tasks]);

  const visible = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);
  const total = tasks.length;

  return (
    <div className="pane pane-queue p-5">
      <div className="grid grid-cols-4 gap-4 mb-4 shrink-0">
        <StatCard label="Pendentes" value={counts.pending} color="text-gray-300" />
        <StatCard label="Executando" value={counts.running} color="text-amber-400" />
        <StatCard label="Concluídas" value={counts.done} color="text-emerald-400" />
        <StatCard label="Abandonadas" value={counts.abandoned} color="text-orange-400" />
      </div>

      <div className="card p-4 mb-4 shrink-0">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-gray-500 uppercase tracking-wide font-semibold">Progresso</span>
          <span className="text-gray-400">
            {counts.done} de {total} ({total > 0 ? ((counts.done / total) * 100).toFixed(1) : '0.0'}%)
          </span>
        </div>
        <div className="prog">
          <div
            className="prog-fill green-fill"
            style={{ width: total > 0 ? `${(counts.done / total) * 100}%` : '0%' }}
          />
        </div>
        <div className="flex gap-2 mt-3">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`btn btn-sm ${filter === f.key ? 'btn-active' : 'btn-ghost'}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="queue-table-wrap">
        <div className="card overflow-hidden">
          <div className="tbl-scroll-inner">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-900 text-gray-500 uppercase text-[10px] tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2">ID</th>
                  <th className="text-left px-4 py-2">Tier</th>
                  <th className="text-left px-4 py-2">Combo</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">TPC-H</th>
                  <th className="text-left px-4 py-2">TPC-DS</th>
                  <th className="text-left px-4 py-2">Duração</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr key={t.id} className={t.status === 'running' ? 'row-running' : ''}>
                    <td className="px-4 py-2 mono">{t.id}</td>
                    <td className={`px-4 py-2 font-semibold ${tierCls(t.tier)}`}>{t.tier}</td>
                    <td className="px-4 py-2 mono text-gray-400">{t.combination}</td>
                    <td className="px-4 py-2">
                      <span className={`badge badge-${t.status}`}>
                        {t.status}
                        {t.status === 'abandoned' && t.abandoned_reason && (
                          <span> — {ABANDONED_LABELS[t.abandoned_reason] ?? t.abandoned_reason}</span>
                        )}
                      </span>
                      {t.retry_count > 0 && (
                        <span className="ml-1 text-gray-500" title={t.error ?? undefined}>
                          ({t.retry_count}×)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 mono text-gray-400">
                      {t.result?.tpc_h_n_success != null ? `${t.result.tpc_h_n_success}/20` : '–'}
                    </td>
                    <td className="px-4 py-2 mono text-gray-400">
                      {t.result?.tpc_ds_n_success != null ? `${t.result.tpc_ds_n_success}/98` : '–'}
                    </td>
                    <td className="px-4 py-2 mono text-gray-500">{fmtDur(t.result?.duration_s)}</td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-600 py-6">
                      Nenhuma tarefa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card p-4">
      <div className={`sv ${color}`}>{value}</div>
      <div className="sl">{label}</div>
    </div>
  );
}
