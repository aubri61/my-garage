import Link from "next/link";
import { GarageDashboard } from "@/features/garage/components/garage-dashboard";
import { mockGarageDashboard } from "@/mocks/garage";

export default function DemoPage() {
  return <><p className="demo-notice">별도 화면 체험 · 모든 차량·상태·인증서는 예시입니다. 실제 계정 로그인과 API 호출은 수행하지 않습니다. <Link href="/login">로그인으로 돌아가기</Link></p>
    <GarageDashboard preview data={mockGarageDashboard} serviceAvailability={{ updates: false, charging: false }} /></>;
}
