import type { ChargingEligibility } from "@/features/charging/types";
import type { UpdateSummary } from "@/features/updates/types";
import type { RegisteredVehicle } from "@/features/vehicle/types";

export type GarageProfile = { id: string; displayName: string };

export type GarageDashboardData = {
  profile: GarageProfile;
  vehicles: readonly RegisteredVehicle[];
  updatesByVehicleId: Readonly<Partial<Record<string, UpdateSummary>>>;
  charging: ChargingEligibility;
};

export type GarageServiceAvailability = {
  updates: boolean;
  charging: boolean;
};
