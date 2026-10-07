import type { Vehicle } from "@/features/vehicle/types";
import { VehicleCard } from "@/features/vehicle/components/vehicle-card";

export function VehicleOverview({ vehicles }: { vehicles: readonly Vehicle[] }) {
  return (
    <section id="vehicles" className="vehicle-overview" aria-labelledby="vehicles-title">
      <div className="section-heading"><h2 id="vehicles-title">내 차량 <span className="section-count">{vehicles.length}</span></h2><span className="section-caption">나의 디지털 차고지</span></div>
      {vehicles.length > 0
        ? <div className="vehicle-grid">{vehicles.map((vehicle) => <VehicleCard key={vehicle.id} vehicle={vehicle} />)}</div>
        : <div className="empty-garage"><p>아직 등록된 차량이 없습니다.</p><p>차량을 등록하면 상태와 소프트웨어 정보를 확인할 수 있습니다.</p></div>}
    </section>
  );
}
