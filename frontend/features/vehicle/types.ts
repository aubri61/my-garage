export type ConnectionStatus = "connected" | "disconnected" | "unknown";
export type DoorStatus = "locked" | "unlocked" | "unknown";
export type ClimateStatus = "on" | "off" | "unknown";
export type ChargingStatus = "unplugged" | "connected" | "charging" | "complete" | "unknown";

type VehicleBase = {
  id: string;
  modelName: string;
  trim: string;
  image: { src: string; alt: string };
  rangeKm: number | null;
  odometerKm: number | null;
  lastSyncedAt: string | null;
  softwareVersion: string;
  connectionStatus: ConnectionStatus;
  doorStatus: DoorStatus;
  climateStatus: ClimateStatus;
};

export type Vehicle = VehicleBase & (
  | {
      powertrain: "electric";
      batteryPercent: number | null;
      chargingStatus: ChargingStatus;
      targetChargePercent: number;
    }
  | { powertrain: "combustion"; fuelPercent: number | null }
);
