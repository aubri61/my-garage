import { ServiceIcon } from "@/components/ui/service-icon";

export function ServiceIntroduction() {
  return (
    <section className="service-introduction" aria-labelledby="introduction-title">
      <div className="introduction-copy">
        <h2 id="introduction-title">My Garage란?</h2>
        <p>차량 대여 신청과 계약 동의, 소유자 승인을 거친 가상 원격 접근을 연결하는 차량 공유 시뮬레이션입니다.</p>
      </div>
      <div className="introduction-features">
        <div><ServiceIcon name="vehicle" /><h3>차량 관리</h3><p>내 차의 상태와 원격 제어</p></div>
        <div><ServiceIcon name="shield" /><h3>안전한 업데이트</h3><p>설치 전 신뢰성과 무결성 검증</p></div>
        <div><ServiceIcon name="charging" /><h3>차량 공유</h3><p>대여 계약과 디지털 접근 권한</p></div>
      </div>
    </section>
  );
}
