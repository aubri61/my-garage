"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session";
import { errorMessage } from "@/lib/api-client";
import { LoadingSkeleton, EmptyState } from "@/components/platform/platform-ui";
import { listRentals } from "../api";
import { rentalVehicleName } from "../presentation";
import { SignedUnlockForm } from "./signed-unlock-form";
export function PkiSecurityLab({ initialRentalId }: { initialRentalId?: number }) {
  const session = useSession();
  const [selectedId, setSelectedId] = useState(initialRentalId);
  const query = useQuery({ queryKey: ["rentals", session.data?.id], queryFn: ({ signal }) => listRentals(signal), enabled: !!session.data, refetchInterval: 15000 });
  const rentals = (query.isError ? [] : query.data ?? []).filter(r => r.renterId === session.data?.id && !!r.accessGrant);
  const rental = rentals.find(r => r.id === selectedId) ?? rentals[0];
  return <div className="pki-security-lab">
    <section className="sharing-panel"><p className="eyebrow">PKI · SECURITY LAB</p><h2>기기 서명 검증 실험</h2><p>테스트 CA 인증서로 일회용 챌린지를 서명하고 서버의 X.509 검증을 확인합니다. 실제 문 열기 요청이 생성되며 이후 소유자의 승인이 필요합니다.</p><p className="sharing-disclosure">일반 사용자용 기기 등록·인증서 발급·자동 서명은 아직 구현되지 않았습니다. 이 화면은 로컬 테스트 인증서를 사용하는 보안 검증용입니다. 개인키는 브라우저 메모리에서만 사용하며 서버 전송·영구 저장하지 않습니다.</p><Link className="platform-pill" href="/digital-key?mode=renter">내 디지털 키로 돌아가기</Link></section>
    {query.isPending ? <LoadingSkeleton /> : query.isError ? <p className="form-error" role="alert">{errorMessage(query.error)} <button onClick={() => void query.refetch()}>다시 조회</button></p> : !rental ? <EmptyState title="테스트할 대여 계약이 없습니다" description="본인이 대여자이며 양측 동의로 접근 권한이 발급된 계약이 필요합니다." /> : <section className="sharing-panel pki-lab-form">
      <label className="form-field">검증할 대여 계약<select value={rental.id} onChange={event => setSelectedId(Number(event.target.value))}>{rentals.map(r => <option value={r.id} key={r.id}>{rentalVehicleName(r.vehicleModel)} · 계약 #{r.id}</option>)}</select></label>
      <h2>{rentalVehicleName(rental.vehicleModel)}</h2><p className="key-status">{rental.accessGrant?.revokedAt ? "접근 권한 종료" : rental.accessGrant?.active ? "접근 권한 활성" : "접근 권한 비활성"} · 가상 차량 {rental.lockState === "LOCKED" ? "잠김" : "잠금 해제됨"}</p>
      {!rental.accessGrant?.active && <p className="field-hint">대여 기간 내 활성 접근 권한이 있어야 서명 요청을 보낼 수 있습니다.</p>}
      {rental.unlockRequests.some(u => u.status === "PENDING") && <p role="status">소유자 승인을 기다리는 요청이 있습니다.</p>}
      <Link className="platform-pill" href={`/contracts/${rental.id}`}>계약 및 승인 상태 보기</Link>
      <SignedUnlockForm key={rental.id} rental={rental} />
    </section>}
  </div>;
}
