import Image from "next/image";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ConnectionStatus, Vehicle } from "@/features/vehicle/types";

const connectionLabels = {
  connected: { label: "연결됨", tone: "success" },
  disconnected: { label: "연결 끊김", tone: "warning" },
  unknown: { label: "상태 확인 불가", tone: "neutral" },
} as const satisfies Record<ConnectionStatus, { label: string; tone: "success" | "warning" | "neutral" }>;

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const connection = connectionLabels[vehicle.connectionStatus];
  const energy = vehicle.powertrain === "electric" ? vehicle.batteryPercent : vehicle.fuelPercent;
  const energyLabel = vehicle.powertrain === "electric" ? "배터리 잔량" : "연료 잔량";

  return (
    <article className="vehicle-card" aria-labelledby={`vehicle-${vehicle.id}`}>
      <div className="vehicle-topline"><span className="powertrain-label">{vehicle.powertrain === "electric" ? "전기차" : "가솔린"}</span><StatusBadge tone={connection.tone}>{connection.label}</StatusBadge></div>
      <div className="vehicle-image"><Image src={vehicle.image.src} alt={vehicle.image.alt} width={640} height={320} loading="eager" sizes="(max-width: 700px) 100vw, (max-width: 1050px) 50vw, 33vw" /></div>
      <h3 id={`vehicle-${vehicle.id}`}>{vehicle.modelName}</h3>
      <p className="vehicle-trim">{vehicle.trim}</p>
      <dl className="vehicle-metrics">
        <div><dt>{energyLabel}</dt><dd>{energy === null ? <span className="metric-unavailable">확인 불가</span> : <>{energy}<span className="metric-unit">%</span></>}</dd></div>
        <div><dt>주행 가능 거리</dt><dd>{vehicle.rangeKm === null ? <span className="metric-unavailable">확인 불가</span> : <>{vehicle.rangeKm}<span className="metric-unit">km</span></>}</dd></div>
      </dl>
      {energy !== null && <div className={`energy-track energy-${vehicle.powertrain}`} role="meter" aria-label={`${vehicle.modelName} ${energyLabel}`} aria-valuenow={energy} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${energy}%` }} /></div>}
      <dl className="vehicle-software"><div><dt>소프트웨어 버전</dt><dd>{vehicle.softwareVersion}</dd></div></dl>
      {vehicle.connectionStatus !== "connected" && <p className="connection-note">마지막으로 확인된 차량 상태입니다.</p>}
    </article>
  );
}
