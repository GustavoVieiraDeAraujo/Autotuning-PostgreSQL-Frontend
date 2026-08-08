import { Fragment, useMemo, useState } from 'react';
import type { Task } from '../../api/types';
import { tierCls } from '../../lib/format';

interface Props {
  tasks: Task[];
}

export function ConfigsPane({ tasks }: Props) {
  const [tier, setTier] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [combo, setCombo] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const combos = useMemo(() => [...new Set(tasks.map((t) => t.combination))].sort(), [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (tier !== 'all' && t.tier !== tier) return false;
      if (combo !== 'all' && t.combination !== combo) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches = Object.entries(t.config).some(
          ([k, v]) => k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q),
        );
        if (!matches) return false;
      }
      return true;
    });
  }, [tasks, tier, combo, search]);

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="pane pane-configs p-5">
      <div className="card p-4 mb-4 shrink-0 flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {(['all', 'low', 'medium', 'high'] as const).map((t) => (
            <button
              key={t}
              className={`btn btn-sm ${tier === t ? 'btn-active' : 'btn-ghost'} ${t !== 'all' ? tierCls(t) : ''}`}
              onClick={() => setTier(t)}
            >
              {t === 'all' ? 'Todas' : t}
            </button>
          ))}
        </div>
        <select
          className="btn btn-sm btn-ghost"
          value={combo}
          onChange={(e) => setCombo(e.target.value)}
        >
          <option value="all">Todas as combinações</option>
          {combos.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          className="btn btn-sm btn-ghost flex-1 min-w-[160px]"
          placeholder="Buscar parâmetro ou valor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="text-xs text-gray-500 ml-auto">{filtered.length} config(s)</span>
      </div>

      <div className="configs-list-wrap">
        <div className="card overflow-hidden">
          <div className="tbl-scroll-inner">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-900 text-gray-500 uppercase text-[10px] tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2">ID</th>
                  <th className="text-left px-4 py-2">Tier</th>
                  <th className="text-left px-4 py-2">Combo</th>
                  <th className="text-left px-4 py-2"># Parâmetros</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <Fragment key={t.id}>
                    <tr className="cfg-row" onClick={() => toggle(t.id)}>
                      <td className="px-4 py-2 mono">{t.id}</td>
                      <td className={`px-4 py-2 font-semibold ${tierCls(t.tier)}`}>{t.tier}</td>
                      <td className="px-4 py-2 mono text-gray-400">{t.combination}</td>
                      <td className="px-4 py-2 text-gray-500">{Object.keys(t.config).length}</td>
                    </tr>
                    {expanded.has(t.id) && (
                      <tr>
                        <td colSpan={4} className="px-4 py-3 bg-gray-950/50">
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(t.config).map(([k, v]) => (
                              <span
                                key={k}
                                className="mono text-[11px] bg-gray-800/60 rounded px-2 py-1"
                              >
                                <span className="text-blue-400">{k}</span>=
                                <span className="text-gray-300">{String(v)}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-600 py-6">
                      Nenhuma configuração encontrada.
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
