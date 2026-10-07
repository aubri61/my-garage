import { ServiceIcon } from "@/components/ui/service-icon";
import { ServiceAction } from "@/components/ui/service-action";
import type { UpdateSummary } from "@/features/updates/types";

type SoftwareUpdateCardProps = {
  summary: UpdateSummary | undefined;
  vehicleName: string;
  available: boolean;
};

export function SoftwareUpdateCard({ summary, vehicleName, available }: SoftwareUpdateCardProps) {
  const total = summary ? summary.securityUpdateCount + summary.softwareUpdateCount : null;
  const updateId = summary?.latestUpdateId;
  const action = {
    href: updateId ? `/updates/${encodeURIComponent(updateId)}` : "/updates",
    available: available && !!updateId,
  };

  return (
    <section id="updates" className="primary-service update-service" aria-labelledby="updates-title">
      <div className="service-heading"><span className="service-icon"><ServiceIcon name="shield" /></span><div><p className="service-kicker">{vehicleName}</p><h2 id="updates-title">소프트웨어 업데이트</h2></div></div>
      <p className="service-description">설치 전 배포 주체와 파일 무결성, 디지털 서명을 확인합니다.</p>
      {summary ? (
        total === 0 ? <p className="service-empty">대기 중인 업데이트가 없습니다.</p> :
          <dl className="update-counts">
            <div><dt>보안 업데이트</dt><dd>{summary.securityUpdateCount}<span>개</span></dd></div>
            <div><dt>소프트웨어 업데이트</dt><dd>{summary.softwareUpdateCount}<span>개</span></dd></div>
          </dl>
      ) : <p className="service-empty">업데이트 정보를 확인할 수 없습니다.</p>}
      <div className="service-footer">
        <ServiceAction target={action} descriptionId="update-action-description">업데이트 확인</ServiceAction>
        {!action.available && <p id="update-action-description" className="action-note">{total === 0 ? "새 업데이트가 배포되면 확인할 수 있습니다." : "업데이트 상세 조회 제공 예정"}</p>}
      </div>
    </section>
  );
}
