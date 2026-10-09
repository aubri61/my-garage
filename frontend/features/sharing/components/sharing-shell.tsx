"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useSession } from "@/features/auth/session";
import { SessionBoundary } from "@/features/auth/components/session-boundary";
import { SessionActions } from "@/features/auth/components/session-actions";
import { useSharingEvents } from "../use-sharing-events";
export function SharingShell({ mode, children }: { mode: "owner" | "renter"; children: ReactNode }) {
  return <SessionBoundary><AuthenticatedShell mode={mode}>{children}</AuthenticatedShell></SessionBoundary>;
}
function AuthenticatedShell({ mode, children }: { mode: "owner" | "renter"; children: ReactNode }) {
  const session = useSession();
  const { connection, notification } = useSharingEvents(session.data?.id);
  return <div className="sharing-app"><a className="skip-link" href="#sharing-content">본문으로 바로가기</a>
    <header className="app-header"><div className="header-inner"><Link href="/mode" className="brand">My Garage</Link>
      <nav className="header-nav" aria-label="차량 공유 메뉴"><Link href="/renter" aria-current={mode === "renter" ? "page" : undefined}>차량 빌리기</Link>
        <Link href="/owner" aria-current={mode === "owner" ? "page" : undefined}>차량 빌려주기</Link><Link href="/mode">모드 선택</Link></nav>
      <span className="header-profile">{session.data?.name} 님</span><SessionActions /></div></header>
    <main id="sharing-content" className="sharing-main"><p className="eyebrow">TRUSTED P2P VEHICLE SHARING</p>
      <div className="sharing-title"><h1>{mode === "owner" ? "내 차량 공유 관리" : "차량을 빌려보세요"}</h1><span role="status" className="connection-status">{connection}</span></div>
      {notification && <p className="sharing-panel sharing-notification" role="status">{notification}</p>}
      <p className="sharing-disclosure">학습용 시뮬레이션 · 실제 차량 제어, 결제, 보험 및 법적 전자서명은 제공하지 않습니다.</p>{children}</main></div>;
}
