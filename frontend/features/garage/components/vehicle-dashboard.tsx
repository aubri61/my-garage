"use client";

import { useState } from "react";
import type { GarageDashboardData, GarageServiceAvailability } from "@/features/garage/types";
import { VehicleOverview } from "@/features/vehicle/components/vehicle-overview";
import { VehicleStatus } from "@/features/vehicle/components/vehicle-status";
import { RemoteControlOverview } from "@/features/vehicle/components/remote-control-overview";
import { SoftwareUpdateCard } from "@/features/updates/components/software-update-card";
import { ChargingReservationCard } from "@/features/charging/components/charging-reservation-card";

type VehicleDashboardProps = {
  vehicles: GarageDashboardData["vehicles"];
  updatesByVehicleId: GarageDashboardData["updatesByVehicleId"];
  chargingEligibility: GarageDashboardData["charging"];
  serviceAvailability: GarageServiceAvailability;
};

export function VehicleDashboard({ vehicles, updatesByVehicleId, chargingEligibility, serviceAvailability }: VehicleDashboardProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id ?? null);
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? vehicles[0];

  return (
    <>
      <VehicleOverview
        vehicles={vehicles}
        selectedVehicle={selectedVehicle}
        onSelectVehicle={setSelectedVehicleId}
      />
      {selectedVehicle && (
        <>
          <div className="vehicle-details-grid">
            <RemoteControlOverview vehicle={selectedVehicle} />
            <VehicleStatus vehicle={selectedVehicle} />
          </div>
          <div className={`primary-services ${selectedVehicle.powertrain === "combustion" ? "single-service" : ""}`}>
            <SoftwareUpdateCard
              summary={updatesByVehicleId[selectedVehicle.id]}
              vehicleName={selectedVehicle.modelName}
              available={serviceAvailability.updates}
            />
            {selectedVehicle.powertrain === "electric" && (
              <ChargingReservationCard
                vehicle={selectedVehicle}
                eligibility={chargingEligibility}
                action={{ href: "/charging", available: serviceAvailability.charging }}
              />
            )}
          </div>
        </>
      )}
    </>
  );
}
