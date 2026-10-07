import { ServiceIcon } from "@/components/ui/service-icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { ServiceAction, type ServiceActionTarget } from "@/components/ui/service-action";
import type { ChargingEligibility } from "@/features/charging/types";

export function ChargingReservationCard({ eligibility, action }: { eligibility: ChargingEligibility; action: ServiceActionTarget }) {
  return (
    <section id="charging" className="primary-service charging-service" aria-labelledby="charging-title">
      <div className="service-kicker"><ServiceIcon name="charging" /><span>다음 주행을 위한 충전</span></div>
      <h2 id="charging-title">전기차 충전 예약</h2>
      <p className="service-description">주변 충전소를 검색하고 충전기와 시간대를<br className="desktop-break" /> 선택해 예약할 수 있습니다.</p>
      <dl className="charging-details"><div><dt>멤버십 상태</dt><dd><StatusBadge tone={eligibility.membership === "active" ? "success" : "neutral"}>{eligibility.membership === "active" ? "이용 중" : "미가입"}</StatusBadge></dd></div><div><dt>예약 가능 여부</dt><dd><StatusBadge tone={eligibility.canReserve ? "success" : "warning"}>{eligibility.canReserve ? "예약 가능" : "예약 불가"}</StatusBadge></dd></div></dl>
      <p className="charging-note">{eligibility.canReserve ? "충전기와 시간대 선택 후 예약 권한을 확인합니다." : eligibility.reason}</p>
      <div className="service-footer"><ServiceAction target={action} descriptionId="charging-action-description">충전소 찾기</ServiceAction>{!action.available && <p id="charging-action-description" className="action-note">충전소 검색 제공 예정</p>}</div>
    </section>
  );
}
