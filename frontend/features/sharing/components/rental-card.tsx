"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rentalAction, unlockAction, type RentalAction } from "../api";
import { rentalLabels, type Rental } from "../types";
import { api } from "@/lib/api-client";
import { SignedUnlockForm } from "./signed-unlock-form";
import { errorMessage } from "@/lib/api-client";
const unlockLabels = { PENDING: "승인 대기", APPROVED: "승인", REJECTED: "거절", EXPIRED: "만료", CANCELLED: "취소" };
export function RentalCard({ rental, mode }: { rental: Rental; mode: "owner" | "renter" }) {
  const client = useQueryClient();
  const owner = mode === "owner";
  const security = useQuery({ queryKey: ["sharing-security"], queryFn: async ({ signal }) => (await api.get<{ pkiRequired: boolean }>("/sharing/security", { signal })).data });
  const mutation = useMutation({ mutationFn: (input: { action: RentalAction } | { unlockId: number; decision: "approve" | "reject" }) =>
    "action" in input ? rentalAction(rental.id, input.action) : unlockAction(input.unlockId, input.decision),
    onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ["rentals"] }), client.invalidateQueries({ queryKey: ["vehicles"] }), client.invalidateQueries({ queryKey: ["available-vehicles"] })]); } });
  function action(action: RentalAction) { if (!mutation.isPending) mutation.mutate({ action }); }
  const consent = owner ? rental.ownerConsentedAt : rental.renterConsentedAt;
  const grant = rental.accessGrant;
  return <article className="sharing-panel rental-card"><div className="sharing-title"><h3>{rental.vehicleModel}</h3><span className="sharing-status">{rentalLabels[rental.status]}</span></div>
    <p>대여 #{rental.id} · 픽업 {rental.pickupLocation}</p><p>{new Date(rental.startsAt).toLocaleString("ko-KR")} ~ {new Date(rental.endsAt).toLocaleString("ko-KR")}</p>
    {owner && rental.status === "REQUESTED" && <div className="sharing-actions"><button disabled={mutation.isPending} onClick={() => action("approve")}>대여 승인</button><button disabled={mutation.isPending} onClick={() => action("reject")}>대여 거절</button></div>}
    {rental.ownerConsentedAt && rental.renterConsentedAt && <p>계약 확정 · 양측 동의 완료</p>}
    {!["REQUESTED", "REJECTED", "CANCELLED"].includes(rental.status) && <details open={rental.status === "CONTRACT_PENDING"}><summary>계약 조건 · {rental.termsVersion}</summary><p>{rental.terms}</p><p className="sharing-disclosure">모의 계약 · 법적 전자서명 서비스가 아닙니다.</p><p>계약 확정: {rental.ownerConsentedAt && rental.renterConsentedAt ? "양측 동의 완료" : "동의 대기"}</p>
      <p>소유자: {rental.ownerConsentedAt ? `#${rental.ownerId} · ${new Date(rental.ownerConsentedAt).toLocaleString("ko-KR")}` : "동의 대기"} · 대여자: {rental.renterConsentedAt ? `#${rental.renterId} · ${new Date(rental.renterConsentedAt).toLocaleString("ko-KR")}` : "동의 대기"}</p>
      {rental.status === "CONTRACT_PENDING" && !consent && <button disabled={mutation.isPending} onClick={() => action("consents")}>위 계약 조건에 동의</button>}</details>}
    <dl className="sharing-data"><div><dt>가상 차량 상태</dt><dd>{rental.lockState === "LOCKED" ? "잠김 · LOCKED" : "해제됨 · UNLOCKED"}</dd></div>
      <div><dt>디지털 접근 권한</dt><dd>{!grant ? "미발급" : grant.revokedAt ? "회수됨" : grant.active ? "활성 · REQUEST_UNLOCK" : "기간 외 · 비활성"}</dd></div></dl>
    <div className="sharing-actions">
      {!owner && grant && <button disabled={mutation.isPending || security.isPending || security.isError || security.data?.pkiRequired || !grant.active || rental.unlockRequests.some(u => u.status === "PENDING")} onClick={() => action("unlock-requests")}>잠금 해제 요청</button>}
      {owner && grant && rental.status !== "COMPLETED" && <><button disabled={mutation.isPending || !!grant.revokedAt} onClick={() => action("access-grant/revoke")}>접근 권한 회수</button><button disabled={mutation.isPending} onClick={() => action("complete")}>대여 종료</button></>}
    </div>
    {!owner && grant && <><SignedUnlockForm rental={rental} />{security.data?.pkiRequired && <p className="sharing-disclosure">서버가 PKI 서명 요청을 필수로 요구합니다.</p>}{security.isError && <p className="form-error" role="alert">보안 정책 조회 실패: {errorMessage(security.error)}</p>}</>}
    {rental.unlockRequests.length > 0 && <details open={rental.unlockRequests.some(u => u.status === "PENDING")}><summary>원격 해제 요청 이력 ({rental.unlockRequests.length})</summary><ul className="unlock-history">
      {rental.unlockRequests.map(u => <li key={u.id}>#{u.id} · {u.pkiVerified ? "PKI 검증" : "DB 권한 검증"} · {unlockLabels[u.status]} · {new Date(u.requestedAt).toLocaleString("ko-KR")}
        {owner && u.status === "PENDING" && <div className="sharing-actions"><button disabled={mutation.isPending || !grant?.active} onClick={() => mutation.mutate({ unlockId: u.id, decision: "approve" })}>잠금 해제 승인</button><button disabled={mutation.isPending || !grant?.active} onClick={() => mutation.mutate({ unlockId: u.id, decision: "reject" })}>잠금 해제 거절</button></div>}</li>)}</ul></details>}
    {mutation.isPending && <p role="status">서버에서 권한과 상태를 확인하고 있습니다…</p>}
    {mutation.isError && <p className="form-error" role="alert">{errorMessage(mutation.error)}</p>}
    {mutation.isSuccess && <p role="status">서버에 반영되었습니다.</p>}
  </article>;
}
