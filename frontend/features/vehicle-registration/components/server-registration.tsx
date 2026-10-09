"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PickupLocationPicker } from "@/components/maps/pickup-location-picker";
import { FormField } from "@/components/ui/form-field";
import { useSession } from "@/features/auth/session";
import { registerVehicle } from "@/services/garage-api";
import { errorMessage } from "@/lib/api-client";
import { vehicleCatalog, pickupPresets } from "../catalog";
import type { VehicleRequest } from "@/services/types";

export function ServerRegistration() {
  const session = useSession();
  const client = useQueryClient();
  const pending = useRef(false);
  const [values, setValues] = useState({ manufacturer: "", model: "", modelYear: "", licensePlate: "", pickupLocation: "", latitude: "", longitude: "" });
  const [sharing, setSharing] = useState(false);
  const [pickup, setPickup] = useState("custom");
  const [validation, setValidation] = useState("");
  const mutation = useMutation({ mutationFn: registerVehicle, onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ["vehicles", session.data?.id] }), client.invalidateQueries({ queryKey: ["available-vehicles"] })]); } });
  function change(field: keyof typeof values, value: string) { setValues(previous => ({ ...previous, [field]: value })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !session.data) return;
    if (!values.manufacturer.trim() || !values.model.trim() || !values.licensePlate.trim()) { setValidation("제조사, 차종, 차량 번호를 입력해주세요."); return; }
    if ((sharing || values.pickupLocation.trim()) && (!values.pickupLocation.trim() || !values.latitude.trim() || !values.longitude.trim())) {
      setValidation("픽업 위치와 위도·경도를 함께 입력해주세요."); return;
    }
    setValidation(""); pending.current = true;
    const request: VehicleRequest = { manufacturer: values.manufacturer.trim(), model: values.model.trim(),
      modelYear: Number(values.modelYear), licensePlate: values.licensePlate.trim(),
      ...(values.pickupLocation.trim() ? { sharing: { enabled: sharing, pickupLocation: values.pickupLocation.trim(), latitude: Number(values.latitude), longitude: Number(values.longitude) } } : {}) };
    try { await mutation.mutateAsync(request); } catch { /* The mutation exposes the server error below. */ }
    finally { pending.current = false; }
  }
  if (mutation.isSuccess) return <section className="flow-success"><span className="success-mark" aria-hidden="true">✓</span>
    <h2>차량 등록이 완료되었습니다.</h2><p>{mutation.data.manufacturer} {mutation.data.model} · {mutation.data.licensePlate}</p>
    <p>{mutation.data.sharingEnabled ? "공유 공개 · 다른 사용자가 공개 목록에서 조회할 수 있습니다." : "비공개 · 내 차량 목록에서 공유를 활성화할 수 있습니다."}</p><Link href="/owner" className="form-submit">내 차량 관리하기</Link><Link href="/garage" className="form-secondary">기존 차고지·OTA 확인하기</Link></section>;
  return <><p className="registration-disclosure mock-disclosure">입력한 차량을 내 계정에 등록합니다. 실제 차량 연결·소유권 인증·인증서 발급은 수행하지 않습니다.</p>
    <form onSubmit={submit} aria-busy={mutation.isPending}>
      <fieldset className="form-fields" disabled={mutation.isPending}><legend className="sr-only">차량 등록 정보</legend>
        <div className="form-field"><label htmlFor="manufacturer">제조사</label><select id="manufacturer" required value={values.manufacturer} onChange={event => setValues(previous => ({ ...previous, manufacturer: event.target.value, model: "" }))}><option value="">제조사 선택</option>{Object.keys(vehicleCatalog).map(name => <option key={name}>{name}</option>)}<option value="기타">기타</option></select></div>
        {values.manufacturer === "기타" ? <FormField name="model" label="차종" value={values.model} onChange={value => change("model", value)} maxLength={100} /> : <div className="form-field"><label htmlFor="model">차종</label><select id="model" required disabled={!values.manufacturer || mutation.isPending} value={values.model} onChange={event => change("model", event.target.value)}><option value="">차종 선택</option>{(vehicleCatalog[values.manufacturer] ?? []).map(model => <option key={model}>{model}</option>)}</select></div>}
        <div className="form-field"><label htmlFor="model-year">연식</label><select id="model-year" required value={values.modelYear} onChange={event => change("modelYear", event.target.value)}><option value="">연식 선택</option>{Array.from({ length: 142 }, (_, index) => 2027 - index).map(year => <option key={year} value={year}>{year}년</option>)}</select></div>
        <FormField name="licensePlate" label="차량 번호" value={values.licensePlate} onChange={value => change("licensePlate", value)} maxLength={30} />
        <div className="form-field"><label htmlFor="pickup-preset">픽업 위치 선택</label><select id="pickup-preset" value={pickup} onChange={event => {
          setPickup(event.target.value); const preset = pickupPresets.find(item => item.label === event.target.value);
          setValues(previous => ({ ...previous, pickupLocation: preset?.label ?? "", latitude: preset ? String(preset.latitude) : "", longitude: preset ? String(preset.longitude) : "" }));
        }}><option value="custom">직접 입력</option>{pickupPresets.map(item => <option key={item.label}>{item.label}</option>)}</select></div>
        <FormField name="pickupLocation" label="픽업 위치 설명" value={values.pickupLocation} onChange={value => change("pickupLocation", value)} maxLength={200} />
        <div className="coordinate-grid"><label className="form-field">픽업 위도<input type="number" step="any" min={-90} max={90} value={values.latitude} onChange={event => change("latitude", event.target.value)} /></label><label className="form-field">픽업 경도<input type="number" step="any" min={-180} max={180} value={values.longitude} onChange={event => change("longitude", event.target.value)} /></label></div>
        <PickupLocationPicker latitude={values.latitude} longitude={values.longitude} onPick={(latitude, longitude) => { if (mutation.isPending) return; setPickup("custom"); setValues(previous => ({ ...previous, latitude: latitude.toFixed(6), longitude: longitude.toFixed(6) })); }} />
        <label className="sharing-toggle"><input type="checkbox" checked={sharing} onChange={event => setSharing(event.target.checked)} />등록 후 공개 목록에 차량 공유</label>
        <p className="field-hint">공개 시 다른 사용자에게 픽업 위치만 표시합니다. 차량 번호는 공개하지 않습니다. 지도 좌표는 입력한 픽업 위치이며 실제 GPS가 아닙니다.</p>
      </fieldset>
      {validation && <p className="form-error" role="alert">{validation}</p>}
      {mutation.isError && <p className="form-error" role="alert">{errorMessage(mutation.error)}</p>}
      <button className="form-submit" disabled={mutation.isPending}>{mutation.isPending ? "차량 등록 중…" : "차량 등록"}</button>
    </form></>;
}
