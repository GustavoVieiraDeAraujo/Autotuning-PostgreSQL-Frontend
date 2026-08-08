import type { HwSnapshot } from '../../api/types';

interface Props {
  hw: HwSnapshot | undefined;
}

function stat(label: string, value: string) {
  return (
    <span>
      <span className="text-gray-500">{label}</span>{' '}
      <span className="mono font-semibold text-gray-200">{value}</span>
    </span>
  );
}

export function Header({ hw }: Props) {
  return (
    <header className="flex items-center justify-between px-5 py-3 border-b border-gray-800">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">
          P
        </div>
        <div>
          <div className="font-semibold text-sm leading-tight">PostgreSQL Autotuning</div>
          <div className="text-xs text-gray-500 leading-tight">Benchmarks TPC-H e TPC-DS</div>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-4 mono text-xs bg-gray-900 border border-gray-800 rounded-lg px-4 py-1.5">
        {stat('CPU', hw ? `${hw.cpu_percent?.toFixed(1) ?? '–'}%` : '–')}
        <span className="text-gray-700">·</span>
        {stat('', hw?.cpu_temp_tctl_c != null ? `${hw.cpu_temp_tctl_c.toFixed(1)} °C` : '–')}
        <span className="text-gray-700">|</span>
        {stat('RAM', hw ? `${hw.mem_percent.toFixed(1)}%` : '–')}
        <span className="text-gray-700">|</span>
        {stat('DISK R', hw?.disk_read_mb_s != null ? `${hw.disk_read_mb_s.toFixed(2)} MB/s` : '–')}
        {stat('W', hw?.disk_write_mb_s != null ? `${hw.disk_write_mb_s.toFixed(2)} MB/s` : '–')}
      </div>
    </header>
  );
}
