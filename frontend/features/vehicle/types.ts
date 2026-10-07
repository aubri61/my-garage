export type ConnectionStatus = "connected" | "disconnected" | "unknown";

type VehicleBase = {
  id: string;
  modelName: string;
  trim: string;
  image: { src: string; alt: string };
  rangeKm: number | null;
  softwareVersion: string;
  connectionStatus: ConnectionStatus;
};

export type Vehicle = VehicleBase & (
  | { powertrain: "electric"; batteryPercent: number | null }
  | { powertrain: "combustion"; fuelPercent: number | null }
);
