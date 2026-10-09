"use client";
import type { ReactNode } from "react";
import { useSession } from "@/features/auth/session";
import { SessionBoundary } from "@/features/auth/components/session-boundary";
import { RentalAttentionBanner } from "./rental-attention-banner";
import { OwnerNavigation } from "@/components/platform/owner-navigation";
import { AppHeader } from "@/components/platform/app-header";
import { useSharingEvents } from "../use-sharing-events";
export function SharingShell({ mode, children, title }: { mode: "owner" | "renter"; children: ReactNode; title?: string }) {
  return <SessionBoundary signedOutTitle={title ?? (mode === "renter" ? "차량 대여하기" : "차량 빌려주기")} loadingText="차량 공유 화면을 준비하고 있습니다…"><AuthenticatedShell mode={mode} title={title}>{children}</AuthenticatedShell></SessionBoundary>;
}
function AuthenticatedShell({ mode, children, title }: { mode: "owner" | "renter"; children: ReactNode; title?: string }) {
  const session = useSession();
  const { connection, notification } = useSharingEvents(session.data?.id);
  return <div className={`sharing-app ${mode === "renter" ? "renter-app" : "owner-app"}`}><a className="skip-link" href="#sharing-content">본문으로 바로가기</a>
    <AppHeader mode={mode} user={session.data} />
    <div className={mode === "owner" ? "host-workspace" : "market-workspace"}>{mode === "owner" && <OwnerNavigation />}<main id="sharing-content" className={`sharing-main ${mode === "owner" && !title ? "host-dashboard" : ""}`}>{mode === "renter" && !title && <RentalAttentionBanner />}<p className="eyebrow">믿고 맡기는 차량 공유</p>
      <div className="sharing-title"><h1>{title ?? (mode === "owner" ? "차량 빌려주기" : "차량 대여하기")}</h1><span role="status" className="connection-status">{connection}</span></div>
      {notification && <p className="sharing-panel sharing-notification" role="status">{notification}</p>}
      <p className="page-description">{title === "보안 실험실" ? "테스트 인증서의 서명과 차량 접근 보안 정책을 검증하세요." : title === "내가 빌린 차량" ? "이용 중인 차량과 예약, 계약 및 지난 대여 내역을 확인하세요." : title === "차량 등록" ? "차량 기본 정보와 공유 조건, 픽업 위치를 등록하세요." : title === "계약 확인" ? "예약 정보를 확인하고 계약 동의와 접근 권한 상태를 관리하세요." : mode === "owner" ? "대여 요청을 확인하고 내 차량의 공유를 관리하세요." : "가까운 차량을 찾고 원하는 기간에 이용을 신청하세요."}</p>{children}<footer className="service-boundary">차량 공유 체험 서비스입니다. 실제 차량 제어·결제·보험은 제공하지 않습니다.</footer></main></div></div>;
}
