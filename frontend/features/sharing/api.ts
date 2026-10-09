import { api } from "@/lib/api-client";
import type { VehicleResponse } from "@/services/types";
import type { AvailableVehicle, Rental, SharingSettings } from "./types";
export type RentalPeriod = { startsAt: string; endsAt: string };
export async function availableVehicles(signal?: AbortSignal, period?: RentalPeriod) { return (await api.get<AvailableVehicle[]>("/vehicles/available", { signal, params: period })).data; }
export async function listRentals(signal?: AbortSignal) { return (await api.get<Rental[]>("/rentals", { signal })).data; }
export async function configureSharing(id: number, settings: SharingSettings) { return (await api.put<VehicleResponse>(`/vehicles/${id}/sharing`, settings)).data; }
export async function createRental(input: { vehicleId: number; startsAt: string; endsAt: string }) { return (await api.post<Rental>("/rentals", input)).data; }
export type RentalAction = "approve" | "reject" | "consents" | "access-grant/revoke" | "complete" | "unlock-requests";
export async function rentalAction(id: number, action: RentalAction) { return (await api.post<Rental>(`/rentals/${id}/${action}`)).data; }
export async function unlockAction(id: number, action: "approve" | "reject") { return (await api.post<Rental>(`/unlock-requests/${id}/${action}`)).data; }
export async function lockVehicle(id: number) { return (await api.post<VehicleResponse>(`/vehicles/${id}/lock`)).data; }

export async function setSharingEnabled(id: number, enabled: boolean) { return (await api.patch<VehicleResponse>(`/vehicles/${id}/sharing`, { enabled })).data; }
export async function deleteVehicle(id: number) { await api.delete(`/vehicles/${id}`); }

export type PriceQuote = { vehicleId: number; hourlyRate: number; billedHours: number; estimatedTotal: number; calculation: string };
export async function quoteRental(input: { vehicleId: number; startsAt: string; endsAt: string }, signal?: AbortSignal) { return (await api.post<PriceQuote>("/rentals/quote", input, { signal })).data; }
