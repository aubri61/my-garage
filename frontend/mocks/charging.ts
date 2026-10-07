import type { ChargingEligibility } from "@/features/charging/types";

export const mockChargingEligibility = {
  membership: "active",
  canReserve: true,
} satisfies ChargingEligibility;
