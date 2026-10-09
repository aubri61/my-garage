import { loadKakaoMaps, validCoordinates, type KakaoAddress, type KakaoPlace } from "./kakao-maps";
export interface PickupResult { label: string; address: string; latitude: number; longitude: number }
async function services() {
  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  if (!key) throw new Error("주소 검색을 연결하지 못했습니다. 지도에서 선택하거나 위치를 직접 입력해주세요.");
  const maps = await loadKakaoMaps(key);
  if (!maps.services) throw new Error("주소 검색을 연결하지 못했습니다. 지도에서 선택하거나 위치를 직접 입력해주세요.");
  return maps.services;
}
export async function searchPickup(query: string): Promise<PickupResult[]> {
  const sdk = await services();
  const request = <T,>(call: (callback: (results: T[], status: string) => void) => void) => new Promise<T[]>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("주소 검색 응답이 지연되고 있습니다.")), 8000);
    call((results, status) => {
      window.clearTimeout(timer);
      if (status === sdk.Status.OK) resolve(results);
      else if (status === sdk.Status.ZERO_RESULT) resolve([]);
      else reject(new Error("주소 검색을 잠시 이용할 수 없습니다."));
    });
  });
  const results = await Promise.allSettled([
    request<KakaoAddress>(callback => new sdk.Geocoder().addressSearch(query, callback)),
    request<KakaoPlace>(callback => new sdk.Places().keywordSearch(query, callback, { size: 5 })),
  ]);
  if (results.every(result => result.status === "rejected")) throw new Error("주소 검색을 잠시 이용할 수 없습니다. 지도에서 선택하거나 위치를 직접 입력해주세요.");
  const addresses = results[0].status === "fulfilled" ? results[0].value.map(item => ({ label: item.road_address?.address_name ?? item.address_name, address: item.road_address?.address_name ?? item.address_name, latitude: Number(item.y), longitude: Number(item.x) })) : [];
  const places = results[1].status === "fulfilled" ? results[1].value.map(item => ({ label: item.place_name, address: item.road_address_name || item.address_name, latitude: Number(item.y), longitude: Number(item.x) })) : [];
  return [...addresses, ...places].filter((item, index, all) => validCoordinates(item.latitude, item.longitude) && all.findIndex(other => other.address === item.address && other.label === item.label) === index).slice(0, 6);
}
export async function addressAt(latitude: number, longitude: number): Promise<string | null> {
  const sdk = await services();
  return new Promise(resolve => {
    const timer = window.setTimeout(() => resolve(null), 5000);
    new sdk.Geocoder().coord2Address(longitude, latitude, (items, status) => {
      window.clearTimeout(timer);
      resolve(status === sdk.Status.OK ? items[0]?.road_address?.address_name ?? items[0]?.address?.address_name ?? null : null);
    });
  });
}
