"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ServiceIcon } from "@/components/ui/service-icon";
import { SessionActions } from "@/features/auth/components/session-actions";
import { listRentals } from "@/features/sharing/api";
import { personName, rentalVehicleName } from "@/features/sharing/presentation";
import { rentalLabels } from "@/features/sharing/types";
import { rentalNotification } from "@/features/sharing/notifications";
import { useNotificationReadState } from "@/features/sharing/use-notification-read-state";
import type { UserResponse } from "@/services/types";
import { Dialog, LoadingSkeleton, EmptyState } from "./platform-ui";
export function Brand() { return <Link href="/mode" className="platform-brand"><span className="platform-brand-icon"><ServiceIcon name="vehicle" /></span>My Garage</Link>; }
export function AppHeader({ mode, user }: { mode: "owner" | "renter"; user?: UserResponse | null }) {
  const [open, setOpen] = useState(false);
  const query = useQuery({ queryKey: ["rentals", user?.id], queryFn: ({ signal }) => listRentals(signal), enabled: !!user, refetchInterval: 15000 });
  const { read, acknowledge } = useNotificationReadState(user?.id);
  const relevant = (query.isError ? [] : query.data ?? []).filter(r => r.ownerId === user?.id || r.renterId === user?.id).sort((a, b) => b.id - a.id);
  const notifications = relevant.map(r => rentalNotification(r, user!.id));
  const unread = notifications.filter(item => !read.has(item.key));
  const ordered = [...notifications].sort((a, b) => Number(!read.has(b.key)) - Number(!read.has(a.key)));
  function openNotifications() { acknowledge(notifications.map(item => item.key)); setOpen(true); }
  return <><header className="platform-header"><div className="platform-header-inner"><Brand /><nav className="platform-mode" aria-label="이용 모드"><Link href="/renter" aria-current={mode === "renter" ? "page" : undefined}>차량 빌리기</Link><Link href="/owner" aria-current={mode === "owner" ? "page" : undefined}>차량 빌려주기</Link></nav><div className="platform-header-actions"><Link className="platform-pill" href={`/bookings?mode=${mode}`}>예약·계약</Link><button className={`platform-pill platform-notification-button ${unread.length ? "has-unread" : ""}`} onClick={openNotifications} aria-label={`알림 ${unread.length}개`} aria-haspopup="dialog"><ServiceIcon name="bell" />알림{unread.length > 0 && <><span className="notification-light" aria-hidden="true" /><span className="platform-badge">{unread.length}</span><span className="sr-only">새 알림이 있습니다</span></>}</button><span className="platform-user"><span className="platform-avatar">{personName(user?.name, "회원").slice(0, 1)}</span><span>{personName(user?.name, "회원")} 님</span></span><SessionActions /></div></div></header>
  {open && <Dialog title="통합 알림" onClose={() => setOpen(false)}><p className="notification-description">차량 빌리기와 빌려주기의 예약·계약·접근 상태를 함께 확인하세요.</p>{query.isPending ? <LoadingSkeleton /> : query.isError ? <p role="alert">알림을 불러오지 못했습니다. <button className="platform-pill" onClick={() => void query.refetch()}>다시 조회</button></p> : ordered.length ? <div className="platform-notifications">{ordered.map(({ rental, mode: notificationMode, title, key }) => <Link key={key} data-mode={notificationMode} onClick={() => setOpen(false)} href={`/contracts/${rental.id}`}><span className={`notification-mode notification-mode--${notificationMode}`}>{notificationMode === "owner" ? "차량 빌려주기" : "차량 빌리기"}</span><strong>{title}</strong><span className="notification-vehicle">{rentalVehicleName(rental.vehicleModel)} · {rentalLabels[rental.status]}</span><span className="notification-period">{new Date(rental.startsAt).toLocaleString("ko-KR")} ~ {new Date(rental.endsAt).toLocaleString("ko-KR")}</span></Link>)}</div> : <EmptyState title="예약 알림이 없습니다" description="새 렌탈 신청과 계약 진행 상황이 이곳에 표시됩니다." />}</Dialog>}</>;
}
