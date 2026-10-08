import { VehicleCertificateDetails } from "@/features/vehicle/components/vehicle-certificate";
import { ServiceIcon } from "@/components/ui/service-icon";
import type { Vehicle } from "@/features/vehicle/types";

const syncFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
});

export function VehicleStatus({ vehicle }: { vehicle: Vehicle }) {
  const syncTime = vehicle.lastSyncedAt ? new Date(vehicle.lastSyncedAt) : null;
  const validSyncTime = syncTime && !Number.isNaN(syncTime.getTime());

  return (
    <section className="vehicle-status" aria-labelledby="vehicle-status-title">
      <div className="section-heading"><h2 id="vehicle-status-title">차량 상태</h2><ServiceIcon name="vehicle" /></div>
      <dl className="status-details">
        <div><dt>도어</dt><dd>{vehicle.doorStatus === "locked" ? "잠김" : vehicle.doorStatus === "unlocked" ? "잠금 해제" : "확인 불가"}</dd></div>
        <div><dt>공조</dt><dd>{vehicle.climateStatus === "on" ? "작동 중" : vehicle.climateStatus === "off" ? "꺼짐" : "확인 불가"}</dd></div>
        <div><dt>누적 주행거리</dt><dd>{vehicle.odometerKm === null ? "확인 불가" : `${vehicle.odometerKm.toLocaleString("ko-KR")} km`}</dd></div>
        <div><dt>소프트웨어 버전</dt><dd>{vehicle.softwareVersion}</dd></div>
      </dl>
      <p className="sync-time">마지막 동기화 · {validSyncTime ? <time dateTime={vehicle.lastSyncedAt!}>{syncFormatter.format(syncTime)}</time> : "확인 불가"}</p>
      {vehicle.connectionStatus !== "connected" && <p className="connection-note">현재 상태는 차량이 다시 연결된 후 확인할 수 있습니다.</p>}
      {vehicle.registrationStatus === "registered" && vehicle.identity && vehicle.certificate && <VehicleCertificateDetails identity={vehicle.identity} certificate={vehicle.certificate} />}
    </section>
  );
}
