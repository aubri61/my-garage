import type { Vehicle } from "@/features/vehicle/types";

// Replace these local image paths when final vehicle assets are available.
export const mockVehicles = [
  {
    id: "kia-ev6", modelName: "Kia EV6", trim: "롱레인지 · 어스 · 사륜구동",
    image: { src: "/images/vehicles/ev6-placeholder.svg", alt: "Kia EV6 차량 이미지 대체용 일러스트" },
    powertrain: "electric", batteryPercent: 82, rangeKm: 384,
    softwareVersion: "2.4.1", connectionStatus: "connected",
  },
  {
    id: "hyundai-ioniq5", modelName: "Hyundai IONIQ 5", trim: "롱레인지 · 프레스티지 · 사륜구동",
    image: { src: "/images/vehicles/ioniq5-placeholder.svg", alt: "Hyundai IONIQ 5 차량 이미지 대체용 일러스트" },
    powertrain: "electric", batteryPercent: 64, rangeKm: 298,
    softwareVersion: "3.1.0", connectionStatus: "connected",
  },
  {
    id: "genesis-gv80", modelName: "Genesis GV80", trim: "가솔린 2.5 터보 · 사륜구동",
    image: { src: "/images/vehicles/gv80-placeholder.svg", alt: "Genesis GV80 차량 이미지 대체용 일러스트" },
    powertrain: "combustion", fuelPercent: 56, rangeKm: 412,
    softwareVersion: "1.8.2", connectionStatus: "disconnected",
  },
] as const satisfies readonly Vehicle[];
