import type { AvailableVehicle } from "./types";
// Optional public API field, in KRW/hour. Never derive a price from a model or test ID.
export function hourlyPrice(vehicle: AvailableVehicle): number | null {
  const value = vehicle.hourlyRate ?? vehicle.hourlyPriceWon;
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}
export function priceLabel(vehicle: AvailableVehicle): string {
  const price = hourlyPrice(vehicle);
  return price === null ? "요금 미등록" : `${price.toLocaleString("ko-KR")}원`;
}
