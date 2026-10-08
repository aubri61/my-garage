"use client";
import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createRental } from "../api";
import type { AvailableVehicle } from "../types";
import { errorMessage } from "@/lib/api-client";
export function RentalForm({ vehicle }: { vehicle: AvailableVehicle }) {
  const client = useQueryClient();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [validation, setValidation] = useState("");
  const mutation = useMutation({ mutationFn: createRental, onSuccess: async () => {
    await client.invalidateQueries({ queryKey: ["rentals"] });
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
  return <section className="sharing-panel" aria-labelledby="rental-form-title"><p className="eyebrow">RENTAL REQUEST</p>
    <h2 id="rental-form-title">{vehicle.manufacturer} {vehicle.model}</h2><p>{vehicle.modelYear} · 공유 가능</p><p>픽업: {vehicle.pickupLocation}</p>
    <form onSubmit={submit}><fieldset disabled={mutation.isPending} className="form-fields"><legend className="sr-only">대여 시간 선택</legend>
      <label className="form-field">시작 시각 (기기 현지 시간)<input type="datetime-local" required value={start} onChange={e => setStart(e.target.value)} /></label>
      <label className="form-field">종료 시각 (기기 현지 시간)<input type="datetime-local" required value={end} onChange={e => setEnd(e.target.value)} /></label>
    </fieldset><p className="sharing-disclosure">공유 공개는 시간별 예약 가능 보장이 아닙니다. 최종 충돌 검사는 서버에서 수행합니다.</p>
      {(validation || mutation.isError) && <p className="form-error" role="alert">{validation || errorMessage(mutation.error)}</p>}
      {mutation.isSuccess && <p role="status">대여 요청 #{mutation.data.id}을 전송했습니다. 아래 내 대여에서 진행 상황을 확인하세요.</p>}
      <button className="form-submit" disabled={mutation.isPending}>{mutation.isPending ? "요청 중…" : "대여 신청"}</button>
    </form></section>;
}
