import type { GarageProfile } from "@/features/garage/types";

export function GarageGreeting({ profile }: { profile: GarageProfile }) {
  return (
    <section className="garage-greeting" aria-labelledby="garage-title">
      <div>
        <p className="eyebrow">나의 커넥티드 라이프</p>
        <h1 id="garage-title">안녕하세요, {profile.displayName} 님</h1>
        <p className="greeting-description">내 차량의 상태를 확인하고, 다음 여정을 준비하세요.</p>
      </div>
      <span className="demo-label">데모 차량</span>
    </section>
  );
}
