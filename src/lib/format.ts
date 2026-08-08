import type { Tier } from '../api/types';

/** Formata milissegundos como string legivel (ex: "1.2s", "350ms", "2m 5s"). */
export function fmtMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return '–';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return fmtDur(ms / 1000);
}

/** Formata segundos como "1h 23m 45s" (omite unidades zeradas a esquerda). */
export function fmtDur(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '–';
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/** Estima tempo restante dado progresso decorrido. */
export function fmtEta(elapsedS: number, done: number, total: number): string {
  if (done <= 0) return '–';
  const rate = elapsedS / done;
  const remaining = Math.max(0, total - done);
  return fmtDur(rate * remaining);
}

export function tierCls(tier: Tier | string): string {
  switch (tier) {
    case 'low':
      return 'tier-low';
    case 'medium':
      return 'tier-medium';
    case 'high':
      return 'tier-high';
    default:
      return '';
  }
}
