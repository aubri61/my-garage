import Link from "next/link";
import { SessionActions } from "@/features/auth/components/session-actions";

export function AppHeader({ displayName, hasVehicles = true, preview = false }: { displayName: string; hasVehicles?: boolean; preview?: boolean }) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <Link href="/garage" className="brand" aria-label="My Garage 내 차고지">
          <svg width="30" height="30" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <path d="m3 11 11-7 11 7v13H3V11Z" stroke="currentColor" strokeWidth="1.6" />
            <path d="M8 24V13h12v11M8 17h12M8 21h12" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          <span>My Garage</span>
        </Link>
        <nav aria-label="차고지 메뉴" className="header-nav">
          {hasVehicles && <><a href="/garage#vehicles">내 차량</a><a href="/garage#controls">원격 제어</a><a href="/garage#updates">업데이트</a></>}
          <Link href="/vehicles/register">차량 등록</Link>
        </nav>
        <span className="header-profile">
          <span className="profile-avatar" aria-hidden="true">{displayName.charAt(0)}</span>
          {displayName} 님
        </span>
        {preview ? <Link href="/login" className="header-logout">로그인</Link> : <SessionActions />}
      </div>
    </header>
  );
}
