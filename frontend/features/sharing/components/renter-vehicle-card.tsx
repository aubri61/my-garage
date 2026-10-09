"use client";
import type { AvailableVehicle } from "../types";
import { vehicleName, pickupAddress } from "../presentation";
import { manufacturerName, vehicleCategory, isElectricVehicle } from "@/features/vehicle-registration/catalog";
import { hourlyPrice, priceLabel } from "../pricing";
import { VehiclePlaceholder } from "./vehicle-placeholder";
export function RenterVehicleCard({ vehicle, selected, onSelect, onApply }: { vehicle: AvailableVehicle; selected: boolean; onSelect: () => void; onApply: () => void }) {
  const category = vehicleCategory(vehicle.manufacturer, vehicle.model);
  const name = vehicleName(vehicle.manufacturer, vehicle.model);
  return <article className={`available-card renter-vehicle-card ${selected ? "is-selected" : ""}`} data-vehicle-id={vehicle.id} aria-label={name} onClick={onSelect}>
    <div className="renter-card-visual"><VehiclePlaceholder manufacturer={vehicle.manufacturer} model={vehicle.model} /><span className={`renter-availability ${vehicle.available === true ? "" : "muted"}`}>{vehicle.available === true ? "대여 가능" : vehicle.available === false ? "해당 기간 예약 불가" : "기간 확인 필요"}</span></div>
    <div className="renter-card-body"><p className="renter-card-make">{manufacturerName(vehicle.manufacturer)}</p><h3>{name}</h3><p className="renter-card-spec">{vehicle.modelYear}년식 <span aria-hidden="true">·</span> {isElectricVehicle(vehicle.manufacturer, vehicle.model) ? "전기차" : category?.bodyType ?? "차종 확인 필요"}</p><p className="renter-card-location">픽업 위치: {pickupAddress(vehicle.pickupLocation)}</p>
      <div className="renter-card-price">{hourlyPrice(vehicle) !== null && <span>시간당</span>}<strong>{priceLabel(vehicle)}</strong></div>
      <div className="renter-card-actions"><button type="button" data-vehicle-id={vehicle.id} aria-pressed={selected} aria-label={`${name} 상세 보기`} onClick={event => { event.stopPropagation(); onSelect(); }}>상세 보기</button><button type="button" className="primary" disabled={vehicle.available === false} onClick={event => { event.stopPropagation(); onApply(); }}>대여 신청</button></div>
    </div>
  </article>;
}
