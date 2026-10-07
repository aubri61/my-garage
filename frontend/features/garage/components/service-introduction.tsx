import { ServiceIcon } from "@/components/ui/service-icon";

export function ServiceIntroduction() {
  return (
    <section className="service-introduction" aria-labelledby="introduction-title">
      <div className="introduction-copy"><h2 id="introduction-title">My Garage란?</h2><p>My Garage는 차량 상태, 보안이 검증된 소프트웨어 업데이트,<br className="desktop-break" /> 전기차 충전소 검색과 예약을 한 곳에서 제공하는<br className="desktop-break" /> 디지털 차량 관리 서비스입니다.</p></div>
      <div className="introduction-features">
        <div><ServiceIcon name="vehicle" /><h3>차량 관리</h3><p>내 차량의 상태를 한눈에</p></div>
        <div><ServiceIcon name="shield" /><h3>안전한 업데이트</h3><p>설치 전 신뢰성과 무결성 검증</p></div>
        <div><ServiceIcon name="charging" /><h3>충전 예약</h3><p>검색부터 예약 권한 확인까지</p></div>
      </div>
    </section>
  );
}
