"use client";

import { useQuery } from "@tanstack/react-query";
import { GarageDashboard } from "@/features/garage/components/garage-dashboard";
import { SessionBoundary } from "@/features/auth/components/session-boundary";
import { useSession } from "@/features/auth/session";
import { listVehicles } from "@/services/garage-api";
import { vehicleView } from "@/features/vehicle/api-view";
import { errorMessage } from "@/lib/api-client";

export function GarageEntry() {
  return <SessionBoundary><ServerGarage /></SessionBoundary>;
}
function ServerGarage() {
  const session = useSession();
  const vehicles = useQuery({ queryKey: ["vehicles", session.data?.id], queryFn: ({ signal }) => listVehicles(signal), enabled: !!session.data });
  if (vehicles.isPending) return <main className="garage-main"><p role="status">차량 목록을 불러오고 있습니다…</p></main>;
  if (vehicles.isError) return <main className="garage-main"><p className="form-error" role="alert">{errorMessage(vehicles.error)}</p><button className="form-secondary" onClick={() => void vehicles.refetch()}>다시 조회</button></main>;
  if (!session.data) return null;
  return <GarageDashboard data={{ profile: { id: String(session.data.id), displayName: session.data.name },
    vehicles: vehicles.data.map(vehicleView), updatesByVehicleId: {},
    charging: { membership: "inactive", canReserve: false, reason: "충전 예약 API는 제공 예정입니다." } }}
    serviceAvailability={{ updates: true, charging: false }} />;
}
