"use client";
import { useEffect, useId, useRef, useState } from "react";
import { PickupLocationPicker } from "./pickup-location-picker";
import { addressAt, searchPickup, type PickupResult } from "@/lib/pickup-search";
interface Props {
  value: string; latitude: string; longitude: string; disabled?: boolean;
  onTextChange: (value: string) => void;
  onLocationChange: (value: string, latitude: number, longitude: number) => void;
  onCoordinatesChange: (latitude: string, longitude: string) => void;
}
export function PickupLocationField({ value, latitude, longitude, disabled, onTextChange, onLocationChange, onCoordinatesChange }: Props) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [results, setResults] = useState<PickupResult[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const locationRequest = useRef(0);
  useEffect(() => () => { locationRequest.current++; }, []);
  useEffect(() => { if (disabled) locationRequest.current++; }, [disabled]);
  useEffect(() => {
    if (!editing || disabled || value.trim().length < 2) return;
    let disposed = false;
    const timer = window.setTimeout(() => {
      setBusy(true); setStatus("");
      void searchPickup(value.trim()).then(items => { if (!disposed) { setResults(items); setStatus(items.length ? "" : "검색 결과가 없습니다. 다른 주소나 장소명을 입력해주세요."); } }).catch(error => { if (!disposed) { setResults([]); setStatus(error instanceof Error ? error.message : "주소 검색 실패"); } }).finally(() => { if (!disposed) setBusy(false); });
    }, 450);
    return () => { disposed = true; window.clearTimeout(timer); };
  }, [value, editing, disabled]);
  async function pick(latitude: number, longitude: number) {
    if (disabled) return;
    setEditing(false); setResults([]); setBusy(false);
    const request = ++locationRequest.current;
    onLocationChange(value, latitude, longitude);
    try {
      const address = await addressAt(latitude, longitude);
      if (request !== locationRequest.current) return;
      if (address) { onLocationChange(address, latitude, longitude); setStatus("선택한 위치의 주소를 입력했습니다."); }
      else setStatus("좌표를 선택했습니다. 픽업 주소나 장소 설명을 직접 입력해주세요.");
    } catch { if (request === locationRequest.current) setStatus("좌표를 선택했습니다. 주소는 직접 입력해주세요."); }
  }
  return <div className="pickup-address-field">
    <label className="form-field" htmlFor={id}>픽업 주소<input id={id} disabled={disabled} maxLength={200} value={value} autoComplete="off" placeholder="주소 또는 장소명을 입력하세요" aria-describedby={`${id}-hint`} onChange={event => { locationRequest.current++; setEditing(true); setResults([]); setStatus(""); setBusy(false); onTextChange(event.target.value); }} /></label>
    <p id={`${id}-hint`} className="field-hint">검색 결과를 선택하면 지도와 픽업 위치가 함께 설정됩니다.</p>
    {busy && <p role="status">주소를 검색하고 있습니다…</p>}
    {status && <p role="status" className="field-hint">{status}</p>}
    {editing && results.length > 0 && <ul className="address-results" aria-label="픽업 주소 검색 결과">{results.map(item => <li key={`${item.label}-${item.address}`}><button type="button" disabled={disabled} onClick={() => { locationRequest.current++; setEditing(false); setBusy(false); setResults([]); setStatus("픽업 주소가 선택되었습니다."); onLocationChange(item.address, item.latitude, item.longitude); }}><strong>{item.label}</strong><span>{item.address}</span></button></li>)}</ul>}
    <PickupLocationPicker latitude={latitude} longitude={longitude} onPick={(lat, lng) => { void pick(lat, lng); }} />
    <details className="coordinate-details"><summary>위치를 직접 입력하기</summary><p className="field-hint">주소 검색이 어려운 경우 픽업 주소와 좌표를 직접 입력할 수 있습니다.</p><div className="coordinate-grid"><label className="form-field">픽업 위도<input disabled={disabled} type="number" step="any" min={-90} max={90} value={latitude} onChange={event => { locationRequest.current++; onCoordinatesChange(event.target.value, longitude); }} /></label><label className="form-field">픽업 경도<input disabled={disabled} type="number" step="any" min={-180} max={180} value={longitude} onChange={event => { locationRequest.current++; onCoordinatesChange(latitude, event.target.value); }} /></label></div></details>
  </div>;
}
