export interface KakaoPlace { id: string; place_name: string; address_name: string; road_address_name: string; x: string; y: string }
export interface KakaoAddress { address_name: string; x: string; y: string; address?: { address_name: string }; road_address?: { address_name: string } }
export interface KakaoLatLng { getLat(): number; getLng(): number }
export interface KakaoBounds { extend(position: KakaoLatLng): void }
export interface KakaoMapInstance {
  setCenter(position: KakaoLatLng): void;
  getCenter(): KakaoLatLng;
  setBounds(bounds: KakaoBounds, top?: number, right?: number, bottom?: number, left?: number): void;
  relayout(): void;
}
export interface KakaoOverlay { setMap(map: KakaoMapInstance | null): void }
export interface KakaoMaps {
  services: {
    Status: { OK: string; ZERO_RESULT: string; ERROR: string };
    Places: new () => { keywordSearch(query: string, callback: (results: KakaoPlace[], status: string) => void, options?: { size: number }): void };
    Geocoder: new () => {
      addressSearch(query: string, callback: (results: KakaoAddress[], status: string) => void): void;
      coord2Address(longitude: number, latitude: number, callback: (results: KakaoAddress[], status: string) => void): void;
    };
  };
  load(callback: () => void): void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoBounds;
  Map: new (container: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMapInstance;
  CustomOverlay: new (options: { map: KakaoMapInstance; position: KakaoLatLng; content: HTMLElement; clickable: boolean; yAnchor: number; zIndex: number }) => KakaoOverlay;
  event: {
    addListener(map: KakaoMapInstance, event: "click", callback: (event: { latLng: KakaoLatLng }) => void): void;
    removeListener(map: KakaoMapInstance, event: "click", callback: (event: { latLng: KakaoLatLng }) => void): void;
  };
}
declare global { interface Window { kakao?: { maps: KakaoMaps } } }
let sdkPromise: Promise<KakaoMaps> | undefined;

// Share one SDK request across list maps and pickup editors. A failed request can be retried.
export function loadKakaoMaps(key: string): Promise<KakaoMaps> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<KakaoMaps>((resolve, reject) => {
    const script = document.createElement("script");
    let finished = false;
    const fail = (message: string) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      script.remove();
      sdkPromise = undefined;
      reject(new Error(message));
    };
    const timer = window.setTimeout(() => fail("카카오맵 로딩 시간이 초과되었습니다."), 15000);
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => {
      const maps = window.kakao?.maps;
      if (!maps) { fail("카카오맵 SDK를 초기화하지 못했습니다."); return; }
      maps.load(() => {
        if (finished) return;
        finished = true;
        window.clearTimeout(timer);
        resolve(maps);
      });
    };
    script.onerror = () => fail("카카오맵을 연결하지 못했습니다. JavaScript 키와 등록된 웹 도메인을 확인해주세요.");
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export function validCoordinates(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}
