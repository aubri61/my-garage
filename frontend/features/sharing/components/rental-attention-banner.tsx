"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session";
import { listRentals } from "../api";
import { rentalLabels } from "../types";
import { rentalVehicleName, pickupAddress } from "../presentation";
import { VehiclePlaceholder } from "./vehicle-placeholder";
export function RentalAttentionBanner() {
  const session = useSession();
  const query = useQuery({ queryKey: ["rentals", session.data?.id], queryFn: ({ signal }) => listRentals(signal), enabled: !!session.data, refetchInterval: 15000, refetchOnWindowFocus: true });
  const current = (query.isError ? [] : query.data ?? []).filter(r => r.renterId === session.data?.id && !["COMPLETED", "REJECTED", "CANCELLED"].includes(r.status));
  const active = current.filter(r => ["ACTIVE", "CONFIRMED"].includes(r.status) && Date.parse(r.startsAt) <= query.dataUpdatedAt && Date.parse(r.endsAt) > query.dataUpdatedAt);
  const priority = [...current].sort((a, b) => Number(b.status === "CONTRACT_PENDING") - Number(a.status === "CONTRACT_PENDING") || b.id - a.id);
  return <>
    {active.length > 0 && <section className="renter-current-rentals renter-top-section" aria-labelledby="current-rental-title"><div className="sharing-title"><div><p className="eyebrow">MY CURRENT RENTAL</p><h2 id="current-rental-title">현재 이용 중인 차량</h2></div><Link href="/bookings?mode=renter" className="platform-pill">내가 빌린 차량 전체 보기</Link></div><div className="current-rental-grid">{active.map(rental => {
      const separator = rental.vehicleModel.indexOf(" ");
      return <article className="current-rental-card" key={rental.id}>
        <VehiclePlaceholder manufacturer={separator > 0 ? rental.vehicleModel.slice(0, separator) : ""} model={separator > 0 ? rental.vehicleModel.slice(separator + 1) : rental.vehicleModel} />
        <div className="current-rental-information"><span className="platform-badge">대여 기간 진행 중</span><h3>{rentalVehicleName(rental.vehicleModel)}</h3><p>{new Date(rental.startsAt).toLocaleString("ko-KR")} ~ {new Date(rental.endsAt).toLocaleString("ko-KR")}</p><p>픽업 위치: {pickupAddress(rental.pickupLocation)}</p><p>{rental.accessGrant?.revokedAt ? "접근 권한 회수됨" : rental.accessGrant?.active ? "디지털 접근 권한 활성화" : "접근 권한 상태는 계약에서 확인해주세요."}</p></div>
        <div className="current-rental-actions"><Link href={`/contracts/${rental.id}`} className="platform-button">상세 보기</Link><Link href="/digital-key?mode=renter" className="platform-pill">디지털 접근 권한</Link></div>
      </article>;
    })}</div></section>}
    {(query.isPending || query.isError || current.length > 0) && <section className="market-attention request-board" aria-label="내 대여 요청 및 계약"><div><h2>내 대여 요청 및 계약</h2><p>{query.isPending ? "예약을 확인하고 있어요" : query.isError ? "예약 정보를 확인하지 못했어요" : current.length ? `${current.length}건의 예약 · ${current.filter(r => r.status === "CONTRACT_PENDING").length}건의 계약 동의가 필요해요` : "진행 중인 대여 요청이 없습니다. 차량을 선택해보세요."}</p></div>{priority.length > 0 && <span className="platform-badge">{rentalLabels[priority[0].status]}</span>}{query.isError && <button type="button" className="platform-pill" onClick={() => void query.refetch()}>다시 조회</button>}<Link href="/bookings?mode=renter" className="platform-pill">내 예약 확인</Link></section>}
  </>;
}
