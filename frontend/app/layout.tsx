import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Garage | 내 차량 관리",
  description: "차량 상태 확인부터 안전한 소프트웨어 업데이트, 전기차 충전 예약까지. 나의 디지털 차고지, My Garage.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
