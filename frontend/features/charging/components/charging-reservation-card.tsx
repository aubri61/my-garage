import { ServiceIcon } from "@/components/ui/service-icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { ServiceAction, type ServiceActionTarget } from "@/components/ui/service-action";
import type { ChargingEligibility } from "@/features/charging/types";
import type { ChargingStatus, Vehicle } from "@/features/vehicle/types";

const chargingLabels: Record<ChargingStatus, string> = {
  unplugged: "충전기 연결 안 됨",
  connected: "충전 대기",
  charging: "충전 중",
  complete: "충전 완료",
  unknown: "상태 확인 불가",
};

type ChargingReservationCardProps = {
  vehicle: Extract<Vehicle, { powertrain: "electric" }>;
  eligibility: ChargingEligibility;
  action: ServiceActionTarget;
};

export function ChargingReservationCard({ vehicle, eligibility, action }: ChargingReservationCardProps) {
  return (
    <section id="charging" className="primary-service charging-service" aria-labelledby="charging-title">
      <div className="service-heading"><span className="service-icon"><ServiceIcon name="charging" /></span><div><p className="service-kicker">{vehicle.modelName}</p><h2 id="charging-title">EV 충전</h2></div></div>
      <p className="service-description">충전 상태를 확인하고, 다음 충전을 준비하세요.</p>
      <dl className="charging-details">
        <div><dt>충전 상태</dt><dd>{chargingLabels[vehicle.chargingStatus]}</dd></div>
        <div><dt>목표 충전량</dt><dd>{vehicle.targetChargePercent}%</dd></div>
        <div><dt>멤버십</dt><dd><StatusBadge tone={eligibility.membership === "active" ? "success" : "neutral"}>{eligibility.membership === "active" ? "이용 중" : "미가입"}</StatusBadge></dd></div>
        <div><dt>충전 예약</dt><dd><StatusBadge tone={eligibility.canReserve ? "success" : "warning"}>{eligibility.canReserve ? "예약 가능" : "예약 불가"}</StatusBadge></dd></div>
      </dl>
      {!eligibility.canReserve && <p className="connection-note">{eligibility.reason}</p>}
      <div className="service-footer">
        <ServiceAction target={action} descriptionId="charging-action-description">충전소 찾기</ServiceAction>
        {!action.available && <p id="charging-action-description" className="action-note">충전소 검색 제공 예정</p>}
      </div>
    </section>
  );
}
