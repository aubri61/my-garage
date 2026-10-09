"use client";
import { KakaoMap } from "./kakao-map";
import { validCoordinates } from "@/lib/kakao-maps";

export function PickupLocationPicker({ latitude, longitude, onPick, disabled }: { disabled?: boolean; latitude: string; longitude: string; onPick: (latitude: number, longitude: number) => void }) {
  const lat = Number(latitude), lng = Number(longitude);
  const points = latitude.trim() && longitude.trim() && validCoordinates(lat, lng) ? [{ id: 0, label: "픽업 위치", latitude: lat, longitude: lng }] : [];
  return <div className="pickup-location-picker"><KakaoMap points={points} selectedId={points.length ? 0 : null} onPick={disabled ? undefined : onPick} label="픽업 위치 선택 카카오맵" /><p className="field-hint">지도를 누르거나 마커를 드래그하면 픽업 위치와 주소가 함께 변경됩니다.</p></div>;
}
