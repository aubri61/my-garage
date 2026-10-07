import { ServiceIcon } from "@/components/ui/service-icon";
import { ServiceAction, type ServiceActionTarget } from "@/components/ui/service-action";
import type { UpdateSummary } from "@/features/updates/types";

export function SoftwareUpdateCard({ summary, action }: { summary: UpdateSummary; action: ServiceActionTarget }) {
  return (
    <section id="updates" className="primary-service update-service" aria-labelledby="updates-title">
      <div className="service-kicker"><ServiceIcon name="shield" /><span>신뢰할 수 있는 차량 소프트웨어</span></div>
      <h2 id="updates-title">차량 소프트웨어 업데이트</h2>
      <p className="service-description">배포 주체와 파일 무결성, 디지털 서명을 검증해<br className="desktop-break" /> 신뢰할 수 있는 업데이트만 안전하게 설치합니다.</p>
      <dl className="update-counts"><div><dt>보안 업데이트</dt><dd>{summary.securityUpdateCount}<span>개</span></dd></div><div><dt>소프트웨어 업데이트</dt><dd>{summary.softwareUpdateCount}<span>개</span></dd></div></dl>
      <div className="verification-preview"><span className="verification-marker" aria-hidden="true">◇</span><p>배포 주체 · 인증서 · 파일 무결성 · 디지털 서명<br /><span>설치 전 4단계 보안 검증</span></p></div>
      <div className="service-footer"><ServiceAction target={action} descriptionId="update-action-description">업데이트 확인</ServiceAction>{!action.available && <p id="update-action-description" className="action-note">상세 조회 제공 예정</p>}</div>
    </section>
  );
}
