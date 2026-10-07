import Image from "next/image";
import { StatusBadge } from "@/components/ui/status-badge";
import type { ConnectionStatus, Vehicle } from "@/features/vehicle/types";

const connectionLabels = {
  connected: { label: "연결됨", tone: "success" },
  disconnected: { label: "연결 끊김", tone: "warning" },
  unknown: { label: "상태 확인 불가", tone: "neutral" },
} as const satisfies Record<ConnectionStatus, { label: string; tone: "success" | "warning" | "neutral" }>;

export function VehicleCard({ vehicle, onShowDetails }: { vehicle: Vehicle; onShowDetails: () => void }) {
  const connection = connectionLabels[vehicle.connectionStatus];
  const energy = vehicle.powertrain === "electric" ? vehicle.batteryPercent : vehicle.fuelPercent;
  const energyLabel = vehicle.powertrain === "electric" ? "배터리 잔량" : "연료 잔량";

  return (
    <article className="vehicle-card" aria-labelledby={`vehicle-${vehicle.id}`}>
      <div className="vehicle-identity">
        <span className="powertrain-label">{vehicle.powertrain === "electric" ? "전기차" : "가솔린"}</span>
        <h2 id={`vehicle-${vehicle.id}`}>{vehicle.modelName}</h2>
        <p className="vehicle-trim">{vehicle.trim}</p>
        <StatusBadge tone={connection.tone}>{connection.label}</StatusBadge>
      </div>
      <div className="vehicle-image">
        <Image src={vehicle.image.src} alt={vehicle.image.alt} width={960} height={640} loading="eager" sizes="(max-width: 700px) 90vw, 720px" />
      </div>
      <div className="vehicle-energy">
        <dl className="vehicle-metrics">
          <div><dt>{energyLabel}</dt><dd>{energy === null ? <span className="metric-unavailable">확인 불가</span> : <>{energy}<span className="metric-unit">%</span></>}</dd></div>
          <div><dt>주행 가능 거리</dt><dd>{vehicle.rangeKm === null ? <span className="metric-unavailable">확인 불가</span> : <>{vehicle.rangeKm}<span className="metric-unit">km</span></>}</dd></div>
        </dl>
        {energy !== null && <div className={`energy-track energy-${vehicle.powertrain}`} role="meter" aria-label={`${vehicle.modelName} ${energyLabel}`} aria-valuenow={energy} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${energy}%` }} /></div>}
        <p className="energy-caption">{vehicle.connectionStatus === "connected" ? "최근 동기화 기준 예상 주행 거리" : "연결이 끊겨 마지막 동기화 정보를 표시합니다."}</p>
        <button className="vehicle-details-link" type="button" onClick={onShowDetails} aria-haspopup="dialog">차량 정보 자세히 보기 <span aria-hidden="true">↗</span></button>
      </div>
    </article>
  );
}
