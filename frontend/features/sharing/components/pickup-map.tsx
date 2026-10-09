"use client";
import { KakaoMap } from "@/components/maps/kakao-map";
import type { AvailableVehicle } from "../types";

export function PickupMap({ vehicles, selectedId, onSelect, demo = false }: { vehicles: AvailableVehicle[]; selectedId: number | null; onSelect: (id: number) => void; demo?: boolean }) {
  return <>
    <KakaoMap points={vehicles.map(vehicle => ({ id: vehicle.id, label: `${vehicle.manufacturer} ${vehicle.model}`, latitude: vehicle.latitude, longitude: vehicle.longitude }))} selectedId={selectedId} onSelect={onSelect} label="차량 픽업 위치 카카오맵" />
    <p className="sharing-disclosure">{demo ? "카카오맵에 표시된 차량과 픽업 위치는 체험용 예시입니다." : "마커는 소유자가 등록한 픽업 위치입니다."} 실제 차량 GPS가 아닙니다.{vehicles.length === 0 && " 표시할 차량이 없습니다."}</p>
  </>;
}
