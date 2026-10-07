import type { ChargingEligibility } from "@/features/charging/types";
import type { UpdateSummary } from "@/features/updates/types";
import type { Vehicle } from "@/features/vehicle/types";

export type GarageProfile = { id: string; displayName: string };

export type GarageDashboardData = {
  profile: GarageProfile;
  vehicles: readonly Vehicle[];
  updates: UpdateSummary;
  charging: ChargingEligibility;
};
