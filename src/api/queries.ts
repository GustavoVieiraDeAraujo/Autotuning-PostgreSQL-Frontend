import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from './client';
import type {
  ImagesStatus,
  ProcessStatus,
  ResultListEntry,
  ServerInfo,
  Task,
  TaskResultDetail,
  HwSnapshot,
} from './types';

// ── Fila — poll a cada 3s, independente da aba ativa ──────────────────────
export function useQueueQuery() {
  return useQuery({
    queryKey: ['queue'],
    queryFn: () => apiGet<Task[]>('/api/queue'),
    refetchInterval: 3000,
  });
}

// ── Status combinado dos 3 processos + imagens — poll a cada 3s ──────────
export interface CombinedStatus {
  generator: ProcessStatus;
  prepare: ProcessStatus;
  runner: ProcessStatus;
  images: ImagesStatus;
}

export function useProcessStatusQuery() {
  return useQuery({
    queryKey: ['status'],
    queryFn: async (): Promise<CombinedStatus> => {
      const [generator, prepare, runner, images] = await Promise.all([
        apiGet<ProcessStatus>('/api/generator/status'),
        apiGet<ProcessStatus>('/api/prepare/status'),
        apiGet<ProcessStatus>('/api/runner/status'),
        apiGet<ImagesStatus>('/api/images/status'),
      ]);
      return { generator, prepare, runner, images };
    },
    refetchInterval: 3000,
  });
}

// ── Metricas de hardware — poll a cada 1s, sempre ativo (nao so na aba Hardware) ──
export function useHwMetricsQuery() {
  return useQuery({
    queryKey: ['hw-metrics'],
    queryFn: () => apiGet<HwSnapshot>('/api/metrics'),
    refetchInterval: 1000,
  });
}

// ── Info estatica do servidor — busca uma vez so ──────────────────────────
export function useServerInfoQuery() {
  return useQuery({
    queryKey: ['server-info'],
    queryFn: () => apiGet<ServerInfo>('/api/server-info'),
    staleTime: Infinity,
  });
}

// ── Resultados ─────────────────────────────────────────────────────────────
export function useResultsListQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['results-list'],
    queryFn: async () => (await apiGet<{ files: ResultListEntry[] }>('/api/results/list')).files,
    enabled,
  });
}

export function useResultDetailQuery(tier: string | null, combo: string | null, taskId: number | null) {
  return useQuery({
    queryKey: ['result-detail', tier, combo, taskId],
    queryFn: () => apiGet<TaskResultDetail>(`/api/results/${tier}/${combo}/${taskId}`),
    enabled: tier !== null && combo !== null && taskId !== null,
  });
}

// ── Mutations de controle ─────────────────────────────────────────────────
function useInvalidateStatus() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['status'] });
    qc.invalidateQueries({ queryKey: ['queue'] });
  };
}

export function useGeneratorStart() {
  const invalidate = useInvalidateStatus();
  return useMutation({
    mutationFn: (args: { nConfigs: number; seed?: number }) =>
      apiPost('/api/generator/start', { nConfigs: args.nConfigs, seed: args.seed }),
    onSuccess: invalidate,
  });
}

export function useGeneratorStop() {
  const invalidate = useInvalidateStatus();
  return useMutation({ mutationFn: () => apiPost('/api/generator/stop'), onSuccess: invalidate });
}

export function usePrepareStart() {
  const invalidate = useInvalidateStatus();
  return useMutation({
    mutationFn: (force: boolean) => apiPost('/api/prepare/start', { force }),
    onSuccess: invalidate,
  });
}

export function usePrepareStop() {
  const invalidate = useInvalidateStatus();
  return useMutation({ mutationFn: () => apiPost('/api/prepare/stop'), onSuccess: invalidate });
}

export function useRunnerStart() {
  const invalidate = useInvalidateStatus();
  return useMutation({ mutationFn: () => apiPost('/api/runner/start'), onSuccess: invalidate });
}

export function useRunnerStop() {
  const invalidate = useInvalidateStatus();
  return useMutation({ mutationFn: () => apiPost('/api/runner/stop'), onSuccess: invalidate });
}

export function useResetAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiPost('/api/reset'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['status'] });
      qc.invalidateQueries({ queryKey: ['queue'] });
      qc.invalidateQueries({ queryKey: ['results-list'] });
    },
  });
}
