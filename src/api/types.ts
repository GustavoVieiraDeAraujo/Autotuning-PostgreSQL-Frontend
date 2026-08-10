// Tipos escritos a mao, batendo com o JSON real produzido pelo backend
// (verificado endpoint por endpoint durante a reescrita em Java/Spring):
// a superficie e pequena o suficiente pra nao justificar geracao via OpenAPI.

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'abandoned';
export type AbandonedReason = 'invalid_config' | 'timeout' | 'max_retries' | null;
export type Tier = 'low' | 'medium' | 'high';

export interface TaskResultSummary {
  tpc_h_n_success?: number;
  tpc_h_n_failed?: number;
  tpc_h_total_ms?: number;
  tpc_ds_n_success?: number;
  tpc_ds_n_failed?: number;
  tpc_ds_total_ms?: number;
  duration_s?: number;
}

export interface Task {
  id: number;
  combination: string;
  tier: Tier;
  config: Record<string, unknown>;
  repetition: number;
  status: TaskStatus;
  retry_count: number;
  abandoned_reason: AbandonedReason;
  error: string | null;
  result: TaskResultSummary | null;
}

export interface ProcessStatus {
  running: boolean;
  pid: number | null;
}

export interface ImagesStatus {
  ready: boolean;
  images: Record<string, boolean>;
  error?: string;
}

export interface ResultListEntry {
  task_id: number;
  tier: Tier;
  combo: string;
}

export interface QueryResult {
  id: number;
  name?: string;
  success: boolean;
  failure_reason: string;
  error?: string | null;
  exec_ms: number | null;
  wall_ms?: number;
  rows?: number;
  shared_hit?: number;
  shared_read?: number;
  shared_written?: number;
  shared_dirtied?: number;
  temp_read_blocks?: number;
  temp_written_blocks?: number;
  cache_hit_ratio?: number | null;
  workers_planned?: number | null;
  workers_launched?: number | null;
}

export interface BenchmarkSummary {
  geo_mean_exec_ms?: number;
  overall_cache_hit_ratio?: number;
  queries_with_spill?: number;
  queries_with_parallelism?: number;
  total_exec_ms?: number;
  median_exec_ms?: number;
  p95_exec_ms?: number;
  max_exec_ms?: number;
  min_exec_ms?: number;
  stddev_exec_ms?: number;
  n_queries_successful?: number;
  n_queries_timed_out?: number;
  n_queries_oom?: number;
}

export interface BenchmarkResult {
  queries: QueryResult[];
  summary: BenchmarkSummary | null;
  n_success: number;
  n_failed: number;
  total_ms: number | null;
}

export interface HwMetricsSummary {
  cpu_percent_avg?: number;
  cpu_percent_max?: number;
  cpu_temp_tctl_c_avg?: number;
  cpu_temp_tctl_c_max?: number;
  mem_percent_avg?: number;
  mem_percent_max?: number;
  disk_read_mb_s_avg?: number;
  disk_write_mb_s_avg?: number;
  rapl_energy_total_j?: number;
  rapl_avg_power_w?: number;
  n_samples?: number;
  duration_s?: number;
}

export interface TaskResultDetail {
  task_id: number;
  tier: Tier;
  combination: string;
  status: TaskStatus;
  abandoned_reason: AbandonedReason;
  error: string | null;
  pg_config: Record<string, unknown>;
  started_at: string | null;
  finished_at: string | null;
  duration_s: number | null;
  tpc_h: BenchmarkResult;
  tpc_ds: BenchmarkResult;
  hw_metrics: { summary: HwMetricsSummary | null } | null;
}

export interface HwSnapshot {
  timestamp_s: number;
  cpu_percent: number | null;
  cpu_freq_mhz: number | null;
  cpu_temp_sensor: string;
  cpu_temp_tctl_c: number | null;
  cpu_temp_cores_c: (number | null)[];
  mem_used_gb: number;
  mem_avail_gb: number;
  mem_percent: number;
  ram_temps_c: (number | null)[];
  disk_read_mb_s: number | null;
  disk_write_mb_s: number | null;
  nvme_temps_c: (number | null)[];
  gpu_edge_c: number | null;
  gpu_junction_c: number | null;
  gpu_mem_c: number | null;
  acpitz_temp_c: number | null;
  wifi_temp_c: number | null;
  rapl_energy_uj: number | null;
}

export interface SensorsInfo {
  cpu_sensor: string;
  has_cpu_cores: boolean;
  n_cpu_cores: number;
  n_nvme: number;
  has_ram_temp: boolean;
  has_gpu: boolean;
  cpu_core_ids: string[];
  nvme_ids: string[];
  ram_ids: string[];
  gpu_ids: string[];
}

export interface ServerInfo {
  cpu_model: string;
  cpu_physical: number;
  cpu_logical: number;
  mem_total_gb: number;
  sensors: SensorsInfo;
}
