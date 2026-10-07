"use client";

import { useSyncExternalStore } from "react";

type DemoMode = "guest" | "member" | "demo";
type PersistedDemoState = { mode: DemoMode; registeredVehicleIds: string[] };
type DemoSession = PersistedDemoState & { ready: boolean; displayName: string; storageAvailable: boolean };
export const DEMO_STORAGE_KEY = "my-garage:demo-session:v1";
const serverSnapshot: DemoSession = { mode: "guest", registeredVehicleIds: [], ready: false, displayName: "회원", storageAvailable: true };
let snapshot = serverSnapshot;
const listeners = new Set<() => void>();

export function parseDemoState(raw: string | null): PersistedDemoState {
  if (!raw) return { mode: "guest", registeredVehicleIds: [] };
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || !("mode" in value) || !("registeredVehicleIds" in value)) throw new Error();
    if (!(["guest", "member", "demo"] as unknown[]).includes(value.mode) || !Array.isArray(value.registeredVehicleIds) || !value.registeredVehicleIds.every(id => typeof id === "string")) throw new Error();
    return { mode: value.mode as DemoMode, registeredVehicleIds: [...new Set(value.registeredVehicleIds as string[])] };
  } catch { return { mode: "guest", registeredVehicleIds: [] }; }
}

function emit() { listeners.forEach(listener => listener()); }
function hydrate() {
  try {
    const state = parseDemoState(window.localStorage.getItem(DEMO_STORAGE_KEY));
    snapshot = { ...state, ready: true, displayName: state.mode === "demo" ? "세라" : "회원", storageAvailable: true };
  } catch { snapshot = { ...serverSnapshot, ready: true, storageAvailable: false }; }
}
function onStorage(event: StorageEvent) {
  if (event.key === DEMO_STORAGE_KEY || event.key === null) { hydrate(); emit(); }
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  if (!snapshot.ready) { hydrate(); emit(); }
  return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener("storage", onStorage); };
}
function save(next: DemoSession) {
  snapshot = next;
  try { window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ mode: next.mode, registeredVehicleIds: next.registeredVehicleIds } satisfies PersistedDemoState)); }
  catch { snapshot = { ...next, storageAvailable: false }; }
  emit();
}
export function startMemberSession(displayName: string, newSignup: boolean) {
  save({ ...snapshot, ready: true, mode: "member", displayName, registeredVehicleIds: newSignup ? [] : snapshot.registeredVehicleIds });
}
export function startDemoSession() { save({ ...snapshot, ready: true, mode: "demo", displayName: "세라" }); }
export function endDemoSession() { save({ ...snapshot, mode: "guest", displayName: "회원" }); }
export function registerDemoVehicle(vehicleId: string) {
  if (snapshot.mode !== "member") throw new Error("새 회원 체험에서 차량을 등록해주세요.");
  if (snapshot.registeredVehicleIds.includes(vehicleId)) throw new Error("이미 등록한 차량입니다.");
  save({ ...snapshot, registeredVehicleIds: [...snapshot.registeredVehicleIds, vehicleId] });
}
export function useDemoSession() { return useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot); }
