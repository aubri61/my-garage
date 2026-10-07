import type { ConnectionStep } from "./types";
export const connectionSteps: readonly { id: ConnectionStep; label: string }[] = [
  { id: "identity", label: "차량 식별정보 생성" },
  { id: "certificate", label: "차량 인증서 발급" },
  { id: "connection", label: "차량 연결" },
];
