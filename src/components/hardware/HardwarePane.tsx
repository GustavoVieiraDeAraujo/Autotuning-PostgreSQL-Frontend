import '../../lib/chartSetup';
import { useEffect, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';
import type { HwSnapshot, ServerInfo } from '../../api/types';

interface Props {
  hw: HwSnapshot | undefined;
  serverInfo: ServerInfo | undefined;
}

const HW_MAX = 30;

function colorFor(value: number | null | undefined, mid: number, hi: number): string {
  if (value == null) return 'text-gray-500';
  if (value >= hi) return 'text-red-400';
  if (value >= mid) return 'text-amber-400';
  return 'text-emerald-400';
}

function Gauge({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="card p-4">
      <div className={`sv ${color}`}>
        {value}
        <span className="text-sm ml-1 text-gray-500">{unit}</span>
      </div>
      <div className="sl">{label}</div>
    </div>
  );
}

export function HardwarePane({ hw, serverInfo }: Props) {
  const [labels, setLabels] = useState<string[]>([]);
  const [cpuData, setCpuData] = useState<number[]>([]);
  const [tempData, setTempData] = useState<number[]>([]);
  const lastTsRef = useRef<number>(0);

  useEffect(() => {
    if (!hw) return;
    // Evita duplicar amostra se o mesmo snapshot chegar de novo (poll sem mudanca)
    if (hw.timestamp_s === lastTsRef.current) return;
    lastTsRef.current = hw.timestamp_s;

    const label = new Date(hw.timestamp_s * 1000).toLocaleTimeString('pt-BR');
    setLabels((prev) => [...prev, label].slice(-HW_MAX));
    setCpuData((prev) => [...prev, hw.cpu_percent ?? 0].slice(-HW_MAX));
    setTempData((prev) => [...prev, hw.cpu_temp_tctl_c ?? 0].slice(-HW_MAX));
  }, [hw]);

  if (!hw) {
    return <div className="pane pane-hardware p-5 text-center text-gray-500">Carregando métricas...</div>;
  }

  const sensors = serverInfo?.sensors;

  return (
    <div className="pane pane-hardware p-5">
      <div className="grid grid-cols-4 gap-4 mb-5">
        <Gauge label="CPU" value={hw.cpu_percent?.toFixed(1) ?? '–'} unit="%" color={colorFor(hw.cpu_percent, 70, 90)} />
        <Gauge
          label="Temp. CPU"
          value={hw.cpu_temp_tctl_c?.toFixed(1) ?? '–'}
          unit="°C"
          color={colorFor(hw.cpu_temp_tctl_c, 75, 90)}
        />
        <Gauge label="RAM" value={hw.mem_percent.toFixed(1)} unit="%" color={colorFor(hw.mem_percent, 70, 90)} />
        <Gauge
          label="Freq. CPU"
          value={hw.cpu_freq_mhz?.toFixed(0) ?? '–'}
          unit="MHz"
          color="text-blue-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="card p-4">
          <div className="sl mb-2">CPU %: Último Minuto</div>
          <Line
            data={{
              labels,
              datasets: [{ data: cpuData, borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,.15)', fill: true, tension: 0.3, pointRadius: 0 }],
            }}
            options={{
              animation: false,
              scales: { y: { min: 0, max: 100, ticks: { color: '#6b7280' } }, x: { ticks: { display: false } } },
              plugins: { legend: { display: false } },
            }}
          />
        </div>
        <div className="card p-4">
          <div className="sl mb-2">Temperatura CPU: Último Minuto</div>
          <Line
            data={{
              labels,
              datasets: [{ data: tempData, borderColor: '#f472b6', backgroundColor: 'rgba(244,114,182,.15)', fill: true, tension: 0.3, pointRadius: 0 }],
            }}
            options={{
              animation: false,
              scales: { y: { ticks: { color: '#6b7280' } }, x: { ticks: { display: false } } },
              plugins: { legend: { display: false } },
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {sensors?.cpu_core_ids.map((id, i) => (
          <Gauge
            key={id}
            label={`Core ${i}`}
            value={hw.cpu_temp_cores_c[i]?.toFixed(1) ?? '–'}
            unit="°C"
            color={colorFor(hw.cpu_temp_cores_c[i], 75, 90)}
          />
        ))}
        {sensors?.nvme_ids.map((id, i) => (
          <Gauge
            key={id}
            label={`NVMe ${i + 1}`}
            value={hw.nvme_temps_c[i]?.toFixed(1) ?? '–'}
            unit="°C"
            color={colorFor(hw.nvme_temps_c[i], 55, 70)}
          />
        ))}
        {sensors?.ram_ids.map((id, i) => (
          <Gauge
            key={id}
            label={`RAM ${i + 1}`}
            value={hw.ram_temps_c[i]?.toFixed(1) ?? '–'}
            unit="°C"
            color={colorFor(hw.ram_temps_c[i], 60, 80)}
          />
        ))}
        {sensors?.has_gpu && (
          <Gauge label="GPU Edge" value={hw.gpu_edge_c?.toFixed(1) ?? '–'} unit="°C" color="text-violet-400" />
        )}
        <Gauge
          label="Disco Leitura"
          value={hw.disk_read_mb_s?.toFixed(1) ?? '–'}
          unit="MB/s"
          color={colorFor(hw.disk_read_mb_s, 30, 100)}
        />
        <Gauge
          label="Disco Escrita"
          value={hw.disk_write_mb_s?.toFixed(1) ?? '–'}
          unit="MB/s"
          color={colorFor(hw.disk_write_mb_s, 30, 100)}
        />
      </div>
    </div>
  );
}
