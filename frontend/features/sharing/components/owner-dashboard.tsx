"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session";
import { listVehicles } from "@/services/garage-api";
import { errorMessage } from "@/lib/api-client";
import { OwnerVehicleCard } from "./owner-vehicle-card";
import { RentalList } from "./rental-list";
export function OwnerDashboard() {
  const session = useSession();
  const query = useQuery({ queryKey: ["vehicles", session.data?.id], queryFn: ({ signal }) => listVehicles(signal), enabled: !!session.data, refetchOnMount: "always", refetchInterval: 30000 });
  return <><p className="sharing-disclosure">로그인한 계정이 실제 서버에 등록한 차량입니다. 비공개 차량도 포함됩니다.</p><div className="sharing-title"><h2>내 차량</h2><Link href="/vehicles/register" className="form-secondary">차량 등록 +</Link></div>
    {query.isPending && <p role="status">차량을 불러오고 있습니다…</p>}{query.isError && <p className="form-error" role="alert">{errorMessage(query.error)} <button onClick={() => void query.refetch()}>다시 조회</button></p>}
    {query.data?.length === 0 && <p className="sharing-panel">차량을 등록한 후 공유를 활성화해주세요.</p>}
    <div className="rental-grid">{query.data?.map(v => <OwnerVehicleCard key={`${v.id}-${v.updatedAt}`} vehicle={v} />)}</div><RentalList mode="owner" /></>;
}
