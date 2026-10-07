"use client";

import { GarageDashboard } from "@/features/garage/components/garage-dashboard";
import { SessionBoundary } from "@/features/auth/components/session-boundary";
import { useDemoSession } from "@/mocks/demo-session";
import { mockGarageDashboard } from "@/mocks/garage";
import { getMockVehicleWithCertificate } from "@/mocks/vehicle-registration";

export function GarageEntry() {
  const session = useDemoSession();
  const vehicles = mockGarageDashboard.vehicles
    .filter(vehicle => session.mode === "demo" || session.registeredVehicleIds.includes(vehicle.id))
    .map(vehicle => getMockVehicleWithCertificate(vehicle, session.mode === "member"));
  return <SessionBoundary><GarageDashboard
    data={{ ...mockGarageDashboard, profile: { id: session.mode === "demo" ? "demo-owner" : "demo-new-member", displayName: session.displayName }, vehicles }}
    serviceAvailability={{ updates: false, charging: false }}
  /></SessionBoundary>;
}
