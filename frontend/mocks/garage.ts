import type { GarageDashboardData } from "@/features/garage/types";
import { mockVehicles } from "@/mocks/vehicles";
import { mockUpdateSummary } from "@/mocks/updates";
import { mockChargingEligibility } from "@/mocks/charging";

export const mockGarageDashboard = {
  profile: { id: "demo-owner", displayName: "세라" },
  vehicles: mockVehicles,
  updates: mockUpdateSummary,
  charging: mockChargingEligibility,
} satisfies GarageDashboardData;
