import Link from "next/link";
import { Brand } from "@/components/platform/app-header";
import { ServiceIcon } from "@/components/ui/service-icon";
import type { ReactNode } from "react";

export function AccountShell({ title, description, children, wide = false }: { title: string; description: string; children: ReactNode; wide?: boolean }) {
  return <div className="sharing-app account-app">
    <a className="skip-link" href="#account-content">본문으로 바로가기</a>
    <header className="account-header"><Brand /><nav aria-label="계정 메뉴"><Link href="/login" aria-label="로그인 페이지로 이동">로그인</Link><Link href="/signup" aria-label="회원가입 페이지로 이동">회원가입</Link></nav></header>
    <div className={wide ? "" : "auth-layout auth-centered"}><main id="account-content" className={`account-main ${wide ? "account-wide" : ""}`}>
      {!wide && <div className="auth-symbol" aria-hidden="true"><ServiceIcon name="vehicle" /></div>}
      <p className="eyebrow">신뢰할 수 있는 차량 원격 공유</p><h1>{title}</h1><p className="account-description">{description}</p>
      {children}
    </main></div>
  </div>;
}
