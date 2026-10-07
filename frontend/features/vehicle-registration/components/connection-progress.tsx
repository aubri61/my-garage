import type { ConnectionProgress as Progress } from "@/features/vehicle-registration/types";
import { connectionSteps } from "@/features/vehicle-registration/progress";
const labels = { waiting: "대기", running: "진행 중", complete: "완료", failed: "실패" };
export function ConnectionProgress({ progress }: { progress: Progress }) {
  return <ol className="connection-progress" aria-label="데모 차량 연결 진행 상태">
    {connectionSteps.map((step, index) => <li key={step.id} data-status={progress[step.id]} aria-current={progress[step.id] === "running" ? "step" : undefined}>
      <span className="step-number" aria-hidden="true">{progress[step.id] === "complete" ? "✓" : index + 1}</span>
      <span>{step.label}</span><span className="step-status">{labels[progress[step.id]]}</span>
    </li>)}
  </ol>;
}
