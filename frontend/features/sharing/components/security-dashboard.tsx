"use client";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session";
import { listVehicles } from "@/services/garage-api";
import { errorMessage } from "@/lib/api-client";
import { OwnerSecuritySection } from "./owner-security-section";
import { LoadingSkeleton } from "@/components/platform/platform-ui";
export function SecurityDashboard() { const user=useSession(); const query=useQuery({queryKey:["vehicles",user.data?.id],queryFn:({signal})=>listVehicles(signal),enabled:!!user.data}); return query.isPending ? <LoadingSkeleton /> : query.isError ? <p role="alert">{errorMessage(query.error)}</p> : <OwnerSecuritySection vehicles={query.data} />; }
