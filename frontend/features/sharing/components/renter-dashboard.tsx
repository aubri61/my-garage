"use client";
import "./renter-dashboard.css";
import { LargeSelect } from "@/components/ui/large-select";
import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session";
import { errorMessage } from "@/lib/api-client";
import { availableVehicles, type RentalPeriod } from "../api";
import { manufacturerName, isElectricVehicle } from "@/features/vehicle-registration/catalog";
import { vehicleName, pickupAddress } from "../presentation";
import { hourlyPrice } from "../pricing";
import { PickupMap } from "./pickup-map";
import { RentalForm } from "./rental-form";
import { RentalList } from "./rental-list";
import { useRentalDates } from "./rental-period-fields";
import { RenterFilters, emptyRenterFilters } from "./renter-filters";
import { RenterVehicleCard } from "./renter-vehicle-card";
export function RenterDashboard() {
  const session = useSession();
  const [filters, setFilters] = useState(emptyRenterFilters);
  const [sort, setSort] = useState("recommended");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { start, end, setStart, setEnd } = useRentalDates();
  const startsAt = start ? new Date(start) : null, endsAt = end ? new Date(end) : null;
  const validPeriod = !!startsAt && !!endsAt && Number.isFinite(startsAt.getTime()) && Number.isFinite(endsAt.getTime()) && startsAt < endsAt;
  const period: RentalPeriod | undefined = validPeriod ? { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() } : undefined;
  const select = useCallback((id: number) => setSelectedId(id), []);
  const query = useQuery({ queryKey: ["available-vehicles", session.data?.id, period?.startsAt, period?.endsAt], queryFn: ({ signal }) => availableVehicles(signal, period), enabled: !!session.data, refetchInterval: 30000 });
  const allVehicles = query.data ?? [];
  const hasPrices = allVehicles.some(vehicle => hourlyPrice(vehicle) !== null);
  const effectiveSort = !hasPrices && sort.startsWith("price-") ? "recommended" : sort;
  const manufacturers = [...new Set(allVehicles.map(vehicle => manufacturerName(vehicle.manufacturer)))];
  const models = [...new Set(allVehicles.filter(vehicle => !filters.manufacturer || manufacturerName(vehicle.manufacturer) === filters.manufacturer).map(vehicle => vehicleName(vehicle.manufacturer, vehicle.model)))];
  const vehicles = allVehicles.filter(vehicle => {
    const name = vehicleName(vehicle.manufacturer, vehicle.model), address = pickupAddress(vehicle.pickupLocation), price = hourlyPrice(vehicle);
    return `${name} ${address}`.toLowerCase().includes(filters.search.trim().toLowerCase()) && (!filters.manufacturer || manufacturerName(vehicle.manufacturer) === filters.manufacturer) && (!filters.model || name === filters.model) && (!filters.electric || isElectricVehicle(vehicle.manufacturer, vehicle.model)) && (!filters.availableOnly || vehicle.available === true) && (!filters.minPrice || (price !== null && price >= Number(filters.minPrice))) && (!filters.maxPrice || (price !== null && price <= Number(filters.maxPrice)));
  }).sort((a, b) => {
    if (effectiveSort === "price-asc" || effectiveSort === "price-desc") { const left = hourlyPrice(a), right = hourlyPrice(b); if (left === null) return right === null ? 0 : 1; if (right === null) return -1; return effectiveSort === "price-asc" ? left - right : right - left; }
    if (effectiveSort === "year") return b.modelYear - a.modelYear;
    return Number(b.available === true) - Number(a.available === true);
  });
  const selected = query.isError ? undefined : vehicles.find(vehicle => vehicle.id === selectedId);
  function apply(id: number) { select(id); requestAnimationFrame(() => document.getElementById("renter-selection")?.scrollIntoView({ behavior: "smooth", block: "start" })); }
  return <div className="renter-experience"><RentalList mode="renter" /><div className="renter-explore">
    <RenterFilters value={filters} onChange={setFilters} manufacturers={manufacturers} models={models} hasPrices={hasPrices} start={start} end={end} onStart={setStart} onEnd={setEnd} validPeriod={validPeriod} />
    <section className="renter-results" aria-labelledby="available-title"><div className="renter-results-heading"><div><p className="eyebrow">나에게 맞는 차량 찾기</p><h2 id="available-title">대여 가능한 차량</h2><p aria-live="polite">{query.isPending ? "차량을 찾고 있어요" : query.isError ? "목록을 불러오지 못했어요" : `검색 결과 ${vehicles.length}대`}</p></div><LargeSelect label="정렬" value={effectiveSort} options={[{ value: "recommended", label: "대여 가능순" }, { value: "year", label: "최신 연식순" }, ...(hasPrices ? [{ value: "price-asc", label: "낮은 가격순" }, { value: "price-desc", label: "높은 가격순" }] : [])]} onChange={setSort} /></div>
      <div className="renter-map-panel"><div className="renter-map-heading"><h3>픽업 위치 둘러보기</h3><span>지도와 목록에서 같은 차량을 확인하세요</span></div><PickupMap vehicles={query.isError ? [] : vehicles} selectedId={selected?.id ?? null} onSelect={select} /></div>
      {query.isPending && <div className="renter-empty" role="status">대여 가능한 차량을 찾고 있습니다…</div>}
      {query.isError && <div className="renter-empty" role="alert"><h3>차량 목록을 불러오지 못했습니다</h3><p>{errorMessage(query.error)}</p><button className="form-secondary" onClick={() => void query.refetch()}>다시 조회</button></div>}
      {!query.isPending && !query.isError && vehicles.length === 0 && <div className="renter-empty"><h3>조건에 맞는 차량이 없습니다</h3><p>검색어나 필터, 대여 기간을 변경해보세요.</p><button type="button" className="form-secondary" onClick={() => setFilters(emptyRenterFilters)}>필터 초기화</button></div>}
      {!query.isError && <div className="renter-cards">{vehicles.map(vehicle => <RenterVehicleCard key={vehicle.id} vehicle={vehicle} selected={vehicle.id === selectedId} onSelect={() => select(vehicle.id)} onApply={() => apply(vehicle.id)} />)}</div>}
      {selected && <div id="renter-selection" className="renter-selection"><div className="renter-selection-heading"><h3>선택한 차량 · 대여 신청</h3><button type="button" onClick={() => setSelectedId(null)}>선택 닫기</button></div><RentalForm key={`${selected.id}-${period?.startsAt}-${period?.endsAt}`} vehicle={selected} period={period} /></div>}
    </section></div></div>;
}
