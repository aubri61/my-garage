import type { VehicleResponse } from "@/services/types";
import type { RegisteredVehicle } from "./types";

// Presentation only: no mock telemetry, powertrain, certificate or software data is invented.
export function vehicleView(vehicle: VehicleResponse): RegisteredVehicle {
  const name = `${vehicle.manufacturer} ${vehicle.model}`;
  const image = /ioniq\s*5/i.test(vehicle.model) ? "ioniq5" : /ev6/i.test(vehicle.model) ? "ev6" : /gv80/i.test(vehicle.model) ? "gv80" : null;
  return {
    id: String(vehicle.id), source: "api", registrationStatus: "registered", modelName: name,
    trim: `${vehicle.modelYear} · ${vehicle.licensePlate}`, powertrain: "unknown", fuelPercent: null,
    image: { src: image ? `/images/vehicles/${image}-cutout.png` : "/images/vehicles/ioniq5-placeholder.svg", alt: image ? `${name} 참고 이미지` : "차량 이미지 미제공" },
    rangeKm: null, odometerKm: null, lastSyncedAt: null, softwareVersion: "확인 불가",
    connectionStatus: "unknown", doorStatus: "unknown", climateStatus: "unknown",
  };
}
