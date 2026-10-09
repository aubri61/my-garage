"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useSession } from "@/features/auth/session";
import { SessionBoundary } from "@/features/auth/components/session-boundary";
import { SessionActions } from "@/features/auth/components/session-actions";
import { personName } from "../presentation";
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
      <span className="header-profile">{personName(session.data?.name, "회원")} 님</span><SessionActions /></div></header>
    <main id="sharing-content" className="sharing-main"><p className="eyebrow">믿고 맡기는 차량 공유</p>
      <div className="sharing-title"><h1>{mode === "owner" ? "차량 빌려주기" : "차량 대여하기"}</h1><span role="status" className="connection-status">{connection}</span></div>
      {notification && <p className="sharing-panel sharing-notification" role="status">{notification}</p>}
      <p className="page-description">{mode === "owner" ? "대여 요청을 확인하고 내 차량의 공유를 관리하세요." : "가까운 차량을 찾고 원하는 기간에 이용을 신청하세요."}</p>{children}<footer className="service-boundary">차량 공유 체험 서비스입니다. 실제 차량 제어·결제·보험은 제공하지 않습니다.</footer></main></div>;
}
