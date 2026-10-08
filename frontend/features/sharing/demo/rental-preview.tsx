import type { Dispatch } from "react";
import { rentalLabels } from "../types";
import { demoVehicles, type DemoAction, type DemoState } from "./state";

export function RentalPreview({ mode, state, dispatch }: { mode: "owner" | "renter"; state: DemoState; dispatch: Dispatch<DemoAction> }) {
  const vehicle = demoVehicles.find(v => v.id === state.vehicleId);
  if (!state.status || !vehicle) return <section className="sharing-panel sharing-section"><h2>대여 요청 및 계약</h2><p>대여자 모드에서 차량을 선택해 요청을 보내세요. 소유자 모드로 바꾸면 승인과 계약 동의를 체험할 수 있습니다.</p></section>;
  const owner = mode === "owner";
  const active = state.status === "ACTIVE";
  return <section className="sharing-panel sharing-section" aria-labelledby="demo-rental-heading">
    <div className="sharing-title"><h2 id="demo-rental-heading">{vehicle.manufacturer} {vehicle.model} · 예시 대여</h2><span className="sharing-status" role="status">{rentalLabels[state.status]}</span></div>
    <dl className="sharing-data"><div><dt>픽업 위치</dt><dd>{vehicle.pickupLocation}</dd></div><div><dt>체험 기간</dt><dd>가상 대여 2시간 · 양측 동의 후 즉시 시작</dd></div><div><dt>차량 잠금</dt><dd>{state.locked ? "LOCKED · 잠김" : "UNLOCKED · 잠금 해제"}</dd></div></dl>
    {state.status === "REQUESTED" && <><p>{owner ? "대여 요청을 검토하고 승인하거나 거절하세요." : "소유자의 승인을 기다리고 있습니다. 소유자 모드로 전환해 이어서 체험하세요."}</p>{owner && <div className="sharing-actions"><button onClick={() => dispatch({ type: "APPROVE" })}>대여 승인 체험</button><button onClick={() => dispatch({ type: "REJECT" })}>대여 거절 체험</button></div>}</>}
    {(state.status === "CONTRACT_PENDING" || active) && <>
      <details open={state.status === "CONTRACT_PENDING"}><summary>예시 계약 및 동의 상태</summary><p>지정된 픽업 위치에서 차량을 인수하고, 소유자 승인 후에만 가상 잠금 해제를 요청합니다. 이 동의는 법적 계약이나 전자서명이 아닙니다.</p><p>소유자: {state.ownerConsented ? "동의 완료" : "동의 대기"} · 대여자: {state.renterConsented ? "동의 완료" : "동의 대기"}</p></details>
      {state.status === "CONTRACT_PENDING" && <><p>양측 동의를 마치면 예시 접근 권한이 활성화됩니다. 모드를 전환해 다른 당사자의 동의를 진행하세요.</p><div className="sharing-actions"><button disabled={owner ? state.ownerConsented : state.renterConsented} onClick={() => dispatch({ type: owner ? "OWNER_CONSENT" : "RENTER_CONSENT" })}>{owner ? "소유자 계약 동의 체험" : "대여자 계약 동의 체험"}</button></div></>}
    </>}
    {active && <><p role="status">{state.revoked ? "접근 권한이 회수되었습니다. 잠금 해제를 요청할 수 없습니다." : "접근 권한 활성 · 허용 동작: 잠금 해제 요청"}</p>
      {state.unlock === "PENDING" && <p role="status">잠금 해제 요청 · 소유자 승인 대기</p>}{state.unlock === "APPROVED" && <p role="status">소유자 승인 완료 · 가상 차량 잠금이 해제되었습니다.</p>}{state.unlock === "REJECTED" && <p role="status">소유자가 잠금 해제 요청을 거절했습니다.</p>}
      <div className="sharing-actions">{owner ? <>
        {state.unlock === "PENDING" && <><button disabled={state.revoked} onClick={() => dispatch({ type: "APPROVE_UNLOCK" })}>잠금 해제 승인 체험</button><button onClick={() => dispatch({ type: "REJECT_UNLOCK" })}>잠금 해제 거절 체험</button></>}
        <button disabled={state.locked} onClick={() => dispatch({ type: "LOCK" })}>차량 잠그기 체험</button><button disabled={state.revoked} onClick={() => dispatch({ type: "REVOKE" })}>접근 권한 회수 체험</button>
      </> : <button disabled={state.revoked || !state.locked || state.unlock === "PENDING"} onClick={() => dispatch({ type: "REQUEST_UNLOCK" })}>잠금 해제 요청 체험</button>}
      <button onClick={() => dispatch({ type: "COMPLETE" })}>대여 종료 체험</button></div></>}
    {state.status === "COMPLETED" && <p>대여가 종료되고 접근 권한이 회수되었습니다. 차량은 잠긴 상태입니다.</p>}
    {state.status === "REJECTED" && <p>대여 요청이 거절되었습니다. 처음부터 다시 체험할 수 있습니다.</p>}
  </section>;
}
