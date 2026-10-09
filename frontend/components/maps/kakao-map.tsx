"use client";

import { useEffect, useRef, useState } from "react";
import { loadKakaoMaps, validCoordinates, type KakaoMaps, type KakaoMapInstance } from "@/lib/kakao-maps";

export interface MapPoint { id: number; label: string; latitude: number; longitude: number }
interface Props {
  points: MapPoint[];
  selectedId: number | null;
  label: string;
  onSelect?: (id: number) => void;
  onPick?: (latitude: number, longitude: number) => void;
}

export function KakaoMap({ points, selectedId, label, onSelect, onPick }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onSelect, onPick });
  const viewport = useRef("");
  const previousSelection = useRef<number | null>(null);
  const [instance, setInstance] = useState<{ maps: KakaoMaps; map: KakaoMapInstance } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  useEffect(() => { callbacks.current = { onSelect, onPick }; }, [onSelect, onPick]);
  useEffect(() => {
    if (!key || !container.current) return;
    let disposed = false;
    let cleanup = () => {};
    void loadKakaoMaps(key).then(maps => {
      if (disposed || !container.current) return;
      const map = new maps.Map(container.current, { center: new maps.LatLng(37.5665, 126.978), level: 7 });
      const click = (event: { latLng: { getLat(): number; getLng(): number } }) => callbacks.current.onPick?.(event.latLng.getLat(), event.latLng.getLng());
      maps.event.addListener(map, "click", click);
      const resize = new ResizeObserver(() => {
        const center = map.getCenter();
        map.relayout();
        map.setCenter(center);
      });
      resize.observe(container.current);
      cleanup = () => { resize.disconnect(); maps.event.removeListener(map, "click", click); };
      setInstance({ maps, map });
    }).catch(reason => { if (!disposed) setError(reason instanceof Error ? reason.message : "카카오맵 로딩 실패"); });
    return () => { disposed = true; cleanup(); };
  }, [key, attempt]);

  useEffect(() => {
    if (!instance) return;
    const { maps, map } = instance;
    const valid = points.filter(point => validCoordinates(point.latitude, point.longitude));
    const signature = valid.map(point => `${point.id}:${point.latitude}:${point.longitude}`).join("|");
    if (viewport.current !== signature) {
      viewport.current = signature;
      if (valid.length === 1) map.setCenter(new maps.LatLng(valid[0].latitude, valid[0].longitude));
      else if (valid.length > 1) {
        const bounds = new maps.LatLngBounds();
        valid.forEach(point => bounds.extend(new maps.LatLng(point.latitude, point.longitude)));
        map.setBounds(bounds, 60, 80, 60, 80);
      }
    }
    const selected = valid.find(point => point.id === selectedId);
    if (selected && previousSelection.current !== selectedId) map.setCenter(new maps.LatLng(selected.latitude, selected.longitude));
    previousSelection.current = selectedId;
    if (onPick && selected) {
      const marker = new maps.Marker({ map, position: new maps.LatLng(selected.latitude, selected.longitude), draggable: true, title: "픽업 위치 · 드래그하여 조정" });
      const drag = () => { const position = marker.getPosition(); callbacks.current.onPick?.(position.getLat(), position.getLng()); };
      maps.event.addListener(marker, "dragend", drag);
      return () => { maps.event.removeListener(marker, "dragend", drag); marker.setMap(null); };
    }
    const groups = new Map<string, MapPoint[]>();
    valid.forEach(point => {
      const coordinate = `${point.latitude}:${point.longitude}`;
      groups.set(coordinate, [...(groups.get(coordinate) ?? []), point]);
    });
    const overlays = [...groups.values()].map(group => {
      const markerButton = (point: MapPoint) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "kakao-pickup-marker";
        button.textContent = point.label;
        button.setAttribute("aria-label", `${point.label} 픽업 마커`);
        button.setAttribute("aria-pressed", String(point.id === selectedId));
        button.onclick = () => callbacks.current.onSelect?.(point.id);
        return button;
      };
      let content: HTMLElement;
      if (group.length === 1) content = markerButton(group[0]);
      else {
        const details = document.createElement("details");
        details.className = "kakao-marker-group";
        const summary = document.createElement("summary");
        summary.className = "kakao-pickup-marker";
        summary.textContent = `픽업 차량 ${group.length}대`;
        summary.setAttribute("aria-label", `같은 픽업 위치 차량 ${group.length}대 펼치기`);
        summary.setAttribute("aria-pressed", String(group.some(point => point.id === selectedId)));
        const list = document.createElement("div");
        list.className = "kakao-marker-list";
        group.forEach(point => list.appendChild(markerButton(point)));
        details.append(summary, list);
        content = details;
      }
      return new maps.CustomOverlay({ map, position: new maps.LatLng(group[0].latitude, group[0].longitude), content, clickable: true, yAnchor: 1.2, zIndex: group.some(point => point.id === selectedId) ? 2 : 1 });
    });
    return () => overlays.forEach(overlay => overlay.setMap(null));
  }, [instance, points, selectedId, onPick]);

  return <div className="kakao-map-frame">
    <div ref={container} className="pickup-map" role="region" aria-label={label} aria-busy={!!key && !instance && !error} />
    {!key ? <p role="status" className="map-message">카카오맵 JavaScript 키가 설정되지 않았습니다.</p> : error ? <div className="map-message" role="alert"><p>{error}</p><button type="button" className="form-secondary" onClick={() => { setError(""); viewport.current = ""; setAttempt(value => value + 1); }}>지도 다시 연결</button></div> : !instance && <p role="status" className="map-message">카카오맵을 불러오고 있습니다…</p>}
  </div>;
}
