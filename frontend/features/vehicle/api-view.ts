import type { VehicleResponse } from "@/services/types";
import type { RegisteredVehicle } from "./types";
import { vehicleCategory } from "@/features/vehicle-registration/catalog";

// Presentation only: no mock telemetry, powertrain, certificate or software data is invented.
export function vehicleView(vehicle: VehicleResponse): RegisteredVehicle {
  const name = `${vehicle.manufacturer} ${vehicle.model}`;
  const category = vehicleCategory(vehicle.manufacturer, vehicle.model);
  return {
    id: String(vehicle.id), source: "api", registrationStatus: "registered", modelName: name,
    trim: `${vehicle.modelYear} · ${vehicle.licensePlate}`, powertrain: "unknown", fuelPercent: null,
    image: { src: category?.imageUrl ?? "/images/vehicles/ioniq5-placeholder.svg", alt: category?.imageAlt ?? "차량 이미지 미제공" },
    rangeKm: null, odometerKm: null, lastSyncedAt: null, softwareVersion: "확인 불가",
    connectionStatus: "unknown", doorStatus: "unknown", climateStatus: "unknown",
  };
}
