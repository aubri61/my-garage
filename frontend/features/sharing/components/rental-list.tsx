"use client";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session";
import { errorMessage } from "@/lib/api-client";
import { listRentals } from "../api";
import { RentalCard } from "./rental-card";
export function RentalList({ mode }: { mode: "owner" | "renter" }) {
  const session = useSession();
  const query = useQuery({ queryKey: ["rentals", session.data?.id], queryFn: ({ signal }) => listRentals(signal), enabled: !!session.data,
    refetchInterval: 15000, refetchOnWindowFocus: true });
  const rentals = query.data?.filter(r => (mode === "owner" ? r.ownerId : r.renterId) === session.data?.id);
  return <section className="sharing-section"><h2>{mode === "owner" ? "대여 신청 및 원격 접근 승인" : "내 대여 요청 및 계약"}</h2>
    {query.isPending && <p role="status">대여 정보를 불러오고 있습니다…</p>}
    {query.isError && <p className="form-error" role="alert">{errorMessage(query.error)} <button onClick={() => void query.refetch()}>다시 조회</button></p>}
    {rentals?.length === 0 && <p className="sharing-panel">아직 대여 요청이 없습니다.</p>}
    <div className="rental-grid">{rentals?.map(r => <RentalCard key={r.id} rental={r} mode={mode} />)}</div></section>;
}
