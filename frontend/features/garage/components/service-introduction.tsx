import { ServiceIcon } from "@/components/ui/service-icon";

export function ServiceIntroduction() {
  return (
    <section className="service-introduction" aria-labelledby="introduction-title">
      <div className="introduction-copy">
        <h2 id="introduction-title">My Garage란?</h2>
        <p>차량 상태와 원격 제어, 안전한 소프트웨어 업데이트부터 전기차 충전 예약까지. 내 차량과 연결되는 커넥티드카 서비스입니다.</p>
      </div>
      <div className="introduction-features">
        <div><ServiceIcon name="vehicle" /><h3>차량 관리</h3><p>내 차의 상태와 원격 제어</p></div>
        <div><ServiceIcon name="shield" /><h3>안전한 업데이트</h3><p>설치 전 신뢰성과 무결성 검증</p></div>
        <div><ServiceIcon name="charging" /><h3>충전 예약</h3><p>충전소 검색과 예약 권한 확인</p></div>
      </div>
    </section>
  );
}
