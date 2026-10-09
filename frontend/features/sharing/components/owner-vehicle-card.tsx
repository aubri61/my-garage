"use client";
import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { VehicleResponse } from "@/services/types";
import { errorMessage } from "@/lib/api-client";
import { configureSharing, lockVehicle } from "../api";
import type { SharingSettings } from "../types";
import { PickupLocationPicker } from "@/components/maps/pickup-location-picker";
import { VehiclePlaceholder } from "./vehicle-placeholder";
import { OtaSecurityLab } from "@/features/updates/components/ota-security-lab";
export function OwnerVehicleCard({ vehicle }: { vehicle: VehicleResponse }) {
  const client = useQueryClient();
  const [enabled, setEnabled] = useState(vehicle.sharingEnabled);
  const [location, setLocation] = useState(vehicle.pickupLocation ?? "");
  const [lat, setLat] = useState(String(vehicle.pickupLatitude ?? ""));
  const [lng, setLng] = useState(String(vehicle.pickupLongitude ?? ""));
  const [ota, setOta] = useState(false);
  const mutation = useMutation({ mutationFn: (input: SharingSettings | "lock") => input === "lock" ? lockVehicle(vehicle.id) : configureSharing(vehicle.id, input),
    onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ["vehicles"] }), client.invalidateQueries({ queryKey: ["available-vehicles"] }), client.invalidateQueries({ queryKey: ["rentals"] })]); } });
  function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); if (!mutation.isPending) mutation.mutate({ enabled, pickupLocation: location, latitude: Number(lat), longitude: Number(lng) }); }
  return <article className="sharing-panel"><div className="sharing-title"><h3>{vehicle.manufacturer} {vehicle.model}</h3><span className="sharing-status">{vehicle.sharingEnabled ? "공유 공개" : "비공개"}</span></div>
    <VehiclePlaceholder />
    <p>{vehicle.modelYear} · {vehicle.licensePlate} · 가상 상태 {vehicle.lockState}</p>
    <form onSubmit={submit}><fieldset className="form-fields" disabled={mutation.isPending}><legend>공개 픽업 위치</legend>
      <label className="form-field">위치 설명<input required maxLength={200} value={location} onChange={e => setLocation(e.target.value)} placeholder="예: 서울 시청 공영주차장" /></label>
      <div className="coordinate-grid"><label className="form-field">위도<input type="number" step="any" min={-90} max={90} required value={lat} onChange={e => setLat(e.target.value)} placeholder="37.5665" /></label>
        <label className="form-field">경도<input type="number" step="any" min={-180} max={180} required value={lng} onChange={e => setLng(e.target.value)} placeholder="126.9780" /></label></div>
      <PickupLocationPicker latitude={lat} longitude={lng} onPick={(latitude, longitude) => { if (!mutation.isPending) { setLat(latitude.toFixed(6)); setLng(longitude.toFixed(6)); } }} />
      <label className="sharing-toggle"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />공개 목록에 차량 공유</label>
      <p className="sharing-disclosure">입력한 픽업 위치만 공개됩니다. 실제 GPS 또는 차량 소유권 검증을 수행하지 않습니다.</p>
    </fieldset><button disabled={mutation.isPending} className="form-submit">{mutation.isPending ? "처리 중…" : "공유 설정 저장"}</button></form>
    <div className="sharing-actions"><button disabled={mutation.isPending || vehicle.lockState === "LOCKED"} onClick={() => mutation.mutate("lock")}>가상 차량 잠금</button><button onClick={() => setOta(!ota)} aria-expanded={ota}>OTA Security Lab</button></div>
    {mutation.isError && <p className="form-error" role="alert">{errorMessage(mutation.error)}</p>}{mutation.isSuccess && <p role="status">서버에 반영되었습니다.</p>}
    {ota && <OtaSecurityLab vehicleId={vehicle.id} vehicleName={`${vehicle.manufacturer} ${vehicle.model}`} />}
  </article>;
}
