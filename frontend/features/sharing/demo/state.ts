import type { AvailableVehicle, RentalStatus } from "../types";

export const demoVehicles: AvailableVehicle[] = [
  { id: 1, manufacturer: "Hyundai", model: "IONIQ 5", modelYear: 2025, pickupLocation: "서울 성수 · 공유 주차장 A", latitude: 37.5445, longitude: 127.0557 },
  { id: 2, manufacturer: "Kia", model: "EV6", modelYear: 2025, pickupLocation: "서울 여의도 · 공유 주차장 B", latitude: 37.5219, longitude: 126.9245 },
];
export type DemoState = {
  vehicleId: number | null;
  status: RentalStatus | null;
  ownerConsented: boolean;
  renterConsented: boolean;
  revoked: boolean;
  locked: boolean;
  unlock: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
};
export const initialDemoState: DemoState = { vehicleId: null, status: null, ownerConsented: false, renterConsented: false, revoked: false, locked: true, unlock: "NONE" };
export type DemoAction =
  | { type: "REQUEST"; vehicleId: number }
  | { type: "APPROVE" | "REJECT" | "OWNER_CONSENT" | "RENTER_CONSENT" | "REQUEST_UNLOCK" | "APPROVE_UNLOCK" | "REJECT_UNLOCK" | "REVOKE" | "LOCK" | "COMPLETE" | "RESET" };

// This isolated walkthrough never calls the API or represents a server authorization result.
export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "RESET": return initialDemoState;
    case "REQUEST": return !state.status && demoVehicles.some(v => v.id === action.vehicleId) ? { ...initialDemoState, vehicleId: action.vehicleId, status: "REQUESTED" } : state;
    case "APPROVE": return state.status === "REQUESTED" ? { ...state, status: "CONTRACT_PENDING" } : state;
    case "REJECT": return state.status === "REQUESTED" ? { ...state, status: "REJECTED" } : state;
    case "OWNER_CONSENT":
    case "RENTER_CONSENT": {
      if (state.status !== "CONTRACT_PENDING") return state;
      const ownerConsented = state.ownerConsented || action.type === "OWNER_CONSENT";
      const renterConsented = state.renterConsented || action.type === "RENTER_CONSENT";
      return { ...state, ownerConsented, renterConsented, status: ownerConsented && renterConsented ? "ACTIVE" : "CONTRACT_PENDING" };
    }
    case "REQUEST_UNLOCK": return state.status === "ACTIVE" && !state.revoked && state.locked && state.unlock !== "PENDING" ? { ...state, unlock: "PENDING" } : state;
    case "APPROVE_UNLOCK": return state.status === "ACTIVE" && !state.revoked && state.unlock === "PENDING" ? { ...state, unlock: "APPROVED", locked: false } : state;
    case "REJECT_UNLOCK": return state.unlock === "PENDING" ? { ...state, unlock: "REJECTED" } : state;
    case "REVOKE": return state.status === "ACTIVE" ? { ...state, revoked: true, unlock: "NONE" } : state;
    case "LOCK": return { ...state, locked: true };
    case "COMPLETE": return state.status === "ACTIVE" ? { ...state, status: "COMPLETED", revoked: true, locked: true, unlock: "NONE" } : state;
  }
}
