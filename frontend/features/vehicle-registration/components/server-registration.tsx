"use client";

import { LargeSelect } from "@/components/ui/large-select";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PickupLocationField } from "@/components/maps/pickup-location-field";
import { FormField } from "@/components/ui/form-field";
import { useSession } from "@/features/auth/session";
import { registerVehicle } from "@/services/garage-api";
import { errorMessage } from "@/lib/api-client";
import { vehicleCatalog, modelLabel, validKoreanPlate } from "../catalog";
import type { VehicleRequest } from "@/services/types";

export function ServerRegistration() {
  const session = useSession();
  const client = useQueryClient();
  const pending = useRef(false);
  const [values, setValues] = useState({ manufacturer: "", model: "", modelYear: "", licensePlate: "", pickupLocation: "", pickupDetail: "", pickupInstructions: "", latitude: "", longitude: "" });
  const [sharing, setSharing] = useState(false);
  const [validation, setValidation] = useState("");
  const mutation = useMutation({ mutationFn: registerVehicle, onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ["vehicles", session.data?.id] }), client.invalidateQueries({ queryKey: ["available-vehicles"] })]); } });
  function change(field: keyof typeof values, value: string) { setValues(previous => ({ ...previous, [field]: value })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !session.data) return;
    if (!values.manufacturer.trim() || !values.model.trim() || !values.licensePlate.trim()) { setValidation("제조사, 차종, 차량 번호를 입력해주세요."); return; }
    if (!validKoreanPlate(values.licensePlate)) { setValidation("차량 번호를 확인해주세요. 예: 123가4567 또는 서울12가3456"); return; }
    if ((sharing || values.pickupLocation.trim() || values.latitude.trim() || values.longitude.trim()) && (!values.pickupLocation.trim() || !values.latitude.trim() || !values.longitude.trim())) {
      setValidation("픽업 위치와 위도·경도를 함께 입력해주세요."); return;
    }
    setValidation(""); pending.current = true;
    const request: VehicleRequest = { manufacturer: values.manufacturer.trim(), model: values.model.trim(),
      modelYear: Number(values.modelYear), licensePlate: values.licensePlate.replace(/\s|-/g, ""),
      ...(values.pickupLocation.trim() ? { sharing: { enabled: sharing, pickupLocation: values.pickupLocation.trim(), latitude: Number(values.latitude), longitude: Number(values.longitude), pickupDetail: values.pickupDetail.trim(), pickupInstructions: values.pickupInstructions.trim() } } : {}) };
    try { await mutation.mutateAsync(request); } catch { /* The mutation exposes the server error below. */ }
    finally { pending.current = false; }
  }
  if (mutation.isSuccess) return <section className="flow-success"><span className="success-mark" aria-hidden="true">✓</span>
    <h2>차량 등록이 완료되었습니다.</h2><p>{mutation.data.manufacturer} {mutation.data.model} · {mutation.data.licensePlate}</p>
    <p>{mutation.data.sharingEnabled ? "공유 공개 · 다른 사용자가 공개 목록에서 조회할 수 있습니다." : "비공개 · 내 차량 목록에서 공유를 활성화할 수 있습니다."}</p><Link href="/owner" className="form-submit">내 차량 관리하기</Link>{/* 고급 차고지·OTA 진입 UI는 숨기고 기존 경로는 보존합니다. */}{false && <Link href="/garage" className="form-secondary">기존 차고지·OTA 확인하기</Link>}</section>;
  return <><p className="registration-disclosure mock-disclosure">입력한 차량을 내 계정에 등록합니다. 기본 정보를 입력하고 픽업 위치와 공개 여부를 설정해주세요.</p>
    <form onSubmit={submit} aria-busy={mutation.isPending}>
      <fieldset className="form-fields" disabled={mutation.isPending}><legend className="sr-only">차량 등록 정보</legend><section className="registration-step"><h2><span>1</span> 차량 기본 정보</h2><p className="field-hint">제조사와 차종을 선택해주세요.</p>
        <LargeSelect label="제조사" required value={values.manufacturer} placeholder="제조사 선택" options={[...Object.keys(vehicleCatalog), "기타"].map(value => ({ value, label: value }))} onChange={value => setValues(previous => ({ ...previous, manufacturer: value, model: "" }))} />
        {values.manufacturer === "기타" ? <FormField name="model" label="차종" value={values.model} onChange={value => change("model", value)} maxLength={100} /> : <LargeSelect label="차종" required disabled={!values.manufacturer || mutation.isPending} value={values.model} placeholder="차종 선택" options={(vehicleCatalog[values.manufacturer] ?? []).map(value => ({ value, label: modelLabel(values.manufacturer, value) }))} onChange={value => change("model", value)} />}
        <LargeSelect label="연식" required value={values.modelYear} placeholder="연식 선택" options={Array.from({ length: 142 }, (_, index) => ({ value: String(2027 - index), label: `${2027 - index}년` }))} onChange={value => change("modelYear", value)} />
        <FormField name="licensePlate" label="차량 번호" value={values.licensePlate} onChange={value => change("licensePlate", value)} maxLength={30} />
        <p className="field-hint">번호판을 직접 입력해주세요. 예: 123가4567</p></section>
        <section className="registration-step"><h2><span>2</span> 픽업 위치</h2>
        <PickupLocationField value={values.pickupLocation} latitude={values.latitude} longitude={values.longitude} disabled={mutation.isPending} detail={values.pickupDetail} instructions={values.pickupInstructions}
          onDetailChange={value => change("pickupDetail", value)} onInstructionsChange={value => change("pickupInstructions", value)}
          onTextChange={value => setValues(previous => ({ ...previous, pickupLocation: value, latitude: "", longitude: "" }))}
          onLocationChange={(pickupLocation, latitude, longitude) => { setValues(previous => ({ ...previous, pickupLocation, latitude: latitude.toFixed(6), longitude: longitude.toFixed(6) })); }}
          onCoordinatesChange={(latitude, longitude) => setValues(previous => ({ ...previous, pickupLocation: "", latitude, longitude }))} />
        </section><section className="registration-step"><h2><span>3</span> 공유 설정</h2>
        <label className="sharing-toggle"><input type="checkbox" checked={sharing} onChange={event => setSharing(event.target.checked)} />등록 후 공개 목록에 차량 공유</label>
        <p className="field-hint">공개 시 다른 사용자에게 픽업 위치만 표시합니다. 차량 번호는 공개하지 않습니다. 공유하지 않는 차량도 내 차량에서 관리할 수 있습니다.</p></section>
      </fieldset>
      {validation && <p className="form-error" role="alert">{validation}</p>}
      {mutation.isError && <p className="form-error" role="alert">{errorMessage(mutation.error)}</p>}
      <button className="form-submit" disabled={mutation.isPending}>{mutation.isPending ? "차량 등록 중…" : "차량 등록"}</button>
    </form></>;
}
