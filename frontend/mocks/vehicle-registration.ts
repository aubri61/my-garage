import type { RegisteredVehicle, Vehicle, VehicleCertificate, VehicleIdentity } from "@/features/vehicle/types";
import type { VehicleCandidate } from "@/features/vehicle-registration/types";
import { mockVehicles } from "@/mocks/vehicles";
import { mockLatency } from "@/mocks/latency";

type RegistrationFixture = {
  vehicleId: string; code: string; vin: string; ownershipCode: string;
  identity: VehicleIdentity; certificate: VehicleCertificate;
};
const createdAt = "2026-10-08T09:00:00+09:00";
export const mockRegistrationFixtures: readonly RegistrationFixture[] = [
  { vehicleId: "kia-ev6", code: "EV6-2026", vin: "KNAC381AFM5000001", ownershipCode: "123456", identity: { id: "demo-identity-ev6", vin: "KNAC381AFM5000001", createdAt }, certificate: { serialNumber: "DEMO-EV6-001", issuedAt: createdAt, expiresAt: "2027-10-08T09:00:00+09:00", status: "valid" } },
  { vehicleId: "hyundai-ioniq5", code: "IONIQ5-2026", vin: "KMHKR81BFNU000001", ownershipCode: "123456", identity: { id: "demo-identity-ioniq5", vin: "KMHKR81BFNU000001", createdAt }, certificate: { serialNumber: "DEMO-IONIQ5-001", issuedAt: createdAt, expiresAt: "2027-10-08T09:00:00+09:00", status: "valid" } },
  { vehicleId: "genesis-gv80", code: "GV80-2026", vin: "KMUHB81B1NU000001", ownershipCode: "123456", identity: { id: "demo-identity-gv80", vin: "KMUHB81B1NU000001", createdAt }, certificate: { serialNumber: "DEMO-GV80-001", issuedAt: createdAt, expiresAt: "2027-10-08T09:00:00+09:00", status: "valid" } },
];
export const mockConnectionScenarios = [
  { value: "success", label: "정상 연결" }, { value: "certificate-error", label: "인증서 발급 실패 체험" },
] as const;
export type MockConnectionScenario = typeof mockConnectionScenarios[number]["value"];

function fixtureFor(vehicleId: string) {
  const fixture = mockRegistrationFixtures.find(item => item.vehicleId === vehicleId);
  if (!fixture) throw new Error("데모 차량 정보를 찾을 수 없습니다.");
  return fixture;
}
export function getMockVehicleWithCertificate(vehicle: Vehicle, newlyConnected = false): RegisteredVehicle {
  const fixture = fixtureFor(vehicle.id);
  return { ...vehicle, registrationStatus: "registered", identity: fixture.identity, certificate: fixture.certificate, connectionStatus: newlyConnected ? "connected" : vehicle.connectionStatus };
}
export async function lookupMockVehicle(query: string, registeredIds: readonly string[], signal: AbortSignal): Promise<VehicleCandidate> {
  await mockLatency(signal, 650);
  const normalized = query.trim().toUpperCase();
  const fixture = mockRegistrationFixtures.find(item => item.code === normalized || item.vin === normalized);
  if (!fixture) throw new Error("일치하는 데모 차량이 없습니다. 연결 코드 또는 VIN을 확인해주세요.");
  if (registeredIds.includes(fixture.vehicleId)) throw new Error("이미 차고지에 등록한 차량입니다.");
  const vehicle = mockVehicles.find(item => item.id === fixture.vehicleId);
  if (!vehicle) throw new Error("차량 정보를 조회할 수 없습니다.");
  return { vehicle, vin: fixture.vin };
}
export async function confirmMockOwnership(candidate: VehicleCandidate, code: string, signal: AbortSignal) {
  await mockLatency(signal);
  if (code.trim() !== fixtureFor(candidate.vehicle.id).ownershipCode) throw new Error("데모 확인 코드가 일치하지 않습니다. 다시 입력해주세요.");
}
export async function createMockVehicleIdentity(candidate: VehicleCandidate, signal: AbortSignal): Promise<VehicleIdentity> {
  await mockLatency(signal, 650);
  return fixtureFor(candidate.vehicle.id).identity;
}
export async function issueMockVehicleCertificate(identity: VehicleIdentity, scenario: MockConnectionScenario, signal: AbortSignal): Promise<VehicleCertificate> {
  await mockLatency(signal, 750);
  if (scenario === "certificate-error") throw new Error("데모 인증서 발급에 실패했습니다. 차량은 아직 등록되지 않았습니다.");
  const fixture = mockRegistrationFixtures.find(item => item.identity.id === identity.id);
  if (!fixture) throw new Error("차량 식별정보를 확인할 수 없습니다.");
  return fixture.certificate;
}
export async function connectMockVehicle(candidate: VehicleCandidate, identity: VehicleIdentity, certificate: VehicleCertificate, signal: AbortSignal): Promise<RegisteredVehicle> {
  await mockLatency(signal, 500);
  if (identity.vin !== candidate.vin) throw new Error("차량 식별정보가 일치하지 않습니다.");
  return { ...getMockVehicleWithCertificate(candidate.vehicle, true), identity, certificate };
}
