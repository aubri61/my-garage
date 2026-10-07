import type { GarageDashboardData } from "@/features/garage/types";
import { mockVehicles } from "@/mocks/vehicles";
import { mockUpdatesByVehicleId } from "@/mocks/updates";
import { mockChargingEligibility } from "@/mocks/charging";

export const mockGarageDashboard = {
  profile: { id: "demo-owner", displayName: "세라" },
  vehicles: mockVehicles,
  updatesByVehicleId: mockUpdatesByVehicleId,
  charging: mockChargingEligibility,
} satisfies GarageDashboardData;
