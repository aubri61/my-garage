"use client";

import { LargeSelect } from "@/components/ui/large-select";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PickupLocationField } from "@/components/maps/pickup-location-field";
import { FormField } from "@/components/ui/form-field";
import { useSession } from "@/features/auth/session";
import { registerVehicle, updateVehicle } from "@/services/garage-api";
import { errorMessage } from "@/lib/api-client";
import { vehicleCatalog, vehicleCategory, modelLabel, validKoreanPlate } from "../catalog";
import { VehiclePlaceholder } from "@/features/sharing/components/vehicle-placeholder";
import type { VehicleResponse, VehicleRequest } from "@/services/types";

export function ServerRegistration({ vehicle }: { vehicle?: VehicleResponse }) {
  const session = useSession();
  const client = useQueryClient();
  const pending = useRef(false);
  const [values, setValues] = useState({ manufacturer: vehicle?.manufacturer ?? "", model: vehicle?.model ?? "", modelYear: String(vehicle?.modelYear ?? ""), licensePlate: vehicle?.licensePlate ?? "", pickupLocation: vehicle?.pickupLocation ?? "", pickupDetail: vehicle?.pickupDetail ?? "", pickupInstructions: vehicle?.pickupInstructions ?? "", latitude: String(vehicle?.pickupLatitude ?? ""), longitude: String(vehicle?.pickupLongitude ?? ""), hourlyRate: String(vehicle?.hourlyRate ?? ""), powerType: vehicle?.powerType ?? "", description: vehicle?.description ?? "", minimumRentalHours: String(vehicle?.minimumRentalHours ?? 1) });
  const [plateChecked, setPlateChecked] = useState(false);
  const [rateChecked, setRateChecked] = useState(false);
  const [rateDisplay, setRateDisplay] = useState(vehicle?.hourlyRate?.toLocaleString("ko-KR") ?? "");
  const [sharing, setSharing] = useState(vehicle?.sharingEnabled ?? false);
  const [validation, setValidation] = useState("");
  const mutation = useMutation({ mutationFn: (request: VehicleRequest) => vehicle ? updateVehicle(vehicle.id, request) : registerVehicle(request), onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ["vehicles", session.data?.id] }), client.invalidateQueries({ queryKey: ["available-vehicles"] })]); window.scrollTo({ top: 0, behavior: "instant" }); } });
  function change(field: keyof typeof values, value: string) { setValues(previous => ({ ...previous, [field]: value })); }
  const plateError = plateChecked && !validKoreanPlate(values.licensePlate) ? "차량 번호를 확인해주세요. 예: 123가4567" : undefined;
  const rate = Number(values.hourlyRate);
  const rateError = rateChecked && (!Number.isSafeInteger(rate) || rate < 100 || rate > 1000000 || rate % 100 !== 0) ? "100원 이상 1,000,000원 이하, 100원 단위로 입력해주세요." : undefined;
  const category = vehicleCategory(values.manufacturer, values.model);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !session.data) return;
    if (!values.manufacturer.trim() || !values.model.trim()) { setValidation("제조사, 차종, 차량 번호를 입력해주세요."); return; }
    if (!vehicleCatalog[values.manufacturer]?.includes(values.model)) { setValidation("사진이 준비된 차종을 목록에서 선택해주세요."); return; }
    if (!validKoreanPlate(values.licensePlate)) { setPlateChecked(true); document.getElementById("licensePlate")?.focus(); return; }
    if ((sharing || values.pickupLocation.trim() || values.latitude.trim() || values.longitude.trim()) && (!values.pickupLocation.trim() || !values.latitude.trim() || !values.longitude.trim())) {
      setValidation("검색 결과를 선택하거나 지도에서 픽업 위치를 지정해주세요."); return;
    }
    if (!Number.isSafeInteger(rate) || rate < 100 || rate > 1000000 || rate % 100 !== 0) { setRateChecked(true); document.getElementById("hourlyRate")?.focus(); return; }
    setValidation(""); pending.current = true;
    const request: VehicleRequest = { manufacturer: values.manufacturer.trim(), model: values.model.trim(),
      hourlyRate: Number(values.hourlyRate), minimumRentalHours: Number(values.minimumRentalHours), description: values.description.trim(), ...(category ? { powerType: values.powerType || category.powerTypes[0], bodyType: category.bodyType } : {}),
      modelYear: Number(values.modelYear), licensePlate: values.licensePlate.replace(/\s|-/g, ""),
      ...(values.pickupLocation.trim() ? { sharing: { enabled: sharing, pickupLocation: values.pickupLocation.trim(), latitude: Number(values.latitude), longitude: Number(values.longitude), pickupDetail: values.pickupDetail.trim(), pickupInstructions: values.pickupInstructions.trim() } } : {}) };
    try { await mutation.mutateAsync(request); } catch { /* The mutation exposes the server error below. */ }
    finally { pending.current = false; }
  }
  if (mutation.isSuccess) return <section className="flow-success vehicle-registration-success" aria-labelledby="registration-success-title">
    <span className="success-mark" aria-hidden="true">✓</span><p className="eyebrow">{vehicle ? "VEHICLE UPDATED" : "VEHICLE REGISTERED"}</p>
    <h2 id="registration-success-title">{vehicle ? "차량 수정이 완료되었습니다." : "차량 등록이 완료되었습니다."}</h2>
    <p>내 차량에서 등록 정보와 공유 설정을 관리할 수 있습니다.</p>
    <div className="registration-success-vehicle"><VehiclePlaceholder manufacturer={mutation.data.manufacturer} model={mutation.data.model} /><div><h3>{mutation.data.manufacturer} {modelLabel(mutation.data.manufacturer, mutation.data.model)}</h3><p>{mutation.data.modelYear}년식 · {mutation.data.licensePlate}</p><span className="platform-badge">{mutation.data.sharingEnabled ? "공개 목록에 표시" : "비공개 차량"}</span></div></div>
    <Link href="/owner" className="form-submit">내 차량 관리하기</Link>
  </section>;
  return <><nav className="registration-outline" aria-label="등록 항목"><ol>{["차량 정보", "대여 조건", "픽업 위치", "최종 확인"].map((label, index) => <li key={label}><a href={`#registration-section-${index + 1}`}><span>{index + 1}</span>{label}</a></li>)}</ol></nav><div className="registration-layout"><div><p className="registration-disclosure mock-disclosure">입력한 차량을 내 계정에 등록합니다. 기본 정보를 입력하고 픽업 위치와 공개 여부를 설정해주세요.</p>
    <form onSubmit={submit} aria-busy={mutation.isPending}>
      <fieldset className="form-fields" disabled={mutation.isPending}><legend className="sr-only">차량 등록 정보</legend><section id="registration-section-1" className="registration-step"><h2><span>1</span> 차량 기본 정보</h2><p className="field-hint">사진이 준비된 제조사와 차종만 선택할 수 있습니다.</p>
        <LargeSelect label="제조사" required value={values.manufacturer} placeholder="제조사 선택" options={Object.keys(vehicleCatalog).map(value => ({ value, label: value }))} onChange={value => setValues(previous => ({ ...previous, manufacturer: value, model: "", powerType: "" }))} />
        {<LargeSelect label="차종" required disabled={!values.manufacturer || mutation.isPending} value={values.model} placeholder="차종 선택" options={(vehicleCatalog[values.manufacturer] ?? []).map(value => ({ value, label: modelLabel(values.manufacturer, value) }))} onChange={value => setValues(previous => ({ ...previous, model: value, powerType: "" }))} />}
        <LargeSelect label="연식" required value={values.modelYear} placeholder="연식 선택" options={Array.from({ length: 142 }, (_, index) => ({ value: String(2027 - index), label: `${2027 - index}년` }))} onChange={value => change("modelYear", value)} />
        {category && <><LargeSelect label="동력 유형" value={values.powerType || category.powerTypes[0]} options={category.powerTypes.map(value => ({ value, label: value }))} onChange={value => change("powerType", value)} /><p className="field-hint">차체 분류: {category.bodyType}</p></>}
        <FormField name="licensePlate" label="차량 번호" value={values.licensePlate} onChange={value => change("licensePlate", value)} onBlur={() => setPlateChecked(true)} error={plateError} hint={plateChecked && !plateError && values.licensePlate ? "올바른 차량 번호 형식입니다." : "예: 123가4567"} maxLength={30} /></section>
        <section id="registration-section-2" className="registration-step"><h2><span>2</span> 대여 조건</h2><div className="form-field"><label htmlFor="hourlyRate">시간당 대여 가격 (원)</label><div className="currency-input"><input id="hourlyRate" type="text" inputMode="numeric" required value={rateDisplay} onBlur={() => { setRateDisplay(values.hourlyRate ? rate.toLocaleString("ko-KR") : ""); setRateChecked(true); }} onChange={event => { const raw = event.target.value.replace(/,/g, ""); if (/^\d*$/.test(raw)) { setRateDisplay(event.target.value); change("hourlyRate", raw); } }} aria-invalid={!!rateError} aria-describedby={rateError ? "hourlyRate-error" : "hourlyRate-hint"} placeholder="예: 12,000" /><span>원</span></div><p id="hourlyRate-hint" className="field-hint">최소 100원 · 100원 단위로 설정해주세요. 실제 결제는 제공하지 않습니다.</p>{rateError && <p id="hourlyRate-error" className="field-error">{rateError}</p>}</div><label className="form-field">최소 대여 시간<input type="number" min="1" max="24" required value={values.minimumRentalHours} onChange={event => change("minimumRentalHours", event.target.value)} /></label><label className="form-field">차량 설명<textarea maxLength={2000} value={values.description} onChange={event => change("description", event.target.value)} placeholder="차량 이용 시 알아두면 좋은 내용을 적어주세요" /></label><label className="sharing-toggle"><input type="checkbox" checked={sharing} onChange={event => setSharing(event.target.checked)} />등록 후 공개 목록에 차량 공유</label></section>
        <section id="registration-section-3" className="registration-step"><h2><span>3</span> 픽업 위치</h2>
        <PickupLocationField value={values.pickupLocation} latitude={values.latitude} longitude={values.longitude} disabled={mutation.isPending} detail={values.pickupDetail} instructions={values.pickupInstructions}
          onDetailChange={value => change("pickupDetail", value)} onInstructionsChange={value => change("pickupInstructions", value)}
          onTextChange={value => setValues(previous => ({ ...previous, pickupLocation: value, latitude: "", longitude: "" }))}
          onLocationChange={(pickupLocation, latitude, longitude) => { setValues(previous => ({ ...previous, pickupLocation, latitude: latitude.toFixed(6), longitude: longitude.toFixed(6) })); }}
          onCoordinatesChange={(latitude, longitude) => setValues(previous => ({ ...previous, pickupLocation: "", latitude, longitude }))} />
        </section>
        <section id="registration-section-4" className="registration-step registration-review"><h2><span>4</span> 등록 정보 확인</h2><p>{values.manufacturer} {modelLabel(values.manufacturer, values.model)} {values.modelYear && `${values.modelYear}년식`}</p><p>시간당 {values.hourlyRate ? `${Number(values.hourlyRate).toLocaleString("ko-KR")}원` : "가격을 입력해주세요"} · 최소 {values.minimumRentalHours}시간</p><p>픽업 주소: {values.pickupLocation || "픽업 위치를 선택해주세요"}</p><p>{sharing ? "공개 목록에 공유" : "비공개 · 내 차량에서 관리"}</p></section>
      </fieldset>
      {validation && <p className="form-error" role="alert">{validation}</p>}
      {mutation.isError && <p className="form-error" role="alert">{errorMessage(mutation.error)}</p>}
      <div className="registration-submit-row"><Link className="platform-pill" href="/owner">← 내 차량 관리</Link><button className="form-submit" disabled={mutation.isPending}>{mutation.isPending ? "차량 등록 중…" : vehicle ? "차량 수정 저장" : "차량 등록"}</button></div>
    </form></div><aside className="registration-preview" aria-label="등록 차량 미리보기"><p className="eyebrow">VEHICLE PREVIEW</p><h2>내 차량 미리보기</h2><p className="field-hint">현재 입력한 정보입니다. 등록 후 서버에 저장됩니다.</p><VehiclePlaceholder manufacturer={values.manufacturer} model={values.model} /><p className="renter-card-make">{values.manufacturer || "제조사 미선택"} · {values.modelYear ? `${values.modelYear}년식` : "연식 미선택"}</p><h3>{modelLabel(values.manufacturer, values.model) || "차종을 선택해주세요"}</h3><p className="preview-price">{values.hourlyRate ? `${Number(values.hourlyRate).toLocaleString("ko-KR")}원` : "요금 미입력"}<span> / 시간</span></p><span className="platform-badge">{sharing ? "등록 후 공유 공개" : "비공개 등록"}</span><hr /><p className="field-hint">{values.pickupLocation || "픽업 위치를 선택하면 이곳에 표시됩니다."}</p><p className="sharing-disclosure">차종 참고 이미지를 사용합니다. 차량 번호는 공개 목록에 표시되지 않습니다.</p></aside></div></>;
}
