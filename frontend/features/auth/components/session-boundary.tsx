"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { AccountShell } from "@/components/layout/account-shell";
import { useSession } from "@/features/auth/session";
import { errorMessage } from "@/lib/api-client";

export function SessionBoundary({ children }: { children: ReactNode }) {
  const session = useSession();
  if (session.isPending) return <main className="account-main"><p role="status">차고지를 준비하고 있습니다…</p></main>;
  if (session.isError) return <AccountShell title="로그인 상태를 확인하지 못했습니다." description={errorMessage(session.error)}>
    <button className="form-submit" onClick={() => void session.refetch()}>다시 확인</button><Link href="/login" className="form-secondary">로그인</Link>
  </AccountShell>;
  if (!session.data) return <AccountShell title="내 차고지에 오신 것을 환영합니다." description="로그인이 필요하거나 세션이 만료되었습니다.">
    <Link href="/login" className="form-submit">로그인</Link><Link href="/signup" className="form-secondary">회원가입</Link>
  </AccountShell>;
  return <>{children}</>;
}
