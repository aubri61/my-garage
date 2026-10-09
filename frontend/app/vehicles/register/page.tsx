import { AccountShell } from "@/components/layout/account-shell";
import { SessionBoundary } from "@/features/auth/components/session-boundary";
import { RegistrationFlow } from "@/features/vehicle-registration/components/registration-flow";
export default function VehicleRegisterPage() {
  return <SessionBoundary><AccountShell title="내 차량 등록하기" description="내 계정에 차량을 저장하고 공개 픽업 위치와 공유 여부를 설정하세요." wide><RegistrationFlow /></AccountShell></SessionBoundary>;
}
