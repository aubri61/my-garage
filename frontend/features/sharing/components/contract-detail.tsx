"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session";
import { api, errorMessage } from "@/lib/api-client";
import { rentalLabels, type Rental } from "../types";
import { personName } from "../presentation";
import { SharingShell } from "./sharing-shell";
import { RentalCard } from "./rental-card";
import { LoadingSkeleton } from "@/components/platform/platform-ui";

export function ContractDetail({ id }: { id: number }) {
  const user = useSession();
  const query = useQuery({ queryKey: ["rentals", user.data?.id, id], queryFn: async ({ signal }) => (await api.get<Rental>(`/rentals/${id}`, { signal })).data, enabled: !!user.data });
  const rental = query.data;
  const phase = !rental || ["REJECTED", "CANCELLED"].includes(rental.status) ? -1 : rental.status === "REQUESTED" ? 0 : rental.status === "CONTRACT_PENDING" ? 2 : rental.status === "COMPLETED" ? 4 : 3;
  const mode = rental?.ownerId === user.data?.id ? "owner" : "renter";
  return <SharingShell title="계약 확인" mode={mode}><div className="contract-document-page">
    <Link className="document-back" href={`/bookings?mode=${mode}`}>← 예약 및 계약 목록</Link>
    {query.isPending ? <LoadingSkeleton /> : query.isError ? <p role="alert" className="form-error">{errorMessage(query.error)} <button type="button" onClick={() => void query.refetch()}>다시 조회</button></p> : rental && <>
      <header className="contract-document-heading"><div><p className="eyebrow">MY GARAGE · RENTAL AGREEMENT</p><h2>차량 대여 계약</h2><p>이용 조건을 확인하고 양측의 계약 동의를 완료해주세요.</p></div><span className="sharing-status">{rentalLabels[rental.status]}</span></header>
      <ol className="contract-stage-strip" aria-label="대여 절차">{["대여 신청", "소유자 승인", "양측 계약 동의", "기간 내 접근 권한"].map((label, index) => <li key={label} data-state={phase === index ? "current" : phase > index ? "done" : "waiting"} aria-current={phase === index ? "step" : undefined}><span>{String(index + 1).padStart(2, "0")}</span>{label}</li>)}</ol>
      <div className="contract-party-status"><div><span className="eyebrow">CONTRACT PARTIES</span><strong>계약 당사자 및 동의 상태</strong><p>모의 계약입니다. 법적 전자서명·보험·면허 확인을 제공하지 않습니다.</p></div><dl>{[["소유자", rental.ownerName, rental.ownerConsentedAt], ["대여자", rental.renterName, rental.renterConsentedAt]].map(([role, name, consent]) => <div key={role}><dt>{role} · {personName(name)}</dt><dd>{consent ? `동의 완료 · ${new Date(consent).toLocaleString("ko-KR")}` : "동의 대기"}</dd></div>)}</dl></div>
      <RentalCard key={id} rental={rental} mode={mode} variant="document" />
    </>}
  </div></SharingShell>;
}
