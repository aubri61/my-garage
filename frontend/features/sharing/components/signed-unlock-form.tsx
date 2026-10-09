"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, errorMessage } from "@/lib/api-client";
import type { Rental } from "../types";
function pemBytes(pem: string) {
  const encoded = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  return new Uint8Array(Array.from(atob(encoded), c => c.charCodeAt(0))).buffer;
}
export function SignedUnlockForm({ rental }: { rental: Rental }) {
  const client = useQueryClient();
  const [certificate, setCertificate] = useState<File | null>(null);
  const [key, setKey] = useState<File | null>(null);
  const [deviceId, setDeviceId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const form = formRef.current;
    // Next may retain an inactive route in memory. Release selected files on exit.
    return () => { form?.reset(); setCertificate(null); setKey(null); setDeviceId(""); };
  }, []);
  const mutation = useMutation({ mutationFn: async () => {
    if (!certificate || !key || !deviceId) throw new Error("기기 인증서, PKCS#8 테스트 키와 기기 ID를 선택해주세요.");
    if (certificate.size > 12000 || key.size > 16000) throw new Error("파일 크기가 너무 큽니다.");
    if (!window.crypto?.subtle) throw new Error("Web Crypto를 사용할 수 없습니다. localhost 또는 HTTPS에서 실행해주세요.");
    // The private key is imported locally, non-extractable and held only in memory.
    const privateKey = await crypto.subtle.importKey("pkcs8", pemBytes(await key.text()), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
    const certificatePem = await certificate.text();
    const { data: challenge } = await api.post<{ id: number; payload: string; expiresAt: string }>(`/rentals/${rental.id}/unlock-challenges`);
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(challenge.payload));
    const signatureBase64 = btoa(Array.from(new Uint8Array(signature), byte => String.fromCharCode(byte)).join(""));
    return (await api.post<Rental>(`/rentals/${rental.id}/unlock-requests`, { challengeId: challenge.id, certificatePem, signatureBase64, deviceId })).data;
  }, onSuccess: () => client.invalidateQueries({ queryKey: ["rentals"] }) });
  const allowed = rental.accessGrant?.active && !rental.unlockRequests.some(u => u.status === "PENDING");
  function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); if (!mutation.isPending && allowed) mutation.mutate(); }
  return <details><summary>테스트 인증서로 서명된 잠금 해제 요청</summary>
    <p className="sharing-disclosure">오프라인 테스트 CA가 서명한 RSA 인증서만 지원합니다. 실차 디지털 키가 아닙니다. 개인키 파일은 서버로 전송하지 않으며 브라우저 저장소에 저장하지 않습니다.</p>
    <form ref={formRef} onSubmit={submit}><fieldset disabled={mutation.isPending || !allowed} className="form-fields"><legend className="sr-only">기기 접근 서명</legend>
      <label className="form-field">기기 ID<input required maxLength={80} value={deviceId} onChange={e => setDeviceId(e.target.value)} /></label>
      <label className="form-field">공개 기기 인증서 (.pem)<input type="file" accept=".pem" required onChange={e => setCertificate(e.target.files?.[0] ?? null)} /></label>
      <label className="form-field">로컬 테스트 개인키 (PKCS#8 PEM)<input type="file" accept=".pem" required onChange={e => setKey(e.target.files?.[0] ?? null)} /></label>
    </fieldset><button className="form-submit" disabled={mutation.isPending || !allowed}>{mutation.isPending ? "인증서·요청 서명 검증 중…" : "서명하여 잠금 해제 요청"}</button></form>
    {mutation.isError && <p className="form-error" role="alert">{errorMessage(mutation.error)}</p>}
    {mutation.isSuccess && <p role="status">PKI 검증을 통과해 소유자에게 승인 요청을 전송했습니다.</p>}
  </details>;
}
