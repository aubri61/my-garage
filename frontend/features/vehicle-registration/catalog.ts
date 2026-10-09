import vehicleMedia from "./vehicle-media.json";
// Display/catalog metadata only: vehicle ownership, availability and location come from the API.
export type PowerType = "전기차" | "가솔린" | "디젤" | "하이브리드";
export interface VehicleCategory {
  manufacturer: string;
  model: string;
  displayName: string;
  powerTypes: readonly PowerType[];
  bodyType: "SUV" | "세단" | "경차" | "미니밴";
  imageKey: string | null;
  imageUrl: string | null;
  imageAlt: string;
  yearRange: { min: number; max: number };
  aliases: readonly string[];
}
const yearRange = { min: 1986, max: 2027 };
function category(manufacturer: string, model: string, displayName: string, powerTypes: readonly PowerType[], bodyType: VehicleCategory["bodyType"], imageKey: string | null = null, aliases: readonly string[] = []): VehicleCategory {
  const media = vehicleMedia.find(item => item.manufacturer === manufacturer && item.model === model);
  return { manufacturer, model, displayName: media?.displayName || displayName, powerTypes, bodyType, imageKey, imageUrl: media?.imageReady && media.imageFile ? `/images/vehicles/catalog/${media.imageFile}` : imageKey ? `/images/vehicles/${imageKey}-cutout.png` : null, imageAlt: media?.imageAlt || `${displayName} 차량 참고 이미지`, yearRange, aliases: [displayName, media?.displayName ?? displayName, ...aliases] };
}
export const vehicleCategories: readonly VehicleCategory[] = [
  category("현대", "IONIQ 5", "아이오닉 5", ["전기차"], "SUV", "ioniq5"),
  category("현대", "IONIQ 6", "아이오닉 6", ["전기차"], "세단"),
  category("현대", "Kona Electric", "코나 일렉트릭", ["전기차"], "SUV"),
  category("현대", "Casper Electric", "캐스퍼 일렉트릭", ["전기차"], "경차"),
  category("현대", "Avante", "아반떼", ["가솔린", "하이브리드"], "세단"),
  category("현대", "Sonata", "쏘나타", ["가솔린", "하이브리드"], "세단"),
  category("현대", "Grandeur", "그랜저", ["가솔린", "하이브리드"], "세단"),
  category("현대", "Tucson", "투싼", ["가솔린", "디젤", "하이브리드"], "SUV"),
  category("현대", "Santa Fe", "싼타페", ["가솔린", "디젤", "하이브리드"], "SUV"),
  category("현대", "Palisade", "팰리세이드", ["가솔린", "디젤", "하이브리드"], "SUV"),
  category("기아", "EV3", "EV3", ["전기차"], "SUV"),
  category("기아", "EV6", "EV6", ["전기차"], "SUV", "ev6"),
  category("기아", "EV9", "EV9", ["전기차"], "SUV"),
  category("기아", "Niro EV", "니로 EV", ["전기차"], "SUV"),
  category("기아", "Ray EV", "레이 EV", ["전기차"], "경차"),
  category("기아", "K5", "K5", ["가솔린", "하이브리드"], "세단"),
  category("기아", "K8", "K8", ["가솔린", "하이브리드"], "세단"),
  category("기아", "Sportage", "스포티지", ["가솔린", "디젤", "하이브리드"], "SUV"),
  category("기아", "Sorento", "쏘렌토", ["가솔린", "디젤", "하이브리드"], "SUV"),
  category("기아", "Carnival", "카니발", ["가솔린", "디젤", "하이브리드"], "미니밴"),
];
export const vehicleCatalog: Record<string, readonly string[]> = Object.fromEntries(["현대", "기아"].map(manufacturer => [manufacturer, vehicleCategories.filter(item => item.manufacturer === manufacturer).map(item => item.model)]));
export function manufacturerName(value: string) { return ({ Hyundai: "현대", Kia: "기아", Genesis: "제네시스", Tesla: "테슬라" } as Record<string, string>)[value] ?? value; }
export function vehicleCategory(manufacturer: string, model: string) {
  return vehicleCategories.find(item => item.manufacturer === manufacturerName(manufacturer) && [item.model, ...item.aliases].some(name => name.toLowerCase() === model.toLowerCase()));
}
export function modelLabel(manufacturer: string, model: string) { return vehicleCategory(manufacturer, model)?.displayName ?? model; }
export function isElectricVehicle(manufacturer: string, model: string) { return vehicleCategory(manufacturer, model)?.powerTypes.length === 1 && vehicleCategory(manufacturer, model)?.powerTypes[0] === "전기차"; }
export const pickupPresets = [
  { label: "서울 시청 공영주차장", latitude: 37.5665, longitude: 126.978 },
  { label: "서울 성수 공유 주차장", latitude: 37.5445, longitude: 127.0557 },
  { label: "서울 여의도 공유 주차장", latitude: 37.5219, longitude: 126.9245 },
];
export function validKoreanPlate(value: string) {
  const normalized = value.replace(/\s|-/g, "");
  return /^(?:(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)\d{2}|\d{2,3})[가-힣]\d{4}$/.test(normalized);
}
