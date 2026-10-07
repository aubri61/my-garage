"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AccountShell } from "@/components/layout/account-shell";
import { useDemoSession } from "@/mocks/demo-session";

export function SessionBoundary({ children }: { children: ReactNode }) {
  const session = useDemoSession();
  if (!session.ready) return <main className="account-main"><p role="status">차고지를 준비하고 있습니다…</p></main>;
  if (session.mode === "guest") return <AccountShell title="내 차고지에 오신 것을 환영합니다." description="로그인하거나 데모 계정으로 My Garage를 시작하세요.">
    <Link href="/login" className="form-submit">로그인</Link><Link href="/signup" className="form-secondary">회원가입</Link>
    <p className="mock-disclosure">프론트엔드 체험용 화면입니다. 실제 인증과 접근 제어는 서버 연동 시 적용합니다.</p>
  </AccountShell>;
  return <>{!session.storageAvailable && <p className="persistence-notice" role="status">브라우저 저장소를 사용할 수 없어 새로고침하면 데모 상태가 초기화됩니다.</p>}{children}</>;
}
