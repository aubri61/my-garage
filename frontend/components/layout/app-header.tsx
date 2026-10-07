import Link from "next/link";

export function AppHeader({ displayName }: { displayName: string }) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <Link href="/garage" className="brand" aria-label="My Garage 내 차고지">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="m3 11 11-7 11 7v13H3V11Z" stroke="currentColor" strokeWidth="1.5" /><path d="M8 24V13h12v11M8 17h12M8 21h12" stroke="currentColor" strokeWidth="1.5" /></svg>
          <span>My Garage<span className="brand-dot">.</span></span>
        </Link>
        <nav aria-label="차고지 메뉴" className="header-nav">
          <a href="#vehicles">내 차량</a>
          <a href="#updates">소프트웨어 업데이트</a>
          <a href="#charging">충전 예약</a>
        </nav>
        <span className="header-profile"><span className="profile-avatar" aria-hidden="true">{displayName.charAt(0)}</span>{displayName} 님</span>
      </div>
    </header>
  );
}
