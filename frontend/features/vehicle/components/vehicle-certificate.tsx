import type { VehicleCertificate, VehicleIdentity } from "@/features/vehicle/types";

const formatter = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
export function VehicleCertificateDetails({ identity, certificate }: { identity: VehicleIdentity; certificate: VehicleCertificate }) {
  return <section className="certificate-details" aria-label="디지털 차량 인증서">
    <h3>디지털 차량 인증서 <span className="demo-label">데모</span></h3>
    <dl className="status-details">
      <div><dt>상태</dt><dd>{certificate.status === "valid" ? "유효 (데모)" : certificate.status === "expiring" ? "만료 임박 (데모)" : "만료 (데모)"}</dd></div>
      <div><dt>차량 식별 ID</dt><dd>{identity.id}</dd></div>
      <div><dt>발급일</dt><dd>{formatter.format(new Date(certificate.issuedAt))}</dd></div>
      <div><dt>만료일</dt><dd>{formatter.format(new Date(certificate.expiresAt))}</dd></div>
    </dl>
    <p className="field-hint">발급 흐름을 설명하는 예시 정보입니다. 실제 인증서·키 생성이나 암호학적 검증은 수행하지 않았습니다.</p>
  </section>;
}
