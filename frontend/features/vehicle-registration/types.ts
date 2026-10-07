import type { UnregisteredVehicle } from "@/features/vehicle/types";
export type VehicleCandidate = { vehicle: UnregisteredVehicle; vin: string };
export type ConnectionStep = "identity" | "certificate" | "connection";
export type StepStatus = "waiting" | "running" | "complete" | "failed";
export type ConnectionProgress = Record<ConnectionStep, StepStatus>;
