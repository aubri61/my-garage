"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormField } from "@/components/ui/form-field";
import { useSession } from "@/features/auth/session";
import { registerVehicle } from "@/services/garage-api";
import { errorMessage } from "@/lib/api-client";
import type { VehicleRequest } from "@/services/types";

export function ServerRegistration() {
  const session = useSession();
  const client = useQueryClient();
  const pending = useRef(false);
  const [values, setValues] = useState({ manufacturer: "", model: "", modelYear: "", licensePlate: "" });
  const mutation = useMutation({ mutationFn: registerVehicle, onSuccess: () => client.invalidateQueries({ queryKey: ["vehicles", session.data?.id] }) });
  function change(field: keyof typeof values, value: string) { setValues(previous => ({ ...previous, [field]: value })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !session.data) return;
    pending.current = true;
    const request: VehicleRequest = { manufacturer: values.manufacturer.trim(), model: values.model.trim(),
      modelYear: Number(values.modelYear), licensePlate: values.licensePlate.trim() };
    try { await mutation.mutateAsync(request); } catch { /* The mutation exposes the server error below. */ }
    finally { pending.current = false; }
  }
  if (mutation.isSuccess) return <section className="flow-success"><span className="success-mark" aria-hidden="true">✓</span>
    <h2>차량 등록이 완료되었습니다.</h2><p>{mutation.data.manufacturer} {mutation.data.model} · {mutation.data.licensePlate}</p>
    <Link href="/owner" className="form-submit">공유 설정하기</Link><Link href="/garage" className="form-secondary">내 차량 확인하기</Link></section>;
  return <><p className="registration-disclosure mock-disclosure">입력한 차량을 내 계정에 등록합니다. 실제 차량 연결·소유권 인증·인증서 발급은 수행하지 않습니다.</p>
    <form onSubmit={submit} aria-busy={mutation.isPending}>
      <fieldset className="form-fields" disabled={mutation.isPending}><legend className="sr-only">차량 등록 정보</legend>
        <FormField name="manufacturer" label="제조사" value={values.manufacturer} onChange={value => change("manufacturer", value)} maxLength={80} />
        <FormField name="model" label="차종" value={values.model} onChange={value => change("model", value)} maxLength={100} />
        <div className="form-field"><label htmlFor="model-year">연식</label>
        <input id="model-year" name="modelYear" type="number" required min={1886} max={2100} value={values.modelYear} onChange={event => change("modelYear", event.target.value)} /></div>
        <FormField name="licensePlate" label="차량 번호" value={values.licensePlate} onChange={value => change("licensePlate", value)} maxLength={30} />
      </fieldset>
      {mutation.isError && <p className="form-error" role="alert">{errorMessage(mutation.error)}</p>}
      <button className="form-submit" disabled={mutation.isPending}>{mutation.isPending ? "차량 등록 중…" : "차량 등록"}</button>
    </form></>;
}
