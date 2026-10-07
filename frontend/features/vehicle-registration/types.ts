import type { Vehicle } from "@/features/vehicle/types";
export type VehicleCandidate = { vehicle: Vehicle; vin: string };
export type ConnectionStep = "identity" | "certificate" | "connection";
export type StepStatus = "waiting" | "running" | "complete" | "failed";
export type ConnectionProgress = Record<ConnectionStep, StepStatus>;
