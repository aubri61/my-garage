/**
 * 프로토타입용 데모 상태 저장소.
 * 실제 서버(Spring Boot) 연동 시 이 파일의 액션들을 API 호출로 교체하면 됩니다.
 * 상태 구조(예약 → 승인 → 양측 서명 → 확정 → 디지털 키)는 실제 서비스 개념과 맞춰 두었습니다.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import ioniq from "@/assets/car-ioniq5.jpg";
import ev6 from "@/assets/car-ev6.jpg";
import grandeur from "@/assets/car-grandeur.jpg";
import sorento from "@/assets/car-sorento.jpg";
import type { Fuel } from "./catalog";

export const ME = "me";
const HOUR = 3600_000;

export type Car = {
  id: string; ownerId: string; ownerName: string; brand: string; model: string; year: number;
  type: string; fuel: Fuel; plate: string; price: number; minHours: number; isPublic: boolean;
  description: string; features: string[]; address: string; place: string; detail: string;
  pickupNote: string; img?: string; x: number; y: number; isNew?: boolean;
};

/** PENDING 승인 대기 · REJECTED 거절 · CONTRACT 계약 서명 진행 · CONFIRMED 계약 확정 · CANCELED 취소 */
export type BookingStatus = "PENDING" | "REJECTED" | "CONTRACT" | "CONFIRMED" | "CANCELED";
export type Sign = { data: string; at: number };
/** 디지털 키 잠금 상태 */
export type KeyState = "LOCKED" | "UNLOCK_REQUESTED" | "UNLOCKED";

export type Booking = {
  id: string; carId: string; renterId: string; renterName: string; start: number; end: number;
  price: number; status: BookingStatus; createdAt: number;
  renterSign?: Sign; ownerSign?: Sign; key: KeyState;
};

export type User = { id: string; name: string; email: string };

type State = { user: User | null; cars: Car[]; bookings: Booking[]; version: number };

const STORAGE = "mygarage-demo-v1";

function seed(): State {
  const base = Math.floor(Date.now() / HOUR) * HOUR;
  const car = (c: Partial<Car> & Pick<Car, "id" | "ownerId" | "ownerName" | "brand" | "model">): Car => ({
    year: 2024, type: "SUV", fuel: "전기", plate: "12가3456", price: 12000, minHours: 2, isPublic: true,
    description: "깨끗하게 관리 중인 차량입니다. 실내 금연 차량이에요.", features: ["후방 카메라", "스마트키", "통풍 시트"],
    address: "", place: "", detail: "지하 2층", pickupNote: "주차장 입구 왼편에 있어요.", x: 50, y: 50, ...c,
  });
  return {
    version: 1,
    user: { id: ME, name: "야옹이좋아", email: "demo@mygarage.kr" },
    cars: [
      car({ id: "c1", ownerId: "u1", ownerName: "김민준", brand: "현대", model: "아이오닉 5", plate: "123가4567", address: "서울 강남구 테헤란로 152", place: "강남파이낸스센터", img: ioniq, x: 62, y: 58, isNew: true }),
      car({ id: "c2", ownerId: "u2", ownerName: "이서연", brand: "기아", model: "EV6", year: 2023, price: 13500, plate: "45나1234", address: "서울 서초구 강남대로 373", place: "강남역 인근", img: ev6, x: 48, y: 72 }),
      car({ id: "c3", ownerId: "u3", ownerName: "박지호", brand: "현대", model: "그랜저", type: "세단", fuel: "하이브리드", price: 15000, plate: "88다7777", address: "서울 송파구 올림픽로 300", place: "잠실 롯데월드몰", img: grandeur, x: 82, y: 64 }),
      car({ id: "c4", ownerId: "u4", ownerName: "최유나", brand: "기아", model: "쏘렌토", year: 2023, fuel: "디젤", price: 11000, plate: "30라2020", address: "서울 성동구 왕십리로 83", place: "성수동", img: sorento, x: 66, y: 30 }),
      car({ id: "c5", ownerId: "u5", ownerName: "정하늘", brand: "현대", model: "아이오닉 5", year: 2022, price: 9900, plate: "77마5555", address: "서울 용산구 한강대로 92", place: "용산역", img: ioniq, x: 34, y: 44 }),
      car({ id: "c6", ownerId: "u6", ownerName: "한도윤", brand: "기아", model: "EV6", price: 14000, plate: "19바9191", address: "서울 마포구 월드컵북로 21", place: "홍대입구", img: ev6, x: 18, y: 28, isNew: true }),
      car({ id: "m1", ownerId: ME, ownerName: "야옹이좋아", brand: "기아", model: "쏘렌토", fuel: "하이브리드", price: 12500, plate: "52사3021", address: "서울 강남구 영동대로 513", place: "코엑스몰 주차장", detail: "지하 3층 C구역", img: sorento, x: 74, y: 48 }),
      car({ id: "m2", ownerId: ME, ownerName: "야옹이좋아", brand: "현대", model: "그랜저", type: "세단", fuel: "가솔린", year: 2023, price: 14500, plate: "61아8080", isPublic: false, address: "서울 성동구 뚝섬로 273", place: "서울숲 공영주차장", img: grandeur, x: 62, y: 22 }),
    ],
    bookings: [
      // 내가 빌린 차: 소유자 승인 완료, 내 서명 필요
      { id: "b1", carId: "c2", renterId: ME, renterName: "야옹이좋아", start: base + 26 * HOUR, end: base + 30 * HOUR, price: 13500, status: "CONTRACT", createdAt: base - 5 * HOUR, key: "LOCKED" },
      // 내가 빌린 차: 승인 대기
      { id: "b2", carId: "c3", renterId: ME, renterName: "야옹이좋아", start: base + 50 * HOUR, end: base + 59 * HOUR, price: 15000, status: "PENDING", createdAt: base - 2 * HOUR, key: "LOCKED" },
      // 내 차에 들어온 새 신청
      { id: "b3", carId: "m1", renterId: "u7", renterName: "박서준", start: base + 20 * HOUR, end: base + 25 * HOUR, price: 12500, status: "PENDING", createdAt: base - HOUR, key: "LOCKED" },
      // 지난 대여
      { id: "b4", carId: "m1", renterId: "u8", renterName: "윤지아", start: base - 72 * HOUR, end: base - 68 * HOUR, price: 12500, status: "CONFIRMED", createdAt: base - 90 * HOUR, renterSign: { data: "", at: base - 80 * HOUR }, ownerSign: { data: "", at: base - 79 * HOUR }, key: "LOCKED" },
      { id: "b5", carId: "c1", renterId: ME, renterName: "야옹이좋아", start: base - 150 * HOUR, end: base - 147 * HOUR, price: 12000, status: "CONFIRMED", createdAt: base - 170 * HOUR, renterSign: { data: "", at: base - 160 * HOUR }, ownerSign: { data: "", at: base - 159 * HOUR }, key: "LOCKED" },
    ],
  };
}

/** 예약의 시간 기준 단계 */
export type Phase = "PENDING" | "REJECTED" | "CANCELED" | "CONTRACT" | "UPCOMING" | "ACTIVE" | "DONE";
export const phaseOf = (b: Booking, now = Date.now()): Phase => {
  if (b.status !== "CONFIRMED") return b.status;
  if (now < b.start) return "UPCOMING";
  if (now < b.end) return "ACTIVE";
  return "DONE";
};
export const PHASE_LABEL: Record<Phase, string> = {
  PENDING: "소유자 승인 대기", REJECTED: "거절됨", CANCELED: "취소됨", CONTRACT: "계약 서명 진행 중",
  UPCOMING: "예약 확정", ACTIVE: "이용 중", DONE: "이용 완료",
};

export const hoursOf = (b: { start: number; end: number }) => Math.max(0, (b.end - b.start) / HOUR);
export const totalOf = (b: Booking) => Math.round(hoursOf(b) * b.price);

/** 기간 검증 — 오류 메시지 또는 null */
export function validatePeriod(car: Car, start: number, end: number, bookings: Booking[], now = Date.now()): string | null {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "대여 시작과 종료 시간을 선택해 주세요.";
  if (start < now) return "시작 시간은 현재 시각 이후여야 해요.";
  if (end <= start) return "종료 시간은 시작 시간보다 늦어야 해요.";
  if ((end - start) / HOUR < car.minHours) return `이 차량은 최소 ${car.minHours}시간부터 빌릴 수 있어요.`;
  if ((end - start) / HOUR > 24 * 14) return "한 번에 최대 14일까지 빌릴 수 있어요.";
  const clash = bookings.some((b) => b.carId === car.id && ["PENDING", "CONTRACT", "CONFIRMED"].includes(b.status) && start < b.end && end > b.start);
  if (clash) return "다른 예약과 시간이 겹쳐요. 다른 시간을 선택해 주세요.";
  return null;
}

type Ctx = State & {
  hydrated: boolean;
  login: (email: string, name?: string) => void;
  logout: () => void;
  addCar: (c: Omit<Car, "id" | "ownerId" | "ownerName">) => string;
  updateCar: (id: string, patch: Partial<Car>) => void;
  deleteCar: (id: string) => void;
  requestBooking: (carId: string, start: number, end: number) => string;
  setStatus: (id: string, status: BookingStatus) => void;
  sign: (id: string, side: "renter" | "owner", data: string) => void;
  patchBooking: (id: string, patch: Partial<Booking>) => void;
  resetDemo: () => void;
};

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(seed);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) { const s = JSON.parse(raw) as State; if (s.version === 1) setState(s); }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch { /* 저장 공간 초과 시 무시 */ }
  }, [state, hydrated]);

  const up = useCallback((fn: (s: State) => State) => setState(fn), []);
  const meName = state.user?.name ?? "";

  const value = useMemo<Ctx>(() => ({
    ...state, hydrated,
    login: (email, name) => up((s) => {
      const n: string = name || s.user?.name || email.split("@")[0] || "회원";
      return { ...s, user: { id: ME, name: n, email },
        cars: s.cars.map((c) => c.ownerId === ME ? { ...c, ownerName: n } : c),
        bookings: s.bookings.map((b) => b.renterId === ME ? { ...b, renterName: n } : b) };
    }),
    logout: () => up((s) => ({ ...s, user: null })),
    addCar: (c) => {
      const id = `m${Date.now()}`;
      up((s) => ({ ...s, cars: [{ ...c, id, ownerId: ME, ownerName: meName, isNew: true }, ...s.cars] }));
      return id;
    },
    updateCar: (id, patch) => up((s) => ({ ...s, cars: s.cars.map((c) => c.id === id ? { ...c, ...patch } : c) })),
    deleteCar: (id) => up((s) => ({ ...s, cars: s.cars.filter((c) => c.id !== id),
      bookings: s.bookings.map((b) => b.carId === id && ["PENDING", "CONTRACT"].includes(b.status) ? { ...b, status: "CANCELED" } : b) })),
    requestBooking: (carId, start, end) => {
      const id = `b${Date.now()}`;
      up((s) => {
        const car = s.cars.find((c) => c.id === carId)!;
        return { ...s, bookings: [{ id, carId, renterId: ME, renterName: meName, start, end, price: car.price, status: "PENDING", createdAt: Date.now(), key: "LOCKED" }, ...s.bookings] };
      });
      return id;
    },
    setStatus: (id, status) => up((s) => ({ ...s, bookings: s.bookings.map((b) => b.id === id ? { ...b, status } : b) })),
    sign: (id, side, data) => up((s) => ({ ...s, bookings: s.bookings.map((b) => {
      if (b.id !== id) return b;
      const nb = { ...b, [side === "renter" ? "renterSign" : "ownerSign"]: { data, at: Date.now() } };
      if (nb.renterSign && nb.ownerSign && nb.status === "CONTRACT") nb.status = "CONFIRMED";
      return nb;
    }) })),
    patchBooking: (id, patch) => up((s) => ({ ...s, bookings: s.bookings.map((b) => b.id === id ? { ...b, ...patch } : b) })),
    resetDemo: () => setState(seed()),
  }), [state, hydrated, up, meName]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
}

/** 1분마다 갱신되는 현재 시각 */
export function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

export const won = (n: number) => n.toLocaleString("ko-KR");
const WD = ["일", "월", "화", "수", "목", "금", "토"];
export const fmt = (t: number) => {
  const d = new Date(t);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]}) ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
export const fmtRange = (a: number, b: number) => {
  const sameDay = new Date(a).toDateString() === new Date(b).toDateString();
  const e = new Date(b);
  return `${fmt(a)} – ${sameDay ? `${String(e.getHours()).padStart(2, "0")}:${String(e.getMinutes()).padStart(2, "0")}` : fmt(b)}`;
};

/** 알림 수 */
export function useCounts() {
  const { bookings, cars } = useStore();
  const mine = new Set(cars.filter((c) => c.ownerId === ME).map((c) => c.id));
  const owner = bookings.filter((b) => mine.has(b.carId) && (b.status === "PENDING" || (b.status === "CONTRACT" && !b.ownerSign) || b.key === "UNLOCK_REQUESTED")).length;
  const renter = bookings.filter((b) => b.renterId === ME && b.status === "CONTRACT" && !b.renterSign).length;
  return { owner, renter };
}
