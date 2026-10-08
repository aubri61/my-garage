"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ServiceIcon } from "@/components/ui/service-icon";
import { StatusBadge } from "@/components/ui/status-badge";
import { useSession } from "@/features/auth/session";
import { listScenarios, listHistory, verifyOta } from "@/services/garage-api";
import { errorMessage } from "@/lib/api-client";
import type { OtaScenario, OtaStatus, OtaCheckName } from "@/services/types";

const statusLabels: Record<OtaStatus, string> = { APPROVED: "검증 승인", BLOCKED: "검증 차단", SIMULATED_APPROVAL: "교육용 가상 승인" };
const checkLabels: Record<OtaCheckName, string> = { PACKAGE_FORMAT: "패키지 형식", TRUSTED_SIGNER: "신뢰된 서명자", SIGNATURE: "전자서명", FILE_INTEGRITY: "파일 무결성", COMPATIBILITY: "차량 호환성", VERSION_POLICY: "구성 요소·버전 정책", ROLLBACK: "롤백 방지" };
const checkStatuses = { PASSED: "통과", FAILED: "실패", NOT_RUN: "미실행" };

export function OtaSecurityLab({ vehicleId, vehicleName }: { vehicleId: number; vehicleName: string }) {
  const id = useId();
  const session = useSession();
  const client = useQueryClient();
  const pending = useRef(false);
  const [scenario, setScenario] = useState<OtaScenario>("VALID");
  const [protection, setProtection] = useState(true);
  const scenarios = useQuery({ queryKey: ["ota-scenarios", session.data?.id], queryFn: ({ signal }) => listScenarios(signal), enabled: !!session.data });
  const historyKey = ["ota-history", session.data?.id, vehicleId] as const;
  const history = useQuery({ queryKey: historyKey, queryFn: ({ signal }) => listHistory(vehicleId, signal), enabled: !!session.data });
  const verification = useMutation({ mutationKey: ["ota-verify", session.data?.id, vehicleId],
    mutationFn: (request: { scenario: OtaScenario; protectionEnabled: boolean }) => verifyOta(vehicleId, request),
    onSuccess: () => client.invalidateQueries({ queryKey: historyKey }),
  });
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || !session.data || !scenarios.data?.some(item => item.scenario === scenario)) return;
    pending.current = true;
    try { await verification.mutateAsync({ scenario, protectionEnabled: protection }); }
    catch { /* Mutation errors are rendered below; blocked verdicts are successful HTTP responses. */ }
    finally { pending.current = false; }
  }
  const result = verification.data;
  return <section className="primary-service update-service" aria-labelledby={`${id}-ota-title`}>
    <div className="service-heading"><span className="service-icon"><ServiceIcon name="shield" /></span><div><p className="service-kicker">{vehicleName}</p><h2 id={`${id}-ota-title`}>OTA Security Lab</h2></div></div>
    <p className="service-description">배포 주체·서명·파일 무결성·호환성·롤백 방지를 서버에서 검증합니다. 실제 설치는 수행하지 않습니다.</p>
    {scenarios.isPending && <p role="status">시나리오를 불러오고 있습니다…</p>}
    {scenarios.isError && <><p className="form-error" role="alert">{errorMessage(scenarios.error)}</p><button className="form-secondary" onClick={() => void scenarios.refetch()}>시나리오 다시 조회</button></>}
    {scenarios.isSuccess && (scenarios.data.length === 0 ? <p className="service-empty">지원하는 시나리오가 없습니다.</p> : <form onSubmit={submit} aria-busy={verification.isPending}>
      <fieldset className="form-fields" disabled={verification.isPending}>
        <legend className="sr-only">OTA 검증 설정</legend>
        <label className="scenario-label" htmlFor={`${id}-ota-scenario`}>검증 시나리오</label>
        <select id={`${id}-ota-scenario`} value={scenario} onChange={event => { setScenario(event.target.value as OtaScenario); verification.reset(); }}>{scenarios.data.map(item => <option key={item.scenario} value={item.scenario}>{item.scenario} · {item.description}</option>)}</select>
        <label className="scenario-label" htmlFor={`${id}-ota-protection`}><input id={`${id}-ota-protection`} type="checkbox" checked={protection} onChange={event => { setProtection(event.target.checked); verification.reset(); }} /> 보안 검증 ON</label>
      </fieldset>
      {!protection && <p className="action-note">보호 OFF는 검증 생략 시의 교육용 가상 승인 비교입니다. 실제 설치·침해·차량 제어는 수행하지 않습니다.</p>}
      <button className="form-submit" disabled={verification.isPending}>{verification.isPending ? "검증 실행 중…" : "검증 실행"}</button>
    </form>)}
    {verification.isError && <p className="form-error" role="alert">{errorMessage(verification.error)}</p>}
    {result && <section aria-label="검증 결과" aria-live="polite">
      <StatusBadge tone={result.status === "APPROVED" ? "success" : "warning"}>{statusLabels[result.status]}</StatusBadge>
      <p>{result.message}</p>{result.failureCode && <p className="form-error">{result.failureCode}</p>}
      <dl className="status-details">{result.checks.map(check => <div key={check.name}><dt>{checkLabels[check.name]}</dt><dd>{checkStatuses[check.status]}</dd></div>)}</dl>
      {result.simulatedRisk && <p className="connection-note">{result.simulatedRisk.code} · {result.simulatedRisk.description}</p>}
      <p className="field-hint">가상 기준: {result.simulationState.component} {result.simulationState.currentVersion} · 보안 카운터 {result.simulationState.securityVersion}</p>
    </section>}
    <section aria-label="검증 이력"><h3>검증 이력</h3>
      {history.isPending && <p role="status">이력을 불러오고 있습니다…</p>}
      {history.isError && <><p className="form-error" role="alert">{errorMessage(history.error)}</p><button className="form-secondary" onClick={() => void history.refetch()}>이력 다시 조회</button></>}
      {history.isSuccess && (history.data.length === 0 ? <p className="service-empty">아직 검증 이력이 없습니다.</p> : <ul>{history.data.map(item => <li key={item.id}>
        <p>{item.scenario} · {item.protectionEnabled ? "ON" : "OFF"} · {statusLabels[item.status]}</p>
        <time dateTime={item.executedAt}>{new Date(item.executedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</time>{item.failureCode && <p>{item.failureCode}</p>}
      </li>)}</ul>)}
    </section>
  </section>;
}
