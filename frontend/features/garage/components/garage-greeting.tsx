import type { GarageProfile } from "@/features/garage/types";

export function GarageGreeting({ profile }: { profile: GarageProfile }) {
  return (
    <section className="garage-greeting" aria-labelledby="garage-title">
      <p className="greeting">안녕하세요, {profile.displayName} 님</p>
      <h1 id="garage-title">내 차들을 한 곳에서<br className="title-break" /> 안전하게 관리하세요.</h1>
      <p className="greeting-description">차량 상태 확인부터 소프트웨어 업데이트,<br />전기차 충전 예약까지 My Garage에서 관리할 수 있습니다.</p>
    </section>
  );
}
