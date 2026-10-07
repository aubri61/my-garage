"use client";

import { useState } from "react";
import type { GarageDashboardData, GarageServiceAvailability } from "@/features/garage/types";
import { VehicleOverview } from "@/features/vehicle/components/vehicle-overview";
import { RemoteControlOverview, type VehicleAction } from "@/features/vehicle/components/remote-control-overview";
import { VehicleActionDialog } from "@/features/vehicle/components/vehicle-action-dialog";

type VehicleDashboardProps = {
  vehicles: GarageDashboardData["vehicles"];
  updatesByVehicleId: GarageDashboardData["updatesByVehicleId"];
  chargingEligibility: GarageDashboardData["charging"];
  serviceAvailability: GarageServiceAvailability;
};

export function VehicleDashboard({ vehicles, updatesByVehicleId, chargingEligibility, serviceAvailability }: VehicleDashboardProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id ?? null);
  const [activeAction, setActiveAction] = useState<VehicleAction | "details" | null>(null);
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? vehicles[0];

  const updateSummary = selectedVehicle ? updatesByVehicleId[selectedVehicle.id] : undefined;

  return (
    <>
      <VehicleOverview
        vehicles={vehicles}
        selectedVehicle={selectedVehicle}
        onSelectVehicle={setSelectedVehicleId}
        onShowDetails={() => setActiveAction("details")}
      />
      {selectedVehicle && (
        <>
          <RemoteControlOverview
            vehicle={selectedVehicle}
            updateCount={updateSummary ? updateSummary.securityUpdateCount + updateSummary.softwareUpdateCount : null}
            onSelectAction={setActiveAction}
          />
          {activeAction && <VehicleActionDialog
            key={`${selectedVehicle.id}-${activeAction}`}
            action={activeAction}
            vehicle={selectedVehicle}
            summary={updateSummary}
            eligibility={chargingEligibility}
            availability={serviceAvailability}
            onClose={() => setActiveAction(null)}
          />}
        </>
      )}
    </>
  );
}
