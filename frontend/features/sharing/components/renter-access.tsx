"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api, errorMessage } from "@/lib/api-client";
import type { Rental } from "../types";

export function RenterAccess({ rental, pending, onRequest }: { rental: Rental; pending: boolean; onRequest: () => void }) {
  const security = useQuery({ queryKey: ["sharing-security"], queryFn: async ({ signal }) => (await api.get<{ pkiRequired: boolean }>("/sharing/security", { signal })).data });
  const grant = rental.accessGrant;
  const waiting = rental.unlockRequests.some(request => request.status === "PENDING");
  const ended = !!grant?.revokedAt || ["COMPLETED", "CANCELLED", "REJECTED"].includes(rental.status);
  const allowed = !!grant?.active && !ended;
  return <section className="renter-access" aria-label="디지털 키 상태">
    <h5>디지털 키 상태</h5>
    <p className="key-status">{ended ? "접근 권한 종료" : !grant ? "계약 동의 후 접근 권한 발급" : allowed ? "접근 권한 활성" : "예약 확정 · 이용 시작 전"}</p>
    {allowed && <p role="status">{waiting ? "문 열기 요청을 보냈습니다. 소유자의 승인을 기다리고 있어요." : rental.lockState === "UNLOCKED" ? "소유자 승인 완료 · 가상 차량 잠금 해제됨" : "가상 차량 잠김"}</p>}
    <ol className="access-flow" aria-label="문 열기 절차"><li>디지털 키 상태 확인</li><li>문 열기 요청</li><li>소유자 승인</li><li>가상 잠금 해제</li></ol>
    {grant && <button className="platform-button" disabled={pending || security.isPending || security.isError || security.data?.pkiRequired || !allowed || waiting || rental.lockState === "UNLOCKED"} onClick={onRequest}>{pending ? "권한 확인 중…" : "문 열기 요청"}</button>}
    {security.isPending && grant && <p role="status">문 열기 보안 정책을 확인하고 있습니다…</p>}
    {security.isError && <p className="form-error" role="alert">보안 정책 조회 실패: {errorMessage(security.error)} <button className="platform-pill" onClick={() => void security.refetch()}>다시 조회</button></p>}
    {security.data?.pkiRequired && grant && <p className="sharing-disclosure">이 서버는 기기 서명이 필요합니다. 일반 사용자용 기기 등록·자동 서명은 아직 제공되지 않아 이 화면에서 요청할 수 없습니다. <Link href={`/security-lab?rentalId=${rental.id}`}>보안 실험실에서 테스트</Link></p>}
    <p className="field-hint">디지털 키는 대여 기간의 접근 권한입니다. 문 열기에는 소유자 승인이 필요하며 실제 차량을 제어하지 않습니다.</p>
  </section>;
}
