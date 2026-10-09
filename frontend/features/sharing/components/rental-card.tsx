"use client";
import Link from "next/link";
import { VehiclePlaceholder } from "./vehicle-placeholder";
import { ContractConsent } from "./contract-consent";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { lockVehicle, rentalAction, unlockAction, type RentalAction } from "../api";
import { rentalLabels, type Rental } from "../types";
import { api } from "@/lib/api-client";
import { SignedUnlockForm } from "./signed-unlock-form";
import { errorMessage } from "@/lib/api-client";
import { rentalVehicleName, pickupAddress, personName } from "../presentation";
const unlockLabels = { PENDING: "승인 대기", APPROVED: "승인", REJECTED: "거절", EXPIRED: "만료", CANCELLED: "취소" };
export function RentalCard({ rental, mode, variant = "card" }: { rental: Rental; mode: "owner" | "renter"; variant?: "card" | "review" | "document" }) {
  const client = useQueryClient();
  const owner = mode === "owner";
  const security = useQuery({ queryKey: ["sharing-security"], queryFn: async ({ signal }) => (await api.get<{ pkiRequired: boolean }>("/sharing/security", { signal })).data });
  const mutation = useMutation({ mutationFn: (input: { action: RentalAction } | { unlockId: number; decision: "approve" | "reject" }) =>
    "action" in input ? rentalAction(rental.id, input.action) : unlockAction(input.unlockId, input.decision),
    onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ["rentals"] }), client.invalidateQueries({ queryKey: ["vehicles"] }), client.invalidateQueries({ queryKey: ["available-vehicles"] })]); } });
  const lock = useMutation({mutationFn:()=>lockVehicle(rental.vehicleId),onSuccess:async()=>{await Promise.all([client.invalidateQueries({queryKey:["rentals"]}),client.invalidateQueries({queryKey:["vehicles"]})]);}});
  function action(action: RentalAction) { if (!mutation.isPending) mutation.mutate({ action }); }
  const consent = owner ? rental.ownerConsentedAt : rental.renterConsentedAt;
  const grant = rental.accessGrant;
  if (owner && variant === "review" && rental.status === "REQUESTED") return <article className="sharing-panel rental-card rental-card--review owner-request-card" data-status={rental.status} data-rental-id={rental.id}>
    <div className="sharing-title"><span className="sharing-status">승인 대기</span><span className="owner-vehicle-meta">새 차량 렌탈 신청</span></div>
    <div className="owner-vehicle-identity"><VehiclePlaceholder manufacturer={rental.vehicleModel.split(" ")[0]} model={rental.vehicleModel.split(" ").slice(1).join(" ")} /><div><p className="owner-vehicle-meta">대여 신청자 · {personName(rental.renterName, "차량 대여자")}</p><h3>{rentalVehicleName(rental.vehicleModel)}</h3><p className="rental-price-summary">{rental.hourlyRate != null ? `시간당 ${rental.hourlyRate.toLocaleString("ko-KR")}원` : "가격 기록이 없는 기존 신청입니다."}</p></div></div>
    <div className="request-period" aria-label="대여 기간"><div><span>대여 시작</span><time dateTime={rental.startsAt}>{new Date(rental.startsAt).toLocaleDateString("ko-KR")}<strong>{new Date(rental.startsAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })}</strong></time></div><span aria-hidden="true">→</span><div><span>대여 종료</span><time dateTime={rental.endsAt}>{new Date(rental.endsAt).toLocaleDateString("ko-KR")}<strong>{new Date(rental.endsAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })}</strong></time></div></div>
    <div className="owner-vehicle-location"><span aria-hidden="true">⌖</span><p>{pickupAddress(rental.pickupLocation)}</p></div>
    {rental.estimatedTotal != null && <p className="request-total">{rental.billedHours}시간 · 예상 총액 <strong>{rental.estimatedTotal.toLocaleString("ko-KR")}원</strong></p>}
    <div className="sharing-actions request-card-actions"><button className="rental-approve" disabled={mutation.isPending} onClick={() => action("approve")}>대여 승인</button><button disabled={mutation.isPending} onClick={() => action("reject")}>대여 거절</button><Link href={`/contracts/${rental.id}`}>계약 상세 보기</Link></div>
    {mutation.isPending && <p role="status">신청을 처리하고 있습니다…</p>}{mutation.isError && <p className="form-error" role="alert">{errorMessage(mutation.error)}</p>}
  </article>;
  return <article className={`sharing-panel rental-card rental-card--${variant}`} data-status={rental.status} data-rental-id={rental.id}><div className="sharing-title"><h3>{rentalVehicleName(rental.vehicleModel)}</h3><span className="sharing-status">{rentalLabels[rental.status]}</span></div>
    <div className="rental-content-layout"><div className="rental-record"><div className="rental-party-banner"><span className="platform-avatar">{personName(owner ? rental.renterName : rental.ownerName).slice(0, 1)}</span><div><small>{owner ? "대여 신청자" : "차량 소유자"}</small><strong>{personName(owner ? rental.renterName : rental.ownerName)}</strong></div></div><div className="rental-card-image"><VehiclePlaceholder manufacturer={rental.vehicleModel.split(" ")[0]} model={rental.vehicleModel.split(" ").slice(1).join(" ")} /></div>
    <div className="sharing-actions"><Link href={`/contracts/${rental.id}`}>계약 상세 보기</Link>{rental.accessGrant && <Link href={`/digital-key?mode=${mode}`}>디지털 키 보기</Link>}</div>
    <dl className="rental-summary"><div><dt>{owner ? "대여자" : "소유자"}</dt><dd>{personName(owner ? rental.renterName : rental.ownerName, owner ? "차량 대여자" : "차량 소유자")}</dd></div><div><dt>픽업 주소</dt><dd>{pickupAddress(rental.pickupLocation)}</dd></div><div><dt>대여 기간</dt><dd>{new Date(rental.startsAt).toLocaleString("ko-KR")} ~ {new Date(rental.endsAt).toLocaleString("ko-KR")}</dd></div></dl>{rental.pickupDetail && <p>상세 위치: {rental.pickupDetail}</p>}{rental.pickupInstructions && <p>픽업 안내: {rental.pickupInstructions}</p>}
    <p className="rental-price-summary">{rental.hourlyRate != null ? `시간당 ${rental.hourlyRate.toLocaleString("ko-KR")}원 · ${rental.billedHours}시간 · 예상 총액 ${rental.estimatedTotal?.toLocaleString("ko-KR")}원` : "가격 기록이 없는 기존 계약입니다."}</p>
    {rental.ownerConsentedAt && rental.renterConsentedAt && <p>계약 확정 · 양측 동의 완료</p>}
    {!["REQUESTED", "REJECTED", "CANCELLED"].includes(rental.status) && <details open={variant === "document" || rental.status === "CONTRACT_PENDING"}><summary>계약 내용 확인</summary><p>{rental.terms}</p><p className="sharing-disclosure">모의 계약 · 법적 전자서명 서비스가 아닙니다.</p><p>계약 확정: {rental.ownerConsentedAt && rental.renterConsentedAt ? "양측 동의 완료" : "동의 대기"}</p>
      <p>소유자: {rental.ownerConsentedAt ? `동의 완료 · ${new Date(rental.ownerConsentedAt).toLocaleString("ko-KR")}` : "동의 대기"} · 대여자: {rental.renterConsentedAt ? `동의 완료 · ${new Date(rental.renterConsentedAt).toLocaleString("ko-KR")}` : "동의 대기"}</p>
</details>}
    </div><aside className="rental-authority"><p className="eyebrow">{rental.status === "REQUESTED" ? "OWNER REVIEW" : "CONTRACT & ACCESS"}</p><h4>{rental.status === "REQUESTED" ? "대여 신청 검토" : "계약 및 접근 권한"}</h4><p className="field-hint">{rental.status === "REQUESTED" ? "차량과 이용 기간을 확인해주세요. 승인 후 양측이 계약에 동의해야 예약이 확정됩니다." : "양측 동의가 완료되면 이용 기간에 접근 권한이 활성화됩니다. 잠금 해제에는 소유자의 승인이 필요합니다."}</p>
    {owner && rental.status === "REQUESTED" && <div className="sharing-actions"><button className="rental-approve" disabled={mutation.isPending} onClick={() => action("approve")}>대여 승인</button><button disabled={mutation.isPending} onClick={() => action("reject")}>대여 거절</button></div>}
      {rental.status === "CONTRACT_PENDING" && !consent && <ContractConsent pending={mutation.isPending} onConsent={() => action("consents")} />}
      {consent && <p className="consent-complete">✓ 내 계약 동의 완료</p>}
    {grant && !["COMPLETED", "CANCELLED", "REJECTED"].includes(rental.status) && <p className="key-status">{grant.revokedAt ? "차량 접근 권한이 종료되었습니다." : grant.active ? "디지털 키 발급 완료 · 차량 접근 가능" : "이용 시작 전 · 대여 기간에 차량 접근 가능"}{grant.active && <span> · {rental.lockState === "LOCKED" ? "차량 잠김" : "차량 잠금 해제됨"}</span>}</p>}
    <div className="sharing-actions">
      {!owner && grant && <button disabled={mutation.isPending || security.isPending || security.isError || security.data?.pkiRequired || !grant.active || rental.unlockRequests.some(u => u.status === "PENDING")} onClick={() => action("unlock-requests")}>잠금 해제 요청</button>}
      {owner && grant?.active && <button disabled={lock.isPending || rental.lockState === "LOCKED"} onClick={()=>lock.mutate()}>차량 문 잠그기</button>}
      {owner && grant && rental.status !== "COMPLETED" && <><button disabled={mutation.isPending || !!grant.revokedAt} onClick={() => action("access-grant/revoke")}>접근 권한 회수</button><button disabled={mutation.isPending} onClick={() => action("complete")}>대여 종료</button></>}
    </div>
    {!owner && grant?.active && <><SignedUnlockForm rental={rental} />{security.data?.pkiRequired && <p className="sharing-disclosure">등록된 기기 인증서로 잠금 해제를 요청해주세요.</p>}{security.isError && <p className="form-error" role="alert">보안 정책 조회 실패: {errorMessage(security.error)}</p>}</>}
    {rental.unlockRequests.length > 0 && <details open={rental.unlockRequests.some(u => u.status === "PENDING")}><summary>원격 해제 요청 이력 ({rental.unlockRequests.length})</summary><ul className="unlock-history">
      {rental.unlockRequests.map(u => <li key={u.id}>{u.pkiVerified ? "기기 인증 완료" : "접근 권한 확인 완료"} · {unlockLabels[u.status]} · {new Date(u.requestedAt).toLocaleString("ko-KR")}
        {owner && u.status === "PENDING" && <div className="sharing-actions"><button disabled={mutation.isPending || !grant?.active} onClick={() => mutation.mutate({ unlockId: u.id, decision: "approve" })}>잠금 해제 승인</button><button disabled={mutation.isPending || !grant?.active} onClick={() => mutation.mutate({ unlockId: u.id, decision: "reject" })}>잠금 해제 거절</button></div>}</li>)}</ul></details>}
    </aside></div>
    {lock.isError && <p role="alert" className="form-error">{errorMessage(lock.error)}</p>}
    {mutation.isPending && <p role="status">서버에서 권한과 상태를 확인하고 있습니다…</p>}
    {mutation.isError && <p className="form-error" role="alert">{errorMessage(mutation.error)}</p>}
    {mutation.isSuccess && <p role="status">서버에 반영되었습니다.</p>}
  </article>;
}
