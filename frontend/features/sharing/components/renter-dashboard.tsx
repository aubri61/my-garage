"use client";
import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session";
import { errorMessage } from "@/lib/api-client";
import { availableVehicles, type RentalPeriod } from "../api";
import { manufacturerName, vehicleCategory, isElectricVehicle } from "@/features/vehicle-registration/catalog";
import { vehicleName, pickupAddress, personName } from "../presentation";
import { VehiclePlaceholder } from "./vehicle-placeholder";
import { PickupMap } from "./pickup-map";
import { RentalForm } from "./rental-form";
import { RentalList } from "./rental-list";
import { RentalPeriodFields, useRentalDates } from "./rental-period-fields";
export function RenterDashboard() {
  const session = useSession();
  const [search, setSearch] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [electric, setElectric] = useState(false);
  const [model, setModel] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { start, end, setStart, setEnd } = useRentalDates();
  const startsAt = start ? new Date(start) : null, endsAt = end ? new Date(end) : null;
  const validPeriod = !!startsAt && !!endsAt && Number.isFinite(startsAt.getTime()) && Number.isFinite(endsAt.getTime()) && startsAt < endsAt;
  const period: RentalPeriod | undefined = validPeriod ? { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() } : undefined;
  const select = useCallback((id: number) => setSelectedId(id), []);
  const query = useQuery({ queryKey: ["available-vehicles", session.data?.id, period?.startsAt, period?.endsAt], queryFn: ({ signal }) => availableVehicles(signal, period), enabled: !!session.data, refetchInterval: 30000 });
  const allVehicles = query.data ?? [];
  const models = [...new Set(allVehicles.filter(vehicle => !manufacturer || manufacturerName(vehicle.manufacturer) === manufacturer).map(vehicle => vehicleName(vehicle.manufacturer, vehicle.model)))];
  const vehicles = allVehicles.filter(vehicle => {
    const name = vehicleName(vehicle.manufacturer, vehicle.model), address = pickupAddress(vehicle.pickupLocation);
    return `${name} ${address}`.toLowerCase().includes(search.toLowerCase()) && (!manufacturer || manufacturerName(vehicle.manufacturer) === manufacturer) && (!model || name === model) && (!electric || isElectricVehicle(vehicle.manufacturer, vehicle.model));
  });
  const selected = vehicles.find(vehicle => vehicle.id === selectedId);
  return <>
    <RentalList mode="renter" />
    <section className="sharing-section"><div className="section-heading"><h2>픽업 위치 지도</h2><p>가까운 픽업 위치를 확인하고 차량을 선택하세요.</p></div><PickupMap vehicles={vehicles} selectedId={selectedId} onSelect={select} /></section>
    <section className="sharing-section" aria-labelledby="available-title"><div className="section-heading"><h2 id="available-title">대여 가능한 차량 목록</h2><p>차량과 대여 기간을 선택한 뒤 신청할 수 있습니다.</p></div>
      <div className="inventory-filters sharing-panel"><label className="form-field sharing-search">차량·픽업 주소 검색<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="차량 이름이나 픽업 지역을 검색하세요" /></label>
        <div className="filter-row"><label className="form-field">제조사<select value={manufacturer} onChange={event => { setManufacturer(event.target.value); setModel(""); }}><option value="">전체 제조사</option>{[...new Set(allVehicles.map(vehicle => manufacturerName(vehicle.manufacturer)))].map(name => <option key={name}>{name}</option>)}</select></label><label className="form-field">차종<select value={model} onChange={event => setModel(event.target.value)}><option value="">전체 차종</option>{models.map(name => <option key={name}>{name}</option>)}</select></label><label className="sharing-toggle"><input type="checkbox" checked={electric} onChange={event => setElectric(event.target.checked)} />전기차만 보기</label></div>
        <RentalPeriodFields start={start} end={end} onStart={setStart} onEnd={setEnd} browsing />
        {!validPeriod && (start || end) && <p role="status" className="field-hint">시작보다 뒤인 종료 시각을 선택해주세요.</p>}
      </div>
      {query.isPending && <p role="status">대여 가능한 차량을 찾고 있습니다…</p>}
      {query.isError && <p className="form-error" role="alert">{errorMessage(query.error)} <button onClick={() => void query.refetch()}>다시 조회</button></p>}
      {!query.isPending && !query.isError && vehicles.length === 0 && <p className="sharing-panel">조건에 맞는 차량이 없습니다. 검색어나 대여 기간을 변경해보세요.</p>}
      <div className="sharing-search-layout"><div className="available-list">{vehicles.map(vehicle => <button key={vehicle.id} data-vehicle-id={vehicle.id} className="sharing-panel available-card" aria-pressed={vehicle.id === selectedId} onClick={() => select(vehicle.id)}>
        <VehiclePlaceholder manufacturer={vehicle.manufacturer} model={vehicle.model} /><div className="vehicle-card-content"><div className="vehicle-meta"><span>{manufacturerName(vehicle.manufacturer)}</span><span>{vehicle.modelYear}년</span><span>{isElectricVehicle(vehicle.manufacturer, vehicle.model) ? "전기차" : vehicleCategory(vehicle.manufacturer, vehicle.model) ? "연료 정보 확인 필요" : "차종 정보 확인 필요"}</span></div><strong>{vehicleName(vehicle.manufacturer, vehicle.model)}</strong><span>픽업 주소: {pickupAddress(vehicle.pickupLocation)}</span><span>소유자: {personName(vehicle.ownerName)}</span><span className={`availability-badge ${vehicle.available === false ? "unavailable" : ""}`}>공유 중 · {vehicle.available === false ? "선택 기간 대여 불가" : vehicle.available ? "선택 기간 대여 가능" : "대여 기간 선택 필요"}</span></div>
      </button>)}</div>
        {selected ? <RentalForm key={`${selected.id}-${period?.startsAt}-${period?.endsAt}`} vehicle={selected} period={period} /> : <aside className="sharing-panel selection-empty"><h3>마음에 드는 차량을 선택하세요</h3><p>픽업 주소와 대여 기간을 확인한 후 신청할 수 있습니다.</p></aside>}</div>
    </section>
  </>;
}
