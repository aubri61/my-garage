"use client";
import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRental, type RentalPeriod } from "../api";
import type { AvailableVehicle } from "../types";
import { vehicleName, pickupAddress, personName, initialRentalPeriod } from "../presentation";
import { VehiclePlaceholder } from "./vehicle-placeholder";
import { RentalPeriodFields } from "./rental-period-fields";
import { errorMessage } from "@/lib/api-client";
import { hourlyPrice, priceLabel } from "../pricing";
export function RentalForm({ vehicle, period }: { vehicle: AvailableVehicle; period?: RentalPeriod }) {
  const client = useQueryClient();
  const [start, setStart] = useState(period ? localTime(period.startsAt) : initialRentalPeriod().start);
  const [end, setEnd] = useState(period ? localTime(period.endsAt) : initialRentalPeriod().end);
  const [validation, setValidation] = useState("");
  const mutation = useMutation({ mutationFn: createRental, onSuccess: async () => {
    await Promise.all([client.invalidateQueries({ queryKey: ["rentals"] }), client.invalidateQueries({ queryKey: ["available-vehicles"] })]);
  } });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    const startsAt = new Date(start), endsAt = new Date(end);
    if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || startsAt >= endsAt) {
      setValidation("종료 시각을 시작 이후로 선택해주세요."); return;
    }
    setValidation(""); mutation.mutate({ vehicleId: vehicle.id, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() });
  }
  return <section className="sharing-panel rental-application" aria-labelledby="rental-form-title"><p className="eyebrow">대여 신청</p>
    <h2 id="rental-form-title">{vehicleName(vehicle.manufacturer, vehicle.model)}</h2><VehiclePlaceholder manufacturer={vehicle.manufacturer} model={vehicle.model} /><p>{vehicle.modelYear}년 · 소유자 {personName(vehicle.ownerName)}</p><p>픽업 주소: {pickupAddress(vehicle.pickupLocation)}</p>{vehicle.pickupDetail && <p>상세 위치: {vehicle.pickupDetail}</p>}{vehicle.pickupInstructions && <p>픽업 안내: {vehicle.pickupInstructions}</p>}
    <p className="rental-price-summary">{hourlyPrice(vehicle) !== null ? "시간당 " : ""}<strong>{priceLabel(vehicle)}</strong></p>
    <form onSubmit={submit}><fieldset disabled={mutation.isPending} className="form-fields"><legend className="sr-only">대여 시간 선택</legend>
      <RentalPeriodFields start={start} end={end} onStart={setStart} onEnd={setEnd} />
    </fieldset><p className="sharing-disclosure">소유자 승인 후 양측이 계약에 동의하면 이용이 확정됩니다. 신청 시 예약 가능 여부를 다시 확인합니다.</p>
      {(validation || mutation.isError) && <p className="form-error" role="alert">{validation || errorMessage(mutation.error)}</p>}
      {mutation.isSuccess && <p role="status">대여 신청이 완료되었습니다. 상단 내 대여 요청에서 진행 상황을 확인하세요.</p>}
      <button className="form-submit" disabled={mutation.isPending || (vehicle.available === false && !!period && start === localTime(period.startsAt) && end === localTime(period.endsAt))}>{mutation.isPending ? "요청 중…" : "대여 신청하기"}</button>
    </form></section>;
}

function localTime(value: string) { const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
