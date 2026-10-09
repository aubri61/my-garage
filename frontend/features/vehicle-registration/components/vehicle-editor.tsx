"use client";
import { useQuery } from "@tanstack/react-query";
import { api, errorMessage } from "@/lib/api-client";
import { useSession } from "@/features/auth/session";
import type { VehicleResponse } from "@/services/types";
import { LoadingSkeleton } from "@/components/platform/platform-ui";
import { ServerRegistration } from "./server-registration";
export function VehicleEditor({ id }: { id: number }) { const session=useSession(); const query=useQuery({ queryKey:["vehicles",session.data?.id,id],queryFn:async ({signal}) => (await api.get<VehicleResponse>(`/vehicles/${id}`,{signal})).data,enabled:!!session.data }); return query.isPending ? <LoadingSkeleton /> : query.isError ? <p role="alert">{errorMessage(query.error)}</p> : <div className="vehicle-editor"><ServerRegistration key={id} vehicle={query.data} /></div>; }
