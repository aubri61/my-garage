"use client";
import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session";
import { errorMessage } from "@/lib/api-client";
import { availableVehicles } from "../api";
import { PickupMap } from "./pickup-map";
import { RentalForm } from "./rental-form";
import { RentalList } from "./rental-list";
export function RenterDashboard() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const select = useCallback((id: number) => setSelectedId(id), []);
  const query = useQuery({ queryKey: ["available-vehicles", session.data?.id], queryFn: ({ signal }) => availableVehicles(signal), enabled: !!session.data, refetchInterval: 30000 });
  const vehicles = (query.data ?? []).filter(v => `${v.manufacturer} ${v.model} ${v.pickupLocation}`.toLowerCase().includes(search.toLowerCase()));
  const selected = vehicles.find(v => v.id === selectedId);
  return <><label className="form-field sharing-search">차종 또는 픽업 위치 검색<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="예: IONIQ, 서울" /></label>
    {query.isPending && <p role="status">공유 차량을 조회하고 있습니다…</p>}
    {query.isError && <p className="form-error" role="alert">{errorMessage(query.error)} <button onClick={() => void query.refetch()}>다시 조회</button></p>}
    <PickupMap vehicles={vehicles} selectedId={selectedId} onSelect={select} />
    {!query.isPending && !query.isError && vehicles.length === 0 && <p className="sharing-panel">조건에 맞는 공유 차량이 없습니다. 본인 차량은 표시하지 않습니다.</p>}
    <div className="sharing-search-layout"><div className="available-list">{vehicles.map(v => <button key={v.id} className="sharing-panel available-card" aria-pressed={v.id === selectedId} onClick={() => select(v.id)}>
      <strong>{v.manufacturer} {v.model}</strong><span>{v.modelYear} · 공유 공개</span><span>{v.pickupLocation}</span></button>)}</div>
      {selected ? <RentalForm key={selected.id} vehicle={selected} /> : <div className="sharing-panel"><h2>차량을 선택해주세요</h2><p>목록 또는 지도 마커에서 차량을 선택해 대여 기간을 입력하세요.</p></div>}</div>
    <RentalList mode="renter" /></>;
}
