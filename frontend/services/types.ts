export type UserResponse = { id: number; name: string; email: string };
export type LoginRequest = { email: string; password: string };
export type SignupRequest = LoginRequest & { name: string };
export type VehicleRequest = { manufacturer: string; model: string; modelYear: number; licensePlate: string };
export type VehicleResponse = VehicleRequest & { id: number; createdAt: string; updatedAt: string; sharingEnabled: boolean; pickupLocation: string | null; pickupLatitude: number | null; pickupLongitude: number | null; lockState: "LOCKED" | "UNLOCKED" };
export type OtaScenario = "VALID" | "TAMPERED_FILE" | "FAKE_PUBLISHER" | "ROLLBACK" | "INCOMPATIBLE_VEHICLE" | "TAMPERED_METADATA" | "INVALID_PACKAGE";
export type OtaStatus = "APPROVED" | "BLOCKED" | "SIMULATED_APPROVAL";
export type OtaCheckName = "PACKAGE_FORMAT" | "TRUSTED_SIGNER" | "SIGNATURE" | "FILE_INTEGRITY" | "COMPATIBILITY" | "VERSION_POLICY" | "ROLLBACK";
export type OtaCheck = { name: OtaCheckName; status: "PASSED" | "FAILED" | "NOT_RUN" };
export type OtaRequest = { scenario: OtaScenario; protectionEnabled: boolean };
export type OtaHistory = OtaRequest & { id: number; vehicleId: number; status: OtaStatus; failureCode: string | null; executedAt: string };
export type OtaResponse = OtaRequest & {
  historyId: number; status: OtaStatus; failureCode: string | null; checks: OtaCheck[]; message: string;
  simulatedRisk: { code: string; description: string } | null;
  simulationState: { manufacturer: string; model: string; hardwareId: string; component: string; currentVersion: string; securityVersion: number };
  executedAt: string;
};
export type ScenarioResponse = { scenario: OtaScenario; description: string };
