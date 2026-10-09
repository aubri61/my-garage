import Link from "next/link";
import { SessionBoundary } from "@/features/auth/components/session-boundary";
import { AccountShell } from "@/components/layout/account-shell";
export function ModeSelection() {
  return <SessionBoundary><AccountShell title="어떤 서비스를 이용하시겠어요?" description="한 계정으로 차량을 빌리거나 빌려줄 수 있습니다. 모드는 언제든 변경할 수 있습니다." wide>
    <div className="mode-grid"><Link href="/renter" className="sharing-panel mode-card"><p className="eyebrow">차량을 찾고 계신가요?</p><h2>차량 대여자</h2><strong>차량 빌리기 →</strong><p>지도에서 차량 검색<br />내 대여 요청 및 계약 관리</p></Link>
      <Link href="/owner" className="sharing-panel mode-card"><p className="eyebrow">공유할 차량이 있으신가요?</p><h2>차량 소유자</h2><strong>차량 빌려주기 →</strong><p>차량 등록 및 관리<br />대여 요청 확인 · 원격 접근 승인</p></Link></div>
    <p className="mock-disclosure">선택한 서비스는 상단 메뉴에서 언제든 바꿀 수 있습니다.</p>
  </AccountShell></SessionBoundary>;
}
