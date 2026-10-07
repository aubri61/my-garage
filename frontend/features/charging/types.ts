export type ChargingEligibility = {
  membership: "active" | "inactive";
} & (
  | { canReserve: true }
  | { canReserve: false; reason: string }
);
