"use client";
import { useQuery } from "@tanstack/react-query";
import { getVehicle } from "@/services/garage-api";
import { useSession } from "@/features/auth/session";
import { vehicleView } from "@/features/vehicle/api-view";
import { errorMessage } from "@/lib/api-client";
import { VehicleStatus } from "./vehicle-status";

export function ServerVehicleDetails({ vehicleId }: { vehicleId: number }) {
  const session = useSession();
  const detail = useQuery({ queryKey: ["vehicle", session.data?.id, vehicleId], queryFn: ({ signal }) => getVehicle(vehicleId, signal), enabled: !!session.data });
  if (detail.isPending) return <p role="status">차량 정보를 불러오고 있습니다…</p>;
  if (detail.isError) return <><p className="form-error" role="alert">{errorMessage(detail.error)}</p><button className="form-secondary" onClick={() => void detail.refetch()}>다시 조회</button></>;
  return <><p className="dialog-description">{detail.data.modelYear} · {detail.data.licensePlate}</p><VehicleStatus vehicle={vehicleView(detail.data)} /></>;
}
