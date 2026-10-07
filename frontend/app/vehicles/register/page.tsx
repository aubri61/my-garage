import { AccountShell } from "@/components/layout/account-shell";
import { SessionBoundary } from "@/features/auth/components/session-boundary";
import { RegistrationFlow } from "@/features/vehicle-registration/components/registration-flow";
export default function VehicleRegisterPage() {
  return <SessionBoundary><AccountShell title="내 차량 연결하기" description="차량을 확인하고 디지털 차고지에 연결하세요." wide><RegistrationFlow /></AccountShell></SessionBoundary>;
}
