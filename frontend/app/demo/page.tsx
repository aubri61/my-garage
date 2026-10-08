import { AccountShell } from "@/components/layout/account-shell";
import { SharingDemo } from "@/features/sharing/demo/sharing-demo";

export default function DemoPage() {
  return <AccountShell title="차량 공유 서비스 체험" description="차량 검색부터 계약 동의, 소유자 승인과 가상 잠금 해제까지 직접 살펴보세요." wide><SharingDemo /></AccountShell>;
}
