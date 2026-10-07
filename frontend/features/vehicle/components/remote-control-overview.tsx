import { ServiceIcon } from "@/components/ui/service-icon";
import type { Vehicle } from "@/features/vehicle/types";

export function RemoteControlOverview({ vehicle }: { vehicle: Vehicle }) {
  const connected = vehicle.connectionStatus === "connected";

  return (
    <section id="controls" className="remote-controls" aria-labelledby="controls-title">
      <div className="section-heading"><h2 id="controls-title">원격 제어</h2><span className="section-caption">{vehicle.modelName}</span></div>
      <div className="control-grid">
        <button type="button" className="control-tile" disabled aria-describedby="control-availability">
          <ServiceIcon name="climate" /><span className="control-label">공조 제어</span><span className="control-detail">{vehicle.climateStatus === "unknown" ? "상태 확인 불가" : `${connected ? "현재" : "마지막 확인"} ${vehicle.climateStatus === "on" ? "작동 중" : "꺼짐"}`}</span>
        </button>
        <button type="button" className="control-tile" disabled aria-describedby="control-availability">
          <ServiceIcon name="lock" /><span className="control-label">문 잠금 / 잠금 해제</span><span className="control-detail">{vehicle.doorStatus === "unknown" ? "상태 확인 불가" : `${connected ? "현재" : "마지막 확인"} ${vehicle.doorStatus === "locked" ? "잠김" : "잠금 해제"}`}</span>
        </button>
      </div>
      <p id="control-availability" className={connected ? "control-note" : "connection-note"}>{connected ? "공조 설정과 도어 제어 기능은 제공 예정입니다." : "차량 연결이 끊겨 원격 제어를 사용할 수 없습니다."}</p>
    </section>
  );
}
