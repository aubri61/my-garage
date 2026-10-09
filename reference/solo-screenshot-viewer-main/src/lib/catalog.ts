import ioniq from "@/assets/car-ioniq5.jpg";
import ev6 from "@/assets/car-ev6.jpg";
import grandeur from "@/assets/car-grandeur.jpg";
import sorento from "@/assets/car-sorento.jpg";

export type Fuel = "전기" | "가솔린" | "하이브리드" | "디젤" | "LPG";
export type ModelInfo = { name: string; type: string; img?: string; fuels: Fuel[] };

export const BRANDS = ["현대", "기아"] as const;

export const MODELS: Record<string, ModelInfo[]> = {
  현대: [
    { name: "아이오닉 5", type: "SUV", img: ioniq, fuels: ["전기"] },
    { name: "아이오닉 6", type: "세단", fuels: ["전기"] },
    { name: "그랜저", type: "세단", img: grandeur, fuels: ["가솔린", "하이브리드", "LPG"] },
    { name: "쏘나타", type: "세단", fuels: ["가솔린", "하이브리드", "LPG"] },
    { name: "아반떼", type: "세단", fuels: ["가솔린", "하이브리드"] },
    { name: "투싼", type: "SUV", fuels: ["가솔린", "하이브리드", "디젤"] },
    { name: "싼타페", type: "SUV", fuels: ["가솔린", "하이브리드"] },
    { name: "팰리세이드", type: "SUV", fuels: ["가솔린", "디젤"] },
    { name: "코나", type: "SUV", fuels: ["가솔린", "하이브리드", "전기"] },
    { name: "캐스퍼", type: "경차", fuels: ["가솔린", "전기"] },
    { name: "스타리아", type: "승합", fuels: ["디젤", "LPG"] },
  ],
  기아: [
    { name: "EV6", type: "SUV", img: ev6, fuels: ["전기"] },
    { name: "EV9", type: "SUV", fuels: ["전기"] },
    { name: "쏘렌토", type: "SUV", img: sorento, fuels: ["가솔린", "하이브리드", "디젤"] },
    { name: "스포티지", type: "SUV", fuels: ["가솔린", "하이브리드", "디젤"] },
    { name: "K5", type: "세단", fuels: ["가솔린", "하이브리드", "LPG"] },
    { name: "K8", type: "세단", fuels: ["가솔린", "하이브리드", "LPG"] },
    { name: "K3", type: "세단", fuels: ["가솔린"] },
    { name: "셀토스", type: "SUV", fuels: ["가솔린", "디젤"] },
    { name: "니로", type: "SUV", fuels: ["하이브리드", "전기"] },
    { name: "레이", type: "경차", fuels: ["가솔린", "전기"] },
    { name: "카니발", type: "승합", fuels: ["가솔린", "디젤", "하이브리드"] },
  ],
};

export const modelInfo = (brand: string, model: string) => MODELS[brand]?.find((m) => m.name === model);

/** 한국 번호판: 12가3456 / 123가4567 / 서울12가3456 */
export const PLATE_RE = /^([가-힣]{2})?\d{2,3}[가-힣]\s?\d{4}$/;

/** 데모용 장소 목록 — 실제 지도 검색 API가 아닙니다. */
export const DEMO_PLACES = [
  { name: "강남역 2번 출구", address: "서울 강남구 강남대로 396", x: 52, y: 66 },
  { name: "코엑스몰 주차장", address: "서울 강남구 영동대로 513", x: 74, y: 48 },
  { name: "잠실 롯데월드몰", address: "서울 송파구 올림픽로 300", x: 84, y: 60 },
  { name: "성수역 3번 출구", address: "서울 성동구 아차산로 100", x: 70, y: 26 },
  { name: "서울숲 공영주차장", address: "서울 성동구 뚝섬로 273", x: 62, y: 22 },
  { name: "홍대입구역", address: "서울 마포구 양화로 160", x: 16, y: 34 },
  { name: "여의도 IFC몰", address: "서울 영등포구 국제금융로 10", x: 22, y: 58 },
  { name: "용산 아이파크몰", address: "서울 용산구 한강대로23길 55", x: 36, y: 48 },
  { name: "판교 현대백화점", address: "경기 성남시 분당구 판교역로 146번길 20", x: 66, y: 88 },
  { name: "서울역 주차장", address: "서울 중구 한강대로 405", x: 34, y: 30 },
];
