import { ServiceIcon } from "@/components/ui/service-icon";
import type { Vehicle } from "@/features/vehicle/types";

export type VehicleAction = "cooling" | "heating" | "doors" | "updates" | "charging";

type Props = {
  vehicle: Vehicle;
  updateCount: number | null;
  onSelectAction: (action: VehicleAction) => void;
};

export function RemoteControlOverview({ vehicle, updateCount, onSelectAction }: Props) {
  return (
    <section id="controls" className="remote-controls" aria-labelledby="controls-title">
      <div className="section-heading"><h2 id="controls-title">내 차 제어와 서비스</h2><span className="section-caption">{vehicle.modelName}</span></div>
      <div className="control-grid">
        <button type="button" className="control-tile" onClick={() => onSelectAction("cooling")} aria-haspopup="dialog"><ServiceIcon name="climate" /><span className="control-label">공조 켜기</span><span className="control-detail">온도 · 작동 시간</span></button>
        <button type="button" className="control-tile" onClick={() => onSelectAction("heating")} aria-haspopup="dialog"><ServiceIcon name="heating" /><span className="control-label">난방 켜기</span><span className="control-detail">따뜻한 실내 준비</span></button>
        <button type="button" className="control-tile" onClick={() => onSelectAction("doors")} aria-haspopup="dialog"><ServiceIcon name="lock" /><span className="control-label">문 잠금 해제</span><span className="control-detail">{vehicle.doorStatus === "locked" ? "도어 잠김" : vehicle.doorStatus === "unlocked" ? "도어 잠금 해제됨" : "상태 확인 불가"}</span></button>
        <button id="updates" type="button" className="control-tile service-tile" onClick={() => onSelectAction("updates")} aria-haspopup="dialog"><ServiceIcon name="shield" /><span className="control-label">업데이트</span><span className="control-detail">{updateCount === null ? "정보 확인 불가" : updateCount > 0 ? `${updateCount}개 업데이트 확인` : "최신 소프트웨어"}</span></button>
        <button type="button" className="control-tile service-tile" disabled={vehicle.powertrain !== "electric"} onClick={() => onSelectAction("charging")} aria-haspopup="dialog"><ServiceIcon name="charging" /><span className="control-label">충전</span><span className="control-detail">{vehicle.powertrain === "electric" ? "충전 상태 · 충전소" : "전기차 전용"}</span></button>
      </div>
      {vehicle.connectionStatus !== "connected" && <p className="connection-note">차량 연결이 끊겨 마지막 동기화 정보를 표시합니다. 원격 제어는 다시 연결한 후 사용할 수 있습니다.</p>}
    </section>
  );
}
