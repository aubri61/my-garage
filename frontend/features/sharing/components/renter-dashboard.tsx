"use client";
import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session";
import { errorMessage } from "@/lib/api-client";
import { availableVehicles, type RentalPeriod } from "../api";
import { VehiclePlaceholder } from "./vehicle-placeholder";
import { PickupMap } from "./pickup-map";
import { RentalForm } from "./rental-form";
import { RentalList } from "./rental-list";
export function RenterDashboard() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const startsAt = start ? new Date(start) : null, endsAt = end ? new Date(end) : null;
  const validPeriod = !!startsAt && !!endsAt && Number.isFinite(startsAt.getTime()) && Number.isFinite(endsAt.getTime()) && startsAt < endsAt;
  const period: RentalPeriod | undefined = validPeriod ? { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() } : undefined;
  const select = useCallback((id: number) => setSelectedId(id), []);
  const query = useQuery({ queryKey: ["available-vehicles", session.data?.id, period?.startsAt, period?.endsAt], queryFn: ({ signal }) => availableVehicles(signal, period), enabled: !!session.data, refetchInterval: 30000 });
  const vehicles = (query.data ?? []).filter(v => `${v.manufacturer} ${v.model} ${v.pickupLocation}`.toLowerCase().includes(search.toLowerCase()));
  const selected = vehicles.find(v => v.id === selectedId);
  return <><label className="form-field sharing-search">차종 또는 픽업 위치 검색<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="예: IONIQ, 서울" /></label>
    <fieldset className="form-fields"><legend>대여 기간별 가능 여부</legend>
      <div className="coordinate-grid"><label className="form-field">조회 시작 시각<input type="datetime-local" value={start} onChange={event => setStart(event.target.value)} /></label><label className="form-field">조회 종료 시각<input type="datetime-local" value={end} onChange={event => setEnd(event.target.value)} /></label></div>
    </fieldset>
    {(start || end) && !validPeriod && <p role="status">시작과 종료 시각을 올바르게 선택해주세요.</p>}
    <p className="sharing-disclosure">실제 서버의 공유 차량 목록입니다. 기간을 선택하면 기존 승인 예약 및 본인의 대기 요청과 비교합니다. 최종 가능 여부는 신청·승인 시 서버가 다시 확인합니다.</p>
    {query.isPending && <p role="status">공유 차량을 조회하고 있습니다…</p>}
    {query.isError && <p className="form-error" role="alert">{errorMessage(query.error)} <button onClick={() => void query.refetch()}>다시 조회</button></p>}
    <PickupMap vehicles={vehicles} selectedId={selectedId} onSelect={select} />
    {!query.isPending && !query.isError && vehicles.length === 0 && <p className="sharing-panel">조건에 맞는 공유 차량이 없습니다. 본인 차량은 표시하지 않습니다.</p>}
    <div className="sharing-search-layout"><div className="available-list">{vehicles.map(v => <button key={v.id} className="sharing-panel available-card" aria-pressed={v.id === selectedId} onClick={() => select(v.id)}>
      <VehiclePlaceholder /><strong>{v.manufacturer} {v.model}</strong><span>{v.modelYear} · 공유 공개</span><span>{v.pickupLocation}</span><span>{v.available === null || v.available === undefined ? "기간 선택 후 가능 여부 확인" : v.available ? "선택 기간 대여 가능" : "선택 기간 대여 불가"}</span></button>)}</div>
      {selected ? <RentalForm key={`${selected.id}-${period?.startsAt}-${period?.endsAt}`} vehicle={selected} period={period} /> : <div className="sharing-panel"><h2>차량을 선택해주세요</h2><p>목록 또는 지도 마커에서 차량을 선택해 대여 기간을 입력하세요.</p></div>}</div>
    <RentalList mode="renter" /></>;
}
