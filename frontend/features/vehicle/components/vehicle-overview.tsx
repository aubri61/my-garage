"use client";

import { useRef } from "react";
import Link from "next/link";
import { ServiceIcon } from "@/components/ui/service-icon";
import type { Vehicle } from "@/features/vehicle/types";
import { VehicleCard } from "@/features/vehicle/components/vehicle-card";

type VehicleOverviewProps = {
  vehicles: readonly Vehicle[];
  selectedVehicle: Vehicle | undefined;
  onSelectVehicle: (vehicleId: string) => void;
  onShowDetails: () => void;
};

export function VehicleOverview({ vehicles, selectedVehicle, onSelectVehicle, onShowDetails }: VehicleOverviewProps) {
  const pointerStart = useRef<{ x: number; y: number; id: number } | null>(null);
  const selectedIndex = vehicles.findIndex((vehicle) => vehicle.id === selectedVehicle?.id);
  const canSwitch = vehicles.length > 1;

  function moveVehicle(direction: number) {
    if (!canSwitch) return;
    const nextIndex = (selectedIndex + direction + vehicles.length) % vehicles.length;
    onSelectVehicle(vehicles[nextIndex].id);
  }

  return (
    <section id="vehicles" className="vehicle-overview" aria-label="내 차량" aria-roledescription="캐러셀">
      {selectedVehicle ? (
        <>
          <div className="vehicle-stage">
            {canSwitch && <button className="carousel-arrow previous" type="button" onClick={() => moveVehicle(-1)} aria-label="이전 차량">←</button>}
            <div
              className="vehicle-slide"
              onPointerDown={(event) => {
                if (event.pointerType === "touch") pointerStart.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
              }}
              onPointerCancel={() => { pointerStart.current = null; }}
              onPointerUp={(event) => {
                const start = pointerStart.current;
                pointerStart.current = null;
                if (!start || start.id !== event.pointerId) return;
                const dx = event.clientX - start.x;
                const dy = event.clientY - start.y;
                if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) moveVehicle(dx < 0 ? 1 : -1);
              }}
            >
              <VehicleCard vehicle={selectedVehicle} onShowDetails={onShowDetails} />
            </div>
            {canSwitch && <button className="carousel-arrow next" type="button" onClick={() => moveVehicle(1)} aria-label="다음 차량">→</button>}
          </div>
          {canSwitch && (
            <div className="vehicle-selector" role="group" aria-label="차량 선택">
              {vehicles.map((vehicle) => (
                <button
                  key={vehicle.id}
                  className="vehicle-choice"
                  type="button"
                  aria-label={`${vehicle.modelName} 선택`}
                  aria-pressed={vehicle.id === selectedVehicle.id}
                  onClick={() => onSelectVehicle(vehicle.id)}
                ><span className="choice-dot" aria-hidden="true" /><span>{vehicle.modelName}</span></button>
              ))}
            </div>
          )}
          <p className="sr-only" role="status">{selectedVehicle.modelName}, {selectedIndex + 1} / {vehicles.length} 차량 선택됨</p>
        </>
      ) : (
        <div className="empty-garage"><ServiceIcon name="vehicle" /><h2>등록된 차량이 없습니다.</h2><p>내 차량을 연결하고 차량 상태와 서비스를 한 곳에서 확인하세요.</p><Link href="/vehicles/register" className="service-action">차량 등록하기 <span aria-hidden="true">→</span></Link><p className="field-hint">연결 코드나 VIN으로 데모 차량을 등록할 수 있습니다.</p></div>
      )}
    </section>
  );
}
