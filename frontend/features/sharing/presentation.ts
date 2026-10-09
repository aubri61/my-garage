import { manufacturerName, modelLabel } from "@/features/vehicle-registration/catalog";
// Test records stay in the DB. Redact only their known generated labels, never fabricate a model/address.
export function isInternalLabel(value: string | null | undefined) { return !!value && /(?:\bLIVE(?:-PICKUP)?-|\bPKI-LIVE-|\b(?:DataOwner|DataRenter|DataOther)(?:-|$)|통합-\d{10,})/i.test(value); }
export function vehicleName(manufacturer: string, model: string) { return isInternalLabel(model) ? "차량 정보 확인 필요" : `${manufacturerName(manufacturer)} ${modelLabel(manufacturer, model)}`; }
export function rentalVehicleName(value: string) {
  if (isInternalLabel(value)) return "차량 정보 확인 필요";
  const firstSpace = value.indexOf(" ");
  return firstSpace > 0 ? vehicleName(value.slice(0, firstSpace), value.slice(firstSpace + 1)) : value;
}
export function pickupAddress(value: string | null | undefined) { return !value || isInternalLabel(value) ? "픽업 주소 확인 필요" : value; }
export function personName(value: string | null | undefined, fallback = "차량 소유자") { return !value || isInternalLabel(value) ? fallback : value; }
export function localDateTime(date: Date) { return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
export function initialRentalPeriod() {
  const start = new Date(); start.setSeconds(0, 0); start.setMinutes(start.getMinutes() + 5);
  return { start: localDateTime(start), end: localDateTime(new Date(start.getTime() + 60 * 60 * 1000)) };
}
