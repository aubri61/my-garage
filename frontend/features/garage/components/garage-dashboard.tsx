import type { GarageDashboardData, GarageServiceAvailability } from "@/features/garage/types";
import { AppHeader } from "@/components/layout/app-header";
import { GarageGreeting } from "@/features/garage/components/garage-greeting";
import { VehicleDashboard } from "@/features/garage/components/vehicle-dashboard";
import { ServiceIntroduction } from "@/features/garage/components/service-introduction";

type GarageDashboardProps = {
  data: GarageDashboardData;
  serviceAvailability: GarageServiceAvailability;
};

export function GarageDashboard({ data, serviceAvailability }: GarageDashboardProps) {
  return (
    <>
      <a className="skip-link" href="#main-content">본문으로 바로가기</a>
      <AppHeader displayName={data.profile.displayName} />
      <main id="main-content" className="garage-main" tabIndex={-1}>
        <GarageGreeting profile={data.profile} />
        <VehicleDashboard
          vehicles={data.vehicles}
          updatesByVehicleId={data.updatesByVehicleId}
          chargingEligibility={data.charging}
          serviceAvailability={serviceAvailability}
        />
        <ServiceIntroduction />
        <p className="demo-notice">포트폴리오 데모 · 차량 상태는 예시 데이터이며, 차량 이미지는 대체 일러스트입니다. 실제 차량에 명령을 전송하지 않습니다.</p>
      </main>
      <footer className="app-footer">
        <div><span>My Garage</span><p>내 차량과 연결되는 일상</p><a href="#main-content">맨 위로 ↑</a></div>
      </footer>
    </>
  );
}
