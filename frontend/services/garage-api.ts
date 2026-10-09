import { api, ApiError } from "@/lib/api-client";
import type { LoginRequest, SignupRequest, UserResponse, VehicleRequest, VehicleResponse, OtaRequest, OtaResponse, OtaHistory, ScenarioResponse } from "./types";

export async function getCurrentUser(signal?: AbortSignal): Promise<UserResponse | null> {
  try { return (await api.get<UserResponse>("/users/me", { signal })).data; }
  catch (error) { if (error instanceof ApiError && error.status === 401) return null; throw error; }
}
export async function login(request: LoginRequest, signal?: AbortSignal) {
  await api.post("/auth/login", request, { signal });
  return (await api.get<UserResponse>("/users/me", { signal })).data;
}
export async function signup(request: SignupRequest, signal?: AbortSignal) {
  return (await api.post<{ userId: number; message: string }>("/users/signup", request, { signal })).data;
}
export async function logout() { await api.post("/auth/logout"); }
export async function listVehicles(signal?: AbortSignal) { return (await api.get<VehicleResponse[]>("/vehicles", { signal })).data; }
export async function getVehicle(id: number, signal?: AbortSignal) { return (await api.get<VehicleResponse>(`/vehicles/${id}`, { signal })).data; }
export async function registerVehicle(request: VehicleRequest) { return (await api.post<VehicleResponse>("/vehicles", request)).data; }
export async function listScenarios(signal?: AbortSignal) { return (await api.get<ScenarioResponse[]>("/ota/scenarios", { signal })).data; }
export async function verifyOta(id: number, request: OtaRequest) { return (await api.post<OtaResponse>(`/vehicles/${id}/ota/verify`, request)).data; }
export async function listHistory(id: number, signal?: AbortSignal) { return (await api.get<OtaHistory[]>(`/vehicles/${id}/ota/history`, { signal })).data; }

export async function updateVehicle(id: number, input: VehicleRequest) { return (await api.put<VehicleResponse>(`/vehicles/${id}`, input)).data; }
