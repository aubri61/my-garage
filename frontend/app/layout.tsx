import type { Metadata } from "next";
import "./globals.css";
import "@/components/platform/design-system.css";
import "@/components/platform/stitch-layout.css";
import { QueryProvider } from "@/lib/query-provider";

export const metadata: Metadata = {
  title: "My Garage | 신뢰할 수 있는 차량 원격 공유",
  description: "대여 신청, 계약 동의, 접근 권한 및 안전한 가상 차량 제어를 연결하는 P2P 차량 공유 시뮬레이션.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body><QueryProvider>{children}</QueryProvider></body>
    </html>
  );
}
