"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ServiceIcon } from "@/components/ui/service-icon";
import { SessionActions } from "@/features/auth/components/session-actions";
import { listRentals } from "@/features/sharing/api";
import { personName, rentalVehicleName } from "@/features/sharing/presentation";
import { rentalLabels } from "@/features/sharing/types";
import type { UserResponse } from "@/services/types";
import { Dialog, LoadingSkeleton, EmptyState } from "./platform-ui";
export function Brand() { return <Link href="/mode" className="platform-brand"><span className="platform-brand-icon"><ServiceIcon name="vehicle" /></span>My Garage</Link>; }
export function AppHeader({ mode, user }: { mode: "owner" | "renter"; user?: UserResponse | null }) {
  const [open, setOpen] = useState(false);
  const query = useQuery({ queryKey: ["rentals", user?.id], queryFn: ({ signal }) => listRentals(signal), enabled: !!user, refetchInterval: 15000 });
  const relevant = (query.data ?? []).filter(r => (mode === "owner" ? r.ownerId : r.renterId) === user?.id);
  const attention = relevant.filter(r => r.status === "REQUESTED" || r.status === "CONTRACT_PENDING" || r.unlockRequests.some(request => request.status === "PENDING"));
  return <><header className="platform-header"><div className="platform-header-inner"><Brand /><nav className="platform-mode" aria-label="이용 모드"><Link href="/renter" aria-current={mode === "renter" ? "page" : undefined}>차량 빌리기</Link><Link href="/owner" aria-current={mode === "owner" ? "page" : undefined}>차량 빌려주기</Link></nav><div className="platform-header-actions"><Link className="platform-pill" href={`/bookings?mode=${mode}`}>예약·계약</Link><button className="platform-pill" onClick={() => setOpen(true)} aria-label={`알림 ${attention.length}개`}>알림{attention.length > 0 && <span className="platform-badge">{attention.length}</span>}</button><span className="platform-user"><span className="platform-avatar">{personName(user?.name, "회원").slice(0, 1)}</span><span>{personName(user?.name, "회원")} 님</span></span><SessionActions /></div></div></header>
  {open && <Dialog title="예약 알림" onClose={() => setOpen(false)}>{query.isPending ? <LoadingSkeleton /> : query.isError ? <p role="alert">알림을 불러오지 못했습니다.</p> : attention.length ? <div className="platform-notifications">{attention.map(rental => <Link key={rental.id} onClick={() => setOpen(false)} href={`/bookings?mode=${mode}`}><strong>{rentalVehicleName(rental.vehicleModel)}</strong><span>{rental.unlockRequests.some(request=>request.status === "PENDING") ? "문 열기 승인 필요" : rentalLabels[rental.status]}</span></Link>)}</div> : <EmptyState title="확인이 필요한 알림이 없습니다" description="새 대여 요청과 계약 진행 상황을 알려드려요." />}</Dialog>}</>;
}
