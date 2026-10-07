"use client";

import { useRef } from "react";
import type { Vehicle } from "@/features/vehicle/types";
import { VehicleCard } from "@/features/vehicle/components/vehicle-card";

type VehicleOverviewProps = {
  vehicles: readonly Vehicle[];
  selectedVehicle: Vehicle | undefined;
  onSelectVehicle: (vehicleId: string) => void;
};

export function VehicleOverview({ vehicles, selectedVehicle, onSelectVehicle }: VehicleOverviewProps) {
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
              <VehicleCard vehicle={selectedVehicle} />
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
        <div className="empty-garage"><h2>첫 차량을 연결해보세요.</h2><p>등록된 차량이 없습니다. 차량을 연결하면 상태와 서비스 정보를 확인할 수 있습니다.</p><button type="button" className="service-action" disabled aria-describedby="registration-note">차량 등록</button><p id="registration-note">차량 등록 기능 제공 예정</p></div>
      )}
    </section>
  );
}
