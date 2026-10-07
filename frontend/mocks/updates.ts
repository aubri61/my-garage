import type { UpdateSummary } from "@/features/updates/types";

export const mockUpdatesByVehicleId = {
  "kia-ev6": {
    securityUpdateCount: 1,
    softwareUpdateCount: 2,
    latestUpdateId: "ev6-security-2026-01",
  },
  "hyundai-ioniq5": {
    securityUpdateCount: 0,
    softwareUpdateCount: 1,
    latestUpdateId: "ioniq5-navigation-2026-01",
  },
  "genesis-gv80": {
    securityUpdateCount: 0,
    softwareUpdateCount: 0,
    latestUpdateId: null,
  },
} satisfies Record<string, UpdateSummary>;
