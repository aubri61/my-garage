import type { GarageDashboardData } from "@/features/garage/types";
import type { ServiceActionTarget } from "@/components/ui/service-action";
import { AppHeader } from "@/components/layout/app-header";
import { GarageGreeting } from "@/features/garage/components/garage-greeting";
import { VehicleOverview } from "@/features/vehicle/components/vehicle-overview";
import { SoftwareUpdateCard } from "@/features/updates/components/software-update-card";
import { ChargingReservationCard } from "@/features/charging/components/charging-reservation-card";
import { ServiceIntroduction } from "@/features/garage/components/service-introduction";

type GarageDashboardProps = {
  data: GarageDashboardData;
  actions: { updates: ServiceActionTarget; charging: ServiceActionTarget };
};

export function GarageDashboard({ data, actions }: GarageDashboardProps) {
  return (
    <>
      <a className="skip-link" href="#main-content">본문으로 바로가기</a>
      <AppHeader displayName={data.profile.displayName} />
      <main id="main-content" className="garage-main" tabIndex={-1}>
        <GarageGreeting profile={data.profile} />
        <VehicleOverview vehicles={data.vehicles} />
        <div className="primary-services"><SoftwareUpdateCard summary={data.updates} action={actions.updates} /><ChargingReservationCard eligibility={data.charging} action={actions.charging} /></div>
        <ServiceIntroduction />
        <p className="demo-notice">포트폴리오 데모 · 차량 상태와 서비스 정보는 예시 데이터이며, 차량 이미지는 대체 일러스트입니다.</p>
      </main>
      <footer className="app-footer"><div><span>My Garage</span><p>당신의 차량과 더 안전하게 연결됩니다.</p><a href="#main-content">맨 위로 ↑</a></div></footer>
    </>
  );
}
