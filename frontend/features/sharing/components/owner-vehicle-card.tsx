"use client";
import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { VehicleResponse } from "@/services/types";
import { errorMessage } from "@/lib/api-client";
import { configureSharing, lockVehicle, setSharingEnabled, deleteVehicle } from "../api";
import type { SharingSettings } from "../types";
import { PickupLocationField } from "@/components/maps/pickup-location-field";
import { vehicleName, isInternalLabel } from "../presentation";
import { VehicleDeleteDialog } from "./vehicle-delete-dialog";
import { VehiclePlaceholder } from "./vehicle-placeholder";

export function OwnerVehicleCard({ vehicle }: { vehicle: VehicleResponse }) {
  const client = useQueryClient();
  const [enabled, setEnabled] = useState(vehicle.sharingEnabled);
  const [location, setLocation] = useState(isInternalLabel(vehicle.pickupLocation) ? "" : vehicle.pickupLocation ?? "");
  const [lat, setLat] = useState(String(vehicle.pickupLatitude ?? ""));
  const [lng, setLng] = useState(String(vehicle.pickupLongitude ?? ""));

  const [detail, setDetail] = useState(vehicle.pickupDetail ?? "");
  const [instructions, setInstructions] = useState(vehicle.pickupInstructions ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [validation, setValidation] = useState("");
  const mutation = useMutation({ mutationFn: async (input: SharingSettings | "lock" | "delete" | "toggle") => input === "lock" ? lockVehicle(vehicle.id) : input === "delete" ? deleteVehicle(vehicle.id) : input === "toggle" ? setSharingEnabled(vehicle.id, !vehicle.sharingEnabled) : configureSharing(vehicle.id, input),
    onSuccess: async (updated) => { setConfirmDelete(false); if (updated) setEnabled(updated.sharingEnabled); await Promise.all([client.invalidateQueries({ queryKey: ["vehicles"] }), client.invalidateQueries({ queryKey: ["available-vehicles"] }), client.invalidateQueries({ queryKey: ["rentals"] })]); } });
  function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); if (!location.trim() || !lat.trim() || !lng.trim()) { setValidation("픽업 주소를 검색해 선택하거나 주소와 좌표를 입력해주세요."); return; } setValidation(""); if (!mutation.isPending) mutation.mutate({ enabled, pickupLocation: location, latitude: Number(lat), longitude: Number(lng), pickupDetail: detail, pickupInstructions: instructions }); }
  return <article className="sharing-panel"><div className="sharing-title"><h3>{vehicleName(vehicle.manufacturer, vehicle.model)}</h3><span className="sharing-status">{vehicle.sharingEnabled ? "공유 공개" : "비공개"}</span></div>
    <VehiclePlaceholder manufacturer={vehicle.manufacturer} model={vehicle.model} />
    <p>{vehicle.modelYear} · {isInternalLabel(vehicle.licensePlate) ? "차량 번호 확인 필요" : vehicle.licensePlate}</p>
    <div className="sharing-actions"><button disabled={mutation.isPending} onClick={() => mutation.mutate("toggle")}>{vehicle.sharingEnabled ? "공유 중단" : "공유 재개"}</button><button disabled={mutation.isPending} onClick={() => { mutation.reset(); setConfirmDelete(true); }}>차량 삭제</button></div>
    <p className="field-hint">공유를 중단해도 기존 요청과 계약은 유지되며 새로운 신청만 제한됩니다.</p>
    {confirmDelete && <VehicleDeleteDialog pending={mutation.isPending} error={mutation.isError ? mutation.error : null} onCancel={() => setConfirmDelete(false)} onConfirm={() => mutation.mutate("delete")} />}
    <details className="vehicle-settings"><summary>픽업 위치·공유 설정 변경</summary><form onSubmit={submit}><fieldset className="form-fields" disabled={mutation.isPending}><legend>공개 픽업 위치</legend>
      <PickupLocationField value={location} latitude={lat} longitude={lng} disabled={mutation.isPending} detail={detail} instructions={instructions} onDetailChange={setDetail} onInstructionsChange={setInstructions}
        onTextChange={value => { setLocation(value); setLat(""); setLng(""); }}
        onLocationChange={(value, latitude, longitude) => { setLocation(value); setLat(latitude.toFixed(6)); setLng(longitude.toFixed(6)); }}
        onCoordinatesChange={(latitude, longitude) => { setLocation(""); setLat(latitude); setLng(longitude); }} />
      <label className="sharing-toggle"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />공개 목록에 차량 공유</label>
      <p className="sharing-disclosure">픽업 주소는 다른 사용자에게 공개됩니다. 차량 번호는 소유자만 확인할 수 있습니다.</p>
    </fieldset><button disabled={mutation.isPending} className="form-submit">{mutation.isPending ? "처리 중…" : "공유 설정 저장"}</button></form></details>
    {vehicle.lockState === "UNLOCKED" && <div className="sharing-actions"><button disabled={mutation.isPending} onClick={() => mutation.mutate("lock")}>차량 잠금</button></div>}
    {validation && <p className="form-error" role="alert">{validation}</p>}
    {mutation.isError && !confirmDelete && <p className="form-error" role="alert">{errorMessage(mutation.error)}</p>}{mutation.isSuccess && <p role="status">서버에 반영되었습니다.</p>}
  </article>;
}
