"use client";

import Link from "next/link";
import { useReducer, useState } from "react";
import { demoReducer, demoVehicles, initialDemoState } from "./state";
import { RentalPreview } from "./rental-preview";
import { vehicleName, pickupAddress } from "../presentation";
import { VehiclePlaceholder } from "../components/vehicle-placeholder";
import { PickupMap } from "../components/pickup-map";

export function SharingDemo() {
  const [mode, setMode] = useState<"owner" | "renter">("renter");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [state, dispatch] = useReducer(demoReducer, initialDemoState);
  const vehicles = demoVehicles.filter(v => `${vehicleName(v.manufacturer, v.model)} ${v.pickupLocation}`.toLowerCase().includes(search.toLowerCase()));
  const selected = vehicles.find(v => v.id === selectedId);
  function reset() { dispatch({ type: "RESET" }); setSearch(""); setSelectedId(null); setMode("renter"); }
  return <>
    <p className="sharing-panel demo-boundary">체험용 예시 차량입니다. 실제 대여는 이루어지지 않으며, 새로고침하면 처음부터 체험할 수 있습니다.</p>
    <div className="sharing-title"><div className="sharing-actions" role="group" aria-label="체험 모드"><button aria-pressed={mode === "renter"} onClick={() => setMode("renter")}>대여자 모드</button><button aria-pressed={mode === "owner"} onClick={() => setMode("owner")}>소유자 모드</button></div><button className="form-secondary demo-reset" onClick={reset}>처음부터 체험</button></div>
    <RentalPreview mode={mode} state={state} dispatch={dispatch} />
    <h2 className="flow-heading">{mode === "renter" ? "공유 차량을 선택하세요" : "내 차량과 대여 요청 관리"}</h2>
    <PickupMap vehicles={mode === "renter" ? vehicles : demoVehicles} selectedId={selectedId} onSelect={setSelectedId} demo />
    {mode === "renter" ? <>
      <h2 className="flow-heading">대여 가능한 차량 목록</h2><label className="form-field sharing-search">차량·픽업 주소 검색<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="차량 이름이나 픽업 지역을 검색하세요" /></label>
      <div className="sharing-search-layout"><div className="available-list">{vehicles.map(v => <button key={v.id} className="sharing-panel available-card" aria-pressed={selectedId === v.id} onClick={() => setSelectedId(v.id)}><VehiclePlaceholder manufacturer={v.manufacturer} model={v.model} /><div className="vehicle-card-content"><strong>{vehicleName(v.manufacturer, v.model)}</strong><span>{v.modelYear} · 예시 공유 차량</span><span>픽업 주소: {pickupAddress(v.pickupLocation)}</span><span>전기차 · 체험용 예시</span></div></button>)}{vehicles.length === 0 && <p role="status">조건에 맞는 예시 차량이 없습니다.</p>}</div>
        <section className="sharing-panel"><h2>{selected ? vehicleName(selected.manufacturer, selected.model) : "차량을 선택해주세요"}</h2><p>{selected ? selected.pickupLocation : "목록에서 차량을 선택해 대여 요청을 시작하세요."}</p><p>예시 픽업 위치 · 지도는 카카오맵이며 차량 데이터는 체험용 예시입니다.</p><button className="form-submit" disabled={!selected || !!state.status} onClick={() => selected && dispatch({ type: "REQUEST", vehicleId: selected.id })}>대여 요청 체험</button>{state.status && <p>현재 대여 흐름을 진행하거나 처음부터 체험을 눌러주세요.</p>}</section></div>
    </> : <div className="rental-grid">{demoVehicles.map(v => <section key={v.id} className="sharing-panel"><h2>{vehicleName(v.manufacturer, v.model)}</h2><span className="sharing-status">공유 공개 · 예시</span><p>{v.pickupLocation}</p><p>차량 잠금: {v.id === state.vehicleId && !state.locked ? "잠금 해제됨" : "잠김"}</p></section>)}</div>}
    <p className="mock-disclosure">실제 서비스에서는 서버가 소유권, 대여 기간, 계약 동의와 접근 권한을 검증합니다. 체험의 모드 전환은 두 당사자의 화면을 살펴보기 위한 기능입니다.</p>
    <Link className="form-submit" href="/signup">회원가입하고 실제 서비스 시작</Link><Link className="flow-back" href="/login">로그인으로 돌아가기</Link>
  </>;
}
