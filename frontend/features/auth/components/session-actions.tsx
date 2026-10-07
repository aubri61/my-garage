"use client";
import { useRouter } from "next/navigation";
import { endDemoSession } from "@/mocks/demo-session";
export function SessionActions() {
  const router = useRouter();
  return <button type="button" className="header-logout" onClick={() => { endDemoSession(); router.replace("/login"); }}>로그아웃</button>;
}
