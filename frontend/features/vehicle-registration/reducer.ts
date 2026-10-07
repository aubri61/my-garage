import type { RegisteredVehicle, VehicleCertificate, VehicleIdentity } from "@/features/vehicle/types";
import type { ConnectionProgress, ConnectionStep, VehicleCandidate } from "./types";

type Draft = { query: string; ownershipCode: string };
type RequestState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "error"; error: string };
type ProvisioningState =
  | { status: "pending"; step: "identity" }
  | { status: "pending"; step: "certificate"; identity: VehicleIdentity }
  | { status: "pending"; step: "connection"; identity: VehicleIdentity; certificate: VehicleCertificate }
  | { status: "error"; step: ConnectionStep; error: string };

export type RegistrationState = Draft & (
  | ({ phase: "lookup" } & RequestState)
  | { phase: "review"; candidate: VehicleCandidate }
  | ({ phase: "ownership"; candidate: VehicleCandidate } & RequestState)
  | ({ phase: "provisioning"; candidate: VehicleCandidate } & ProvisioningState)
  | { phase: "complete"; vehicle: RegisteredVehicle }
);

export type RegistrationAction =
  | { type: "queryChanged"; query: string }
  | { type: "codeChanged"; code: string }
  | { type: "lookupStarted" }
  | { type: "vehicleFound"; candidate: VehicleCandidate }
  | { type: "vehicleConfirmed" }
  | { type: "reviewRequested" }
  | { type: "anotherVehicleRequested" }
  | { type: "ownershipStarted" }
  | { type: "ownershipConfirmed" }
  | { type: "identityCreated"; identity: VehicleIdentity }
  | { type: "certificateIssued"; certificate: VehicleCertificate }
  | { type: "connected"; vehicle: RegisteredVehicle }
  | { type: "failed"; error: string }
  | { type: "cancelled" }
  | { type: "retryRequested" };

export const initialRegistrationState: RegistrationState = {
  phase: "lookup", status: "idle", query: "", ownershipCode: "",
};

export function isRegistrationPending(state: RegistrationState) {
  return "status" in state && state.status === "pending";
}

export function registrationReducer(state: RegistrationState, action: RegistrationAction): RegistrationState {
  const draft = { query: state.query, ownershipCode: state.ownershipCode };
  switch (action.type) {
    case "queryChanged":
      return state.phase === "lookup" && !isRegistrationPending(state)
        ? { ...draft, phase: "lookup", status: "idle", query: action.query } : state;
    case "codeChanged":
      return state.phase === "ownership" && !isRegistrationPending(state)
        ? { ...draft, phase: "ownership", status: "idle", candidate: state.candidate, ownershipCode: action.code } : state;
    case "lookupStarted":
      return state.phase === "lookup" && !isRegistrationPending(state)
        ? { ...draft, phase: "lookup", status: "pending" } : state;
    case "vehicleFound":
      return state.phase === "lookup" && state.status === "pending"
        ? { ...draft, phase: "review", candidate: action.candidate } : state;
    case "vehicleConfirmed":
      return state.phase === "review"
        ? { ...draft, phase: "ownership", status: "idle", candidate: state.candidate } : state;
    case "reviewRequested":
      return state.phase === "ownership" && !isRegistrationPending(state)
        ? { ...draft, phase: "review", candidate: state.candidate } : state;
    case "anotherVehicleRequested":
      return state.phase === "review" ? { query: state.query, ownershipCode: "", phase: "lookup", status: "idle" } : state;
    case "ownershipStarted":
      return state.phase === "ownership" && !isRegistrationPending(state)
        ? { ...draft, phase: "ownership", status: "pending", candidate: state.candidate } : state;
    case "ownershipConfirmed":
      return state.phase === "ownership" && state.status === "pending"
        ? { ...draft, phase: "provisioning", status: "pending", step: "identity", candidate: state.candidate } : state;
    case "identityCreated":
      return state.phase === "provisioning" && state.status === "pending" && state.step === "identity"
        ? { ...draft, phase: "provisioning", status: "pending", step: "certificate", candidate: state.candidate, identity: action.identity } : state;
    case "certificateIssued":
      return state.phase === "provisioning" && state.status === "pending" && state.step === "certificate"
        ? { ...state, step: "connection", certificate: action.certificate } : state;
    case "connected":
      return state.phase === "provisioning" && state.status === "pending" && state.step === "connection"
        ? { query: state.query, ownershipCode: "", phase: "complete", vehicle: action.vehicle } : state;
    case "failed":
      if (state.phase === "lookup" || state.phase === "ownership" || state.phase === "provisioning") {
        return { ...state, status: "error", error: action.error };
      }
      return state;
    case "cancelled":
      if (!isRegistrationPending(state)) return state;
      if (state.phase === "lookup") return { ...draft, phase: "lookup", status: "idle" };
      if (state.phase === "ownership" || state.phase === "provisioning") {
        return { ...draft, phase: "ownership", status: "idle", candidate: state.candidate };
      }
      return state;
    case "retryRequested":
      return state.phase === "provisioning" && state.status === "error"
        ? { ...draft, phase: "ownership", status: "idle", candidate: state.candidate } : state;
  }
}

// Progress and busy/error UI are derived from the workflow, never synchronized state.
export function connectionProgressFor(state: RegistrationState): ConnectionProgress {
  if (state.phase === "complete") return { identity: "complete", certificate: "complete", connection: "complete" };
  if (state.phase !== "provisioning") return { identity: "waiting", certificate: "waiting", connection: "waiting" };
  const current = state.status === "error" ? "failed" : "running";
  switch (state.step) {
    case "identity": return { identity: current, certificate: "waiting", connection: "waiting" };
    case "certificate": return { identity: "complete", certificate: current, connection: "waiting" };
    case "connection": return { identity: "complete", certificate: "complete", connection: current };
  }
}
