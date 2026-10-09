"use client";
import { KakaoMap } from "@/components/maps/kakao-map";
import { vehicleName } from "../presentation";
import type { AvailableVehicle } from "../types";

export function PickupMap({ vehicles, selectedId, onSelect, demo = false }: { vehicles: AvailableVehicle[]; selectedId: number | null; onSelect: (id: number) => void; demo?: boolean }) {
  return <>
    <KakaoMap points={vehicles.map(vehicle => ({ id: vehicle.id, label: vehicleName(vehicle.manufacturer, vehicle.model), latitude: vehicle.latitude, longitude: vehicle.longitude }))} selectedId={selectedId} onSelect={onSelect} label="차량 픽업 위치 카카오맵" />
    <p className="sharing-disclosure">{demo ? "카카오맵에 표시된 차량과 픽업 위치는 체험용 예시입니다." : "마커에서 차량을 선택할 수 있습니다. 표시된 위치는 픽업 주소입니다."} 차량의 실시간 위치는 표시하지 않습니다.{vehicles.length === 0 && " 표시할 차량이 없습니다."}</p>
  </>;
}
