"use client";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session";
import { errorMessage } from "@/lib/api-client";
import { listRentals } from "../api";
import { RentalCard } from "./rental-card";
export function RentalList({ mode, keysOnly = false, dashboard = false, view = "all" }: { mode: "owner" | "renter"; keysOnly?: boolean; dashboard?: boolean; view?: "all" | "requests" | "ongoing" }) {
  const session = useSession();
  const query = useQuery({ queryKey: ["rentals", session.data?.id], queryFn: ({ signal }) => listRentals(signal), enabled: !!session.data, refetchInterval: 15000, refetchOnWindowFocus: true });
  const rentals = (query.data ?? []).filter(rental => (mode === "owner" ? rental.ownerId : rental.renterId) === session.data?.id && (!keysOnly || !!rental.accessGrant));
  const current = rentals.filter(rental => !["COMPLETED", "REJECTED", "CANCELLED"].includes(rental.status)).sort((a, b) => mode === "renter" ? Number(b.status === "ACTIVE" || b.accessGrant?.active === true) - Number(a.status === "ACTIVE" || a.accessGrant?.active === true) || b.id - a.id : Number(b.status === "REQUESTED" || b.status === "CONTRACT_PENDING") - Number(a.status === "REQUESTED" || a.status === "CONTRACT_PENDING") || b.id - a.id);
  const history = rentals.filter(rental => ["COMPLETED", "REJECTED", "CANCELLED"].includes(rental.status));
  const heading = view === "ongoing" ? "진행 중인 대여 및 계약" : mode === "owner" ? "새 대여 요청" : "내 대여 요청 및 계약";
  const primary = current.filter(rental => mode !== "owner" || (view === "ongoing" ? rental.status !== "REQUESTED" : rental.status === "REQUESTED"));
  return <section className={`sharing-section request-board rental-list--${view} ${dashboard ? "host-request-board" : ""}`} aria-label={heading}><div className="section-heading"><h2>{heading}</h2><p>{mode === "owner" ? "신청을 확인하고 계약과 차량 접근을 관리하세요." : "승인과 계약 상태를 먼저 확인하세요."}</p></div>
    {query.isPending && <p role="status">대여 정보를 불러오고 있습니다…</p>}
    {query.isError && <p className="form-error" role="alert">{errorMessage(query.error)} <button onClick={() => void query.refetch()}>다시 조회</button></p>}
    {!query.isPending && !query.isError && primary.length === 0 && <p className="sharing-panel request-empty">{view === "ongoing" ? "진행 중인 대여 및 계약이 없습니다." : mode === "owner" ? "새 요청이 도착하면 여기에서 확인할 수 있습니다." : "진행 중인 대여 요청이 없습니다. 아래에서 차량을 선택해보세요."}</p>}
    <div className="rental-grid">{primary.map(rental => <RentalCard key={rental.id} rental={rental} mode={mode} variant={dashboard ? "review" : "card"} />)}</div>
    {view === "all" && mode === "owner" && current.some(r=>r.status!=="REQUESTED") && <section className="sharing-section"><h2>진행 중인 대여 및 계약</h2><div className="rental-grid">{current.filter(r=>r.status!=="REQUESTED").map(rental=><RentalCard key={rental.id} rental={rental} mode={mode} variant={dashboard ? "review" : "card"}/>)}</div></section>}
    {view !== "requests" && history.length > 0 && <details className="rental-history"><summary>지난 대여 내역 ({history.length})</summary><div className="rental-grid">{history.map(rental => <RentalCard key={rental.id} rental={rental} mode={mode} variant={dashboard ? "review" : "card"} />)}</div></details>}
  </section>;
}
