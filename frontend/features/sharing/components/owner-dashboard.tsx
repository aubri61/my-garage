"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session";
import { listVehicles } from "@/services/garage-api";
import { errorMessage } from "@/lib/api-client";
import { LoadingSkeleton } from "@/components/platform/platform-ui";
import { listRentals } from "../api";
import { OwnerVehicleCard } from "./owner-vehicle-card";
import { OwnerOperations } from "./owner-operations";
import { RentalList } from "./rental-list";

export function OwnerDashboard() {
  const session = useSession();
  const query = useQuery({ queryKey: ["vehicles", session.data?.id], queryFn: ({ signal }) => listVehicles(signal), enabled: !!session.data, refetchOnMount: "always", refetchInterval: 30000 });
  const rentals = useQuery({ queryKey: ["rentals", session.data?.id], queryFn: ({ signal }) => listRentals(signal), enabled: !!session.data, refetchInterval: 15000 });
  const ownedRentals = rentals.data?.filter(rental => rental.ownerId === session.data?.id);
  const stats = [
    { label: "내 등록 차량", value: query.isError ? undefined : query.data?.length, unit: "대", hint: "비공개 차량 포함" },
    { label: "공유 중", value: query.isError ? undefined : query.data?.filter(v => v.sharingEnabled).length, unit: "대", hint: "공개 목록에 표시되는 차량" },
    { label: "승인 대기 요청", value: rentals.isError ? undefined : ownedRentals?.filter(r => r.status === "REQUESTED").length, unit: "건", hint: "새로운 대여 신청을 확인하세요" },
    { label: "진행 중인 대여", value: rentals.isError ? undefined : ownedRentals?.filter(r => ["CONFIRMED", "ACTIVE"].includes(r.status)).length, unit: "건", hint: "확정된 계약 및 이용 중인 차량" },
  ];
  return <>
    <div className="owner-overview"><div><h2>{session.data?.name}님, 내 차량의 오늘을 확인하세요.</h2><p>차량 현황부터 대여 요청까지 한곳에서 관리하세요.</p></div><Link href="/vehicles/register" className="platform-button">+ 새 차량 등록</Link></div>
    <dl className="owner-stats">{stats.map(stat => <div className="owner-stat" key={stat.label}><dt>{stat.label}</dt><dd><strong>{stat.value ?? "–"}</strong><span>{stat.unit}</span></dd><p>{stat.hint}</p></div>)}</dl>
    <RentalList mode="owner" dashboard view="requests" />
    <section id="owner-vehicles" className="sharing-section"><div className="sharing-title"><div><h2>내 등록 차량</h2><p className="section-description">공유 상태와 픽업 위치를 확인하고 차량 정보를 관리하세요.</p></div><Link href="/vehicles/register" className="platform-pill">차량 등록 +</Link></div>
      {query.isPending && <LoadingSkeleton />}
      {query.isError && <p className="form-error" role="alert">{errorMessage(query.error)} <button onClick={() => void query.refetch()}>다시 조회</button></p>}
      {!query.isError && query.data?.length === 0 && <div className="platform-empty"><h3>첫 차량을 등록해보세요</h3><p>차량을 등록한 후 공유를 활성화해주세요.</p><Link className="platform-pill" href="/vehicles/register">차량 등록하기</Link></div>}
      {!query.isError && <div className="rental-grid owner-vehicle-grid">{query.data?.map(v => <OwnerVehicleCard key={`${v.id}-${v.updatedAt}`} vehicle={v} />)}</div>}
    </section>
    <OwnerOperations vehicles={query.isError ? [] : query.data ?? []} rentals={rentals.isError ? [] : ownedRentals ?? []} pending={query.isPending || rentals.isPending} failed={query.isError || rentals.isError} />
    <RentalList mode="owner" dashboard view="ongoing" />
  </>;
}
