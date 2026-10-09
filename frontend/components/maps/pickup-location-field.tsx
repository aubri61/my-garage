"use client";
import { useEffect, useId, useRef, useState } from "react";
import { PickupLocationPicker } from "./pickup-location-picker";
import { validCoordinates } from "@/lib/kakao-maps";
import { addressAt, searchPickup, type PickupResult } from "@/lib/pickup-search";
interface Props {
  value: string; latitude: string; longitude: string; disabled?: boolean;
  detail?: string; instructions?: string; onDetailChange?: (value: string) => void; onInstructionsChange?: (value: string) => void;
  onTextChange: (value: string) => void;
  onLocationChange: (value: string, latitude: number, longitude: number) => void;
  onCoordinatesChange: (latitude: string, longitude: string) => void;
}
export function PickupLocationField({ value, latitude, longitude, disabled, detail, instructions, onDetailChange, onInstructionsChange, onTextChange, onLocationChange, onCoordinatesChange }: Props) {
  const id = useId();
  const [manualAddress, setManualAddress] = useState(false);
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
    if (disabled || !validCoordinates(latitude, longitude)) return;
    setManualAddress(false); setEditing(false); setResults([]); setBusy(false);
    const request = ++locationRequest.current;
    onLocationChange("", latitude, longitude);
    setStatus("선택한 좌표의 주소를 확인하고 있습니다…");
    try {
      const address = await addressAt(latitude, longitude);
      if (request !== locationRequest.current) return;
      if (address) { onLocationChange(address, latitude, longitude); setStatus("선택한 위치의 주소를 입력했습니다."); }
      else { setManualAddress(true); setStatus("이 위치의 주소를 찾지 못했습니다. 선택한 좌표에 맞는 기본 주소를 직접 입력해주세요."); }
    } catch { if (request === locationRequest.current) { setManualAddress(true); setStatus("주소 확인에 실패했습니다. 선택한 좌표에 맞는 기본 주소를 직접 입력해주세요."); } }
  }
  return <div className="pickup-address-field"><div className={`pickup-search-box ${editing && (results.length > 0 || busy || status) ? "expanded" : ""}`}>
    <label className="form-field" htmlFor={id}>픽업 주소<input id={id} disabled={disabled} maxLength={200} value={value} autoComplete="off" placeholder="주소 또는 장소명을 입력하세요" aria-describedby={`${id}-hint`} onChange={event => { locationRequest.current++; setEditing(true); setResults([]); setStatus(""); setBusy(false); if (manualAddress && latitude.trim() && longitude.trim()) { setEditing(false); onLocationChange(event.target.value, Number(latitude), Number(longitude)); } else onTextChange(event.target.value); }} /></label>

    {manualAddress && <button type="button" className="form-secondary" onClick={() => { setManualAddress(false); setEditing(true); }}>주소 검색으로 다시 선택</button>}
    {busy && <p role="status">주소를 검색하고 있습니다…</p>}
    {status && <p role="status" className="field-hint">{status}</p>}
    {editing && results.length > 0 && <ul className="address-results" aria-label="픽업 주소 검색 결과">{results.map(item => <li key={`${item.label}-${item.address}`}><button type="button" disabled={disabled} onClick={() => { locationRequest.current++; setEditing(false); setBusy(false); setResults([]); setStatus("픽업 주소가 선택되었습니다."); onLocationChange(item.address, item.latitude, item.longitude); }}><strong>{item.label}</strong><span>{item.address}</span></button></li>)}</ul>}
    </div><p id={`${id}-hint`} className="field-hint">주소나 장소를 검색해 선택하세요. 지도에서 위치를 조정할 수도 있습니다.</p>
    {onDetailChange && <label className="form-field">상세 위치<input disabled={disabled} value={detail ?? ""} maxLength={200} placeholder="예: 지하 2층 B구역" onChange={event => onDetailChange(event.target.value)} /></label>}
    {onInstructionsChange && <div className="form-field"><label htmlFor={`${id}-instructions`}>픽업 안내</label><textarea id={`${id}-instructions`} disabled={disabled} value={instructions ?? ""} maxLength={500} rows={2} placeholder="예: 3번 출입구 앞에서 인수" onChange={event => onInstructionsChange(event.target.value)} /></div>}
    <PickupLocationPicker disabled={disabled} latitude={latitude} longitude={longitude} onPick={(lat, lng) => { void pick(lat, lng); }} />
    {/* 좌표는 검색·지도 조작으로 설정합니다. 직접 입력 UI는 숨겨 둡니다. */}
    {false && <details className="coordinate-details"><summary>위치를 직접 입력하기</summary><p className="field-hint">주소 검색이 어려운 경우 픽업 주소와 좌표를 직접 입력할 수 있습니다.</p><div className="coordinate-grid"><label className="form-field">픽업 위도<input disabled={disabled} type="number" step="any" min={-90} max={90} value={latitude} onChange={event => { locationRequest.current++; setManualAddress(true); setEditing(false); setResults([]); setStatus("입력한 좌표에 맞는 기본 주소를 확인해주세요. 입력을 마치면 주소를 다시 조회합니다."); onCoordinatesChange(event.target.value, longitude); }} onBlur={() => { if (latitude.trim() && longitude.trim()) void pick(Number(latitude), Number(longitude)); }} /></label><label className="form-field">픽업 경도<input disabled={disabled} type="number" step="any" min={-180} max={180} value={longitude} onChange={event => { locationRequest.current++; setManualAddress(true); setEditing(false); setResults([]); setStatus("입력한 좌표에 맞는 기본 주소를 확인해주세요. 입력을 마치면 주소를 다시 조회합니다."); onCoordinatesChange(latitude, event.target.value); }} onBlur={() => { if (latitude.trim() && longitude.trim()) void pick(Number(latitude), Number(longitude)); }} /></label></div></details>}
  </div>;
}
