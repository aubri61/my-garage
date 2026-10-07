import Link from "next/link";
import type { ReactNode } from "react";

export function AccountShell({ title, description, children, wide = false }: { title: string; description: string; children: ReactNode; wide?: boolean }) {
  return (
    <>
      <a className="skip-link" href="#account-content">본문으로 바로가기</a>
      <header className="account-header"><Link href="/login" className="brand">My Garage</Link><span className="demo-label">프론트엔드 데모</span></header>
      <main id="account-content" className={`account-main ${wide ? "account-wide" : ""}`}>
        <p className="eyebrow">내 차량과 연결되는 일상</p>
        <h1>{title}</h1><p className="account-description">{description}</p>
        {children}
      </main>
    </>
  );
}
