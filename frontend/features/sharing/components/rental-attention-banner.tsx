"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session";
import { listRentals } from "../api";
import { rentalLabels } from "../types";
export function RentalAttentionBanner() {
  const session = useSession();
  const query = useQuery({ queryKey: ["rentals", session.data?.id], queryFn: ({ signal }) => listRentals(signal), enabled: !!session.data });
  const current = (query.data ?? []).filter(r => r.renterId === session.data?.id && !["COMPLETED", "REJECTED", "CANCELLED"].includes(r.status));
  return <section className="market-attention request-board" aria-label="내 대여 요청 및 계약"><div><strong>내 대여 요청 및 계약</strong><p>{query.isPending ? "예약을 확인하고 있어요" : query.isError ? "예약 정보를 확인하지 못했어요" : current.length ? `${current.length}건의 예약 · ${current.filter(r => r.status === "CONTRACT_PENDING").length}건의 계약 동의가 필요해요` : "진행 중인 대여 요청이 없습니다. 차량을 선택해보세요."}</p></div>{current.length > 0 && <span className="platform-badge">{rentalLabels[current[0].status]}</span>}<Link href="/bookings" className="platform-pill">내 예약 확인</Link></section>;
}
