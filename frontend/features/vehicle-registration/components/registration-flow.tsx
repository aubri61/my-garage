"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState, type FormEvent } from "react";
import { FormField } from "@/components/ui/form-field";
import { VehicleCertificateDetails } from "@/features/vehicle/components/vehicle-certificate";
import { VehicleMatch } from "@/features/vehicle-registration/components/vehicle-match";
import { ConnectionProgress } from "@/features/vehicle-registration/components/connection-progress";
import { registrationReducer, initialRegistrationState, isRegistrationPending, connectionProgressFor } from "@/features/vehicle-registration/reducer";
import { registerDemoVehicle, useDemoSession } from "@/mocks/demo-session";
import { lookupMockVehicle, confirmMockOwnership, createMockVehicleIdentity, issueMockVehicleCertificate, connectMockVehicle, mockRegistrationFixtures, mockConnectionScenarios, type MockConnectionScenario } from "@/mocks/vehicle-registration";

export function RegistrationFlow() {
  const { bfcacheId } = useRouter();
  // A fresh route entry starts a new registration; browser back restores the draft.
  return <RegistrationSteps key={bfcacheId} />;
}

function RegistrationSteps() {
  const session = useDemoSession();
  const [state, dispatch] = useReducer(registrationReducer, initialRegistrationState);
  const [scenario, setScenario] = useState<MockConnectionScenario>("success");
  const { phase, query, ownershipCode } = state;
  const busy = isRegistrationPending(state);
  const error = "error" in state ? state.error : "";
  const progress = connectionProgressFor(state);
  const request = useRef<AbortController | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => {
    // Activity hides routes without discarding state. Cancel the work and release
    // pending state so browser back restores the draft as a retryable form.
    request.current?.abort();
    request.current = null;
    dispatch({ type: "cancelled" });
  }, []);
  useEffect(() => { heading.current?.focus(); }, [phase]);

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.phase !== "lookup" || busy || request.current) return;
    if (!query.trim()) {
      dispatch({ type: "failed", error: "연결 코드 또는 VIN을 입력해주세요." });
      (event.currentTarget.elements.namedItem("vehicle-query") as HTMLInputElement)?.focus();
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    dispatch({ type: "lookupStarted" });
    try {
      const match = await lookupMockVehicle(query, session.registeredVehicleIds, controller.signal);
      controller.signal.throwIfAborted();
      dispatch({ type: "vehicleFound", candidate: match });
    } catch (cause) {
      if (!controller.signal.aborted) dispatch({ type: "failed", error: cause instanceof Error ? cause.message : "차량 조회에 실패했습니다." });
    } finally {
      if (request.current === controller) request.current = null;
    }
  }

  async function verifyAndConnect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.phase !== "ownership" || busy || request.current) return;
    if (!/^\d{6}$/.test(ownershipCode)) {
      dispatch({ type: "failed", error: "데모 확인 코드 6자리를 입력해주세요." });
      (event.currentTarget.elements.namedItem("ownership-code") as HTMLInputElement)?.focus();
      return;
    }
    const { candidate } = state;
    const controller = new AbortController();
    request.current = controller;
    dispatch({ type: "ownershipStarted" });
    try {
      await confirmMockOwnership(candidate, ownershipCode, controller.signal);
      controller.signal.throwIfAborted();
      dispatch({ type: "ownershipConfirmed" });
      const identity = await createMockVehicleIdentity(candidate, controller.signal);
      controller.signal.throwIfAborted();
      dispatch({ type: "identityCreated", identity });
      const certificate = await issueMockVehicleCertificate(identity, scenario, controller.signal);
      controller.signal.throwIfAborted();
      dispatch({ type: "certificateIssued", certificate });
      const vehicle = await connectMockVehicle(candidate, identity, certificate, controller.signal);
      controller.signal.throwIfAborted();
      registerDemoVehicle(vehicle.id);
      dispatch({ type: "connected", vehicle });
    } catch (cause) {
      if (!controller.signal.aborted) dispatch({ type: "failed", error: cause instanceof Error ? cause.message : "차량 연결에 실패했습니다. 다시 시도해주세요." });
    } finally {
      if (request.current === controller) request.current = null;
    }
  }

  if (session.mode === "demo") return <section className="flow-success"><h2>데모 계정에는 세 차량이 연결되어 있습니다.</h2><p>새 회원의 차량 등록 흐름은 회원가입 후 체험할 수 있습니다.</p><Link href="/signup" className="form-submit">회원가입부터 체험</Link><Link href="/garage" className="form-secondary">차고지로 돌아가기</Link></section>;

  return <>
    <p className="mock-disclosure registration-disclosure">모든 조회·소유권 확인·인증서 발급은 데모입니다. 실제 차량, 소유권 조회 서비스, PKI 또는 KMS와 연결하지 않습니다.</p>
    <nav className="registration-phases" aria-label="차량 등록 단계">
      <ol>{["차량 조회", "차량 정보 확인", "소유권 확인", "식별정보·인증서", "연결 완료"].map((label, index) => <li key={label} aria-current={index === ["lookup", "review", "ownership", "provisioning", "complete"].indexOf(phase) ? "step" : undefined}>{index + 1}. {label}</li>)}</ol>
    </nav>
    {phase === "lookup" && <>
      <h2 className="flow-heading" tabIndex={-1} ref={heading}>내 차량을 찾아보세요.</h2>
      <p className="dialog-description">차량의 연결 코드 또는 차대번호를 입력해주세요.</p>
      <form onSubmit={lookup} noValidate aria-busy={busy}>
        <fieldset className="form-fields" disabled={busy}><legend className="sr-only">차량 조회 정보</legend>
          <FormField name="vehicle-query" label="연결 코드 / VIN" value={query} onChange={query => dispatch({ type: "queryChanged", query })} error={error} maxLength={40} autoComplete="off" />
        </fieldset>
        <button type="submit" className="form-submit" disabled={busy}>{busy ? "차량 조회 중…" : "차량 조회"}</button>
      </form>
      <details className="demo-codes"><summary>데모 차량 코드 보기</summary><p>아래 코드는 실제 차량과 무관한 체험용 정보입니다.</p>
        {mockRegistrationFixtures.map(fixture => <button type="button" key={fixture.vehicleId} disabled={busy} onClick={() => dispatch({ type: "queryChanged", query: fixture.code })}>{fixture.code}<span>코드 입력</span></button>)}
      </details>
    </>}
    {state.phase === "review" && <>
      <h2 className="flow-heading" tabIndex={-1} ref={heading}>이 차량이 맞나요?</h2><VehicleMatch candidate={state.candidate} />
      <button className="form-submit" type="button" onClick={() => dispatch({ type: "vehicleConfirmed" })}>차량 확인 · 다음</button>
      <button className="form-secondary" type="button" onClick={() => dispatch({ type: "anotherVehicleRequested" })}>다른 차량 조회</button>
    </>}
    {state.phase === "ownership" && <>
      <h2 className="flow-heading" tabIndex={-1} ref={heading}>차량 소유권 확인</h2>
      <p className="dialog-description">{state.candidate.vehicle.modelName}의 연결을 진행합니다. 실제 서비스에서는 차량 또는 소유자에게 전달된 코드를 서버에서 확인합니다.</p>
      <form onSubmit={verifyAndConnect} noValidate aria-busy={busy}>
        <fieldset className="form-fields" disabled={busy}><legend className="sr-only">데모 소유권 확인</legend>
          <FormField name="ownership-code" label="데모 확인 코드" value={ownershipCode} onChange={code => dispatch({ type: "codeChanged", code })} error={error} hint="체험 코드: 123456 · 실제 본인/소유권 인증은 수행하지 않습니다." maxLength={6} autoComplete="off" />
          <label className="scenario-label" htmlFor="connection-scenario">데모 연결 결과</label>
          <select id="connection-scenario" value={scenario} onChange={event => setScenario(event.target.value as MockConnectionScenario)}>{mockConnectionScenarios.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        </fieldset>
        <button type="submit" className="form-submit" disabled={busy}>{busy ? "데모 코드 확인 중…" : "코드 확인 후 차량 연결"}</button>
      </form>
      <button type="button" className="form-secondary" disabled={busy} onClick={() => dispatch({ type: "reviewRequested" })}>차량 정보 다시 확인</button>
    </>}
    {phase === "provisioning" && <>
      <h2 className="flow-heading" tabIndex={-1} ref={heading}>{error ? "차량 연결을 완료하지 못했습니다." : "차량 연결을 준비하고 있습니다."}</h2>
      <ConnectionProgress progress={progress} />
      {error && <><p className="form-error" role="alert">{error}</p><button type="button" className="form-submit" onClick={() => { setScenario("success"); dispatch({ type: "retryRequested" }); }}>소유권 확인부터 다시 시도</button></>}
    </>}
    {state.phase === "complete" && <section className="flow-success">
      <span className="success-mark" aria-hidden="true">✓</span><h2 tabIndex={-1} ref={heading}>차량 연결이 완료되었습니다.</h2>
      <p>{state.vehicle.modelName} 차량이 내 차고지에 추가되었습니다.</p>
      <ConnectionProgress progress={progress} />
      <VehicleCertificateDetails identity={state.vehicle.identity} certificate={state.vehicle.certificate} />
      <Link href="/garage" className="form-submit">내 차량 확인하기</Link>
    </section>}
    <p className="sr-only" role="status">{busy ? phase === "provisioning" ? "데모 식별정보와 인증서를 준비하고 있습니다." : "요청을 처리하고 있습니다." : ""}</p>
    {phase !== "complete" && <Link href="/garage" className="flow-back">차고지로 돌아가기</Link>}
  </>;
}
