import type { AvailableVehicle } from "../types";

export function PickupOverview({ vehicles, selectedId, onSelect }: { vehicles: AvailableVehicle[]; selectedId: number | null; onSelect: (id: number) => void }) {
  const points = vehicles.filter(v => Number.isFinite(v.latitude) && Number.isFinite(v.longitude));
  const latitudes = points.map(v => v.latitude), longitudes = points.map(v => v.longitude);
  const minLat = Math.min(...latitudes), maxLat = Math.max(...latitudes), minLng = Math.min(...longitudes), maxLng = Math.max(...longitudes);
  return <section className="map-fallback" aria-label="공개 픽업 좌표 개요"><strong>공개 픽업 위치 · 좌표 개요</strong><p>지도 키가 없어 도로 배경 대신 등록된 픽업 좌표를 표시합니다. 실제 GPS가 아닙니다. 마커와 목록은 동일한 서버 차량 데이터를 사용합니다.</p>
    <div className="pickup-overview" role="group" aria-label="공개 차량 픽업 마커">{points.map(v => <button key={v.id} className="pickup-point" style={{ left: `${maxLng === minLng ? 50 : 24 + (v.longitude - minLng) / (maxLng - minLng) * 52}%`, top: `${maxLat === minLat ? 50 : 10 + (maxLat - v.latitude) / (maxLat - minLat) * 80}%` }} aria-label={`${v.manufacturer} ${v.model} 픽업 마커`} aria-pressed={selectedId === v.id} onClick={() => onSelect(v.id)}><span aria-hidden="true">●</span><span>{v.model}</span></button>)}{points.length === 0 && <p>표시할 공개 픽업 위치가 없습니다.</p>}</div>
    {points.find(v => v.id === selectedId) && <p>선택 픽업: {points.find(v => v.id === selectedId)?.pickupLocation}</p>}
  </section>;
}
