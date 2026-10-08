"use client";
import { useEffect, useRef, useState } from "react";
import type { AvailableVehicle } from "../types";
interface LatLng { getLat(): number; getLng(): number }
interface MapInstance { setCenter(position: LatLng): void; relayout(): void }
interface Marker { setMap(map: MapInstance | null): void }
interface MapsSdk {
  load(callback: () => void): void;
  LatLng: new (lat: number, lng: number) => LatLng;
  Map: new (container: HTMLElement, options: { center: LatLng; level: number }) => MapInstance;
  Marker: new (options: { map: MapInstance; position: LatLng; title: string }) => Marker;
  event: { addListener(marker: Marker, event: string, callback: () => void): void; removeListener(marker: Marker, event: string, callback: () => void): void };
}
declare global { interface Window { kakao?: { maps: MapsSdk } } }
let sdkPromise: Promise<MapsSdk> | undefined;
function loadSdk(key: string) {
  if (!sdkPromise) sdkPromise = new Promise<MapsSdk>((resolve, reject) => {
    const script = document.createElement("script");
    const timer = window.setTimeout(() => { script.remove(); sdkPromise = undefined; reject(new Error("지도 로딩 시간 초과")); }, 15000);
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
    script.onload = () => {
      const maps = window.kakao?.maps;
      if (!maps) { window.clearTimeout(timer); sdkPromise = undefined; reject(new Error("지도 SDK 초기화 실패")); return; }
      maps.load(() => { window.clearTimeout(timer); resolve(maps); });
    };
    script.onerror = () => { window.clearTimeout(timer); script.remove(); sdkPromise = undefined; reject(new Error("지도 SDK 연결 실패")); };
    document.head.appendChild(script);
  });
  return sdkPromise;
}
export function PickupMap({ vehicles, selectedId, onSelect }: { vehicles: AvailableVehicle[]; selectedId: number | null; onSelect: (id: number) => void }) {
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!key || !container.current) return;
    let disposed = false;
    let cleanup = () => {};
    void loadSdk(key).then(maps => {
      if (disposed || !container.current) return;
      const selected = vehicles.find(v => v.id === selectedId);
      const map = new maps.Map(container.current, { center: new maps.LatLng(selected?.latitude ?? 37.5665, selected?.longitude ?? 126.978), level: 7 });
      const markers = vehicles.map(v => {
        const marker = new maps.Marker({ map, position: new maps.LatLng(v.latitude, v.longitude), title: `${v.manufacturer} ${v.model} · ${v.pickupLocation}` });
        const click = () => onSelect(v.id);
        maps.event.addListener(marker, "click", click);
        return { marker, click };
      });
      const resize = new ResizeObserver(() => map.relayout());
      resize.observe(container.current);
      cleanup = () => { resize.disconnect(); markers.forEach(({ marker, click }) => { maps.event.removeListener(marker, "click", click); marker.setMap(null); }); };
    }).catch(reason => { if (!disposed) setError(reason instanceof Error ? reason.message : "지도 로딩 실패"); });
    return () => { disposed = true; cleanup(); };
  }, [key, vehicles, selectedId, onSelect]);
  if (!key) return <div className="map-fallback"><strong>공개 픽업 위치</strong><p>지도 키가 설정되지 않았습니다. 아래 차량 목록에서 위치를 확인하고 대여를 신청할 수 있습니다.</p><p>기본 지도 지역: 서울 시청 · 실제 GPS를 사용하지 않습니다.</p></div>;
  return <><div ref={container} className="pickup-map" aria-label="공개 차량 픽업 위치 지도" />{error && <p role="alert">{error} · 차량 목록은 계속 이용할 수 있습니다.</p>}<p className="sharing-disclosure">마커는 소유자가 등록한 공개 픽업 위치입니다. 실제 차량 GPS가 아닙니다.</p></>;
}
