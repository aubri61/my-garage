"use client";

import Link from "next/link";
import { ServiceIcon } from "@/components/ui/service-icon";
import { usePathname } from "next/navigation";

const destinations = [
  { href: "/owner", label: "대시보드", icon: "dashboard" },
  { href: "/bookings?mode=owner", label: "예약 및 계약", icon: "calendar" },
  { href: "/vehicles/register", label: "차량 등록", icon: "plus" },
  { href: "/digital-key?mode=owner", label: "디지털 접근 권한", icon: "lock" },
  { href: "/security", label: "소프트웨어 보안", icon: "shield" },
 ] as const;

export function OwnerNavigation() {
  const pathname = usePathname();
  return <aside className="host-sidebar"><p className="host-sidebar-label">소유자 관리</p>
    <nav aria-label="소유자 메뉴">{destinations.map(item => <Link key={item.href} href={item.href} aria-current={!item.href.includes("#") && pathname === item.href.split("?")[0] ? "page" : undefined}><ServiceIcon name={item.icon} />{item.label}</Link>)}</nav>
    <div className="host-sidebar-note"><span className="eyebrow">OWNER AUTHORIZATION</span><strong>접근 권한은 소유자가 승인합니다.</strong><p>계약 동의와 이용 기간을 확인한 후, 잠금 해제 요청을 관리하세요.</p><Link href="/digital-key?mode=owner">접근 권한 확인 →</Link></div>
  </aside>;
}
