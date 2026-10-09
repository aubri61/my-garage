import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bell, Car, ChevronDown, Heart, MapPin, Search, SlidersHorizontal, Zap, User, Clock,
  CheckCircle2, FileSignature, X, Plus, Minus, LocateFixed,
} from "lucide-react";
import ioniq from "@/assets/car-ioniq5.jpg";
import ev6 from "@/assets/car-ev6.jpg";
import grandeur from "@/assets/car-grandeur.jpg";
import sorento from "@/assets/car-sorento.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "My Garage — 내 주변 차량 빌리기" },
      { name: "description", content: "이웃의 차를 시간 단위로 빌리는 프리미엄 차량 공유 마켓플레이스, My Garage." },
      { property: "og:title", content: "My Garage — 내 주변 차량 빌리기" },
      { property: "og:description", content: "이웃의 차를 시간 단위로 빌리는 프리미엄 차량 공유 마켓플레이스." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type CarItem = {
  id: number; brand: string; model: string; year: number; type: string; ev: boolean;
  address: string; owner: string; price: number; status: "available" | "booked";
  bookedUntil?: string; img: string; x: number; y: number; isNew?: boolean;
};

const CARS: CarItem[] = [
  { id: 1, brand: "현대", model: "아이오닉 5", year: 2024, type: "SUV", ev: true, address: "서울 강남구 테헤란로 152", owner: "김민준", price: 12000, status: "available", img: ioniq, x: 62, y: 58, isNew: true },
  { id: 2, brand: "기아", model: "EV6", year: 2023, type: "SUV", ev: true, address: "서울 서초구 강남대로 373", owner: "이서연", price: 13500, status: "booked", bookedUntil: "오후 10시", img: ev6, x: 48, y: 72 },
  { id: 3, brand: "현대", model: "그랜저", year: 2024, type: "세단", ev: false, address: "서울 송파구 올림픽로 300", owner: "박지호", price: 15000, status: "available", img: grandeur, x: 82, y: 64 },
  { id: 4, brand: "기아", model: "쏘렌토", year: 2023, type: "SUV", ev: false, address: "서울 성동구 왕십리로 83", owner: "최유나", price: 11000, status: "available", img: sorento, x: 66, y: 30 },
  { id: 5, brand: "현대", model: "아이오닉 5", year: 2022, type: "SUV", ev: true, address: "서울 용산구 한강대로 92", owner: "정하늘", price: 9900, status: "booked", bookedUntil: "오후 5시", img: ioniq, x: 34, y: 44 },
  { id: 6, brand: "기아", model: "EV6", year: 2024, type: "SUV", ev: true, address: "서울 마포구 월드컵북로 21", owner: "한도윤", price: 14000, status: "available", img: ev6, x: 18, y: 28, isNew: true },
];

const REQUESTS = [
  { id: 1, car: "기아 EV6 2023", time: "10월 12일 10:00 – 14:00", state: "contract", label: "계약 동의 필요" },
  { id: 2, car: "현대 그랜저 2024", time: "10월 14일 09:00 – 18:00", state: "pending", label: "소유자 승인 대기" },
  { id: 3, car: "현대 아이오닉 5 2024", time: "10월 3일 13:00 – 16:00", state: "done", label: "이용 완료" },
] as const;

const won = (n: number) => n.toLocaleString("ko-KR");

function Index() {
  const [selected, setSelected] = useState<number | null>(1);
  const [brand, setBrand] = useState("전체");
  const [types, setTypes] = useState<string[]>([]);
  const [evOnly, setEvOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState(16000);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("추천순");
  const [liked, setLiked] = useState<number[]>([1]);
  const [panel, setPanel] = useState(false);
  const [mobileFilter, setMobileFilter] = useState(false);

  const cars = useMemo(() => {
    let r = CARS.filter((c) =>
      (brand === "전체" || c.brand === brand) &&
      (types.length === 0 || types.includes(c.type)) &&
      (!evOnly || c.ev) && c.price <= maxPrice &&
      `${c.brand} ${c.model} ${c.address}`.includes(query.trim()),
    );
    if (sort === "낮은 가격순") r = [...r].sort((a, b) => a.price - b.price);
    if (sort === "높은 가격순") r = [...r].sort((a, b) => b.price - a.price);
    return r;
  }, [brand, types, evOnly, maxPrice, query, sort]);

  const actionCount = REQUESTS.filter((r) => r.state !== "done").length;

  const select = (id: number) => {
    setSelected(id);
    document.getElementById(`car-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const reset = () => { setBrand("전체"); setTypes([]); setEvOnly(false); setMaxPrice(16000); };

  const filters = (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">필터</h2>
        <button onClick={reset} className="text-sm font-medium text-primary">초기화</button>
      </div>
      <Section title="제조사">
        <div className="flex flex-wrap gap-2">
          {["전체", "현대", "기아", "제네시스"].map((b) => (
            <Chip key={b} active={brand === b} onClick={() => setBrand(b)}>{b}</Chip>
          ))}
        </div>
      </Section>
      <Section title="차종">
        <div className="grid grid-cols-2 gap-2.5">
          {["세단", "SUV", "경차", "승합"].map((t) => (
            <label key={t} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <input type="checkbox" checked={types.includes(t)}
                onChange={() => setTypes((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t])}
                className="size-4 rounded accent-primary" />
              {t}
            </label>
          ))}
        </div>
      </Section>
      <div className="flex items-center justify-between rounded-2xl bg-accent px-4 py-3.5">
        <span className="flex items-center gap-2 text-sm font-semibold text-accent-foreground"><Zap className="size-4" />전기차만 보기</span>
        <button role="switch" aria-checked={evOnly} onClick={() => setEvOnly(!evOnly)}
          className={`relative h-6 w-11 rounded-full transition ${evOnly ? "bg-primary" : "bg-border"}`}>
          <span className={`absolute top-0.5 size-5 rounded-full bg-card shadow transition-all ${evOnly ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>
      <Section title="시간당 대여 가격">
        <div className="mb-3 flex items-baseline justify-between text-sm">
          <span className="text-muted-foreground">최대</span>
          <span className="font-bold text-primary">₩{won(maxPrice)}</span>
        </div>
        <input type="range" min={8000} max={16000} step={500} value={maxPrice}
          onChange={(e) => setMaxPrice(+e.target.value)} className="w-full accent-primary" />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground"><span>₩8,000</span><span>₩16,000</span></div>
      </Section>
      <Section title="대여 시간">
        <div className="space-y-2">
          <TimeField label="시작" value="10월 12일 (월) 10:00" />
          <TimeField label="종료" value="10월 12일 (월) 14:00" />
        </div>
      </Section>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-4 sm:px-8">
          <a href="/" className="flex shrink-0 items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-navy text-navy-foreground"><Car className="size-5" /></span>
            <span className="text-lg font-extrabold tracking-tight">My Garage</span>
          </a>
          <nav className="hidden items-center gap-1 rounded-full bg-secondary p-1 md:flex">
            <span className="rounded-full bg-card px-4 py-1.5 text-sm font-semibold shadow-card">차량 빌리기</span>
            <span className="px-4 py-1.5 text-sm font-medium text-muted-foreground">차량 빌려주기</span>
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span className="hidden items-center gap-1.5 text-sm text-muted-foreground lg:flex"><MapPin className="size-4" />서울 강남구</span>
            <button onClick={() => setPanel(true)} className="relative flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium hover:bg-secondary">
              <Bell className="size-4" />
              <span className="hidden sm:inline">예약 내역</span>
              <span className="grid size-5 place-items-center rounded-full bg-destructive text-[11px] font-bold text-destructive-foreground">{actionCount}</span>
            </button>
            <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-secondary">
              <span className="grid size-8 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground">야</span>
              <span className="hidden text-sm font-semibold sm:inline">야옹이좋아</span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1440px] gap-8 px-4 py-6 sm:px-8">
        <aside className="sticky top-22 hidden h-fit w-[300px] shrink-0 rounded-3xl border bg-card p-6 shadow-card lg:block">{filters}</aside>

        <main className="min-w-0 flex-1 space-y-6">
          {/* Action banner */}
          <button onClick={() => setPanel(true)} className="flex w-full items-center gap-3 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-left">
            <FileSignature className="size-5 shrink-0 text-warning" />
            <span className="min-w-0 flex-1 truncate text-sm"><b>기아 EV6</b> 대여 요청이 승인되었어요. 계약서에 동의하면 예약이 확정됩니다.</span>
            <span className="shrink-0 text-sm font-semibold text-primary">확인하기</span>
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">서울 강남구 · 10월 12일 10:00 – 14:00</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">대여 가능한 차량 <span className="text-primary">{cars.length}</span>대</h1>
            </div>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1 sm:w-64">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="차종, 지역 검색"
                  className="h-11 w-full rounded-xl border bg-card pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-11 rounded-xl border bg-card px-3 text-sm font-medium outline-none">
                {["추천순", "낮은 가격순", "높은 가격순"].map((s) => <option key={s}>{s}</option>)}
              </select>
              <button onClick={() => setMobileFilter(true)} className="grid size-11 shrink-0 place-items-center rounded-xl border bg-card lg:hidden" aria-label="필터">
                <SlidersHorizontal className="size-4" />
              </button>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            {/* Map */}
            <div className="relative h-72 overflow-hidden rounded-3xl border bg-map shadow-card sm:h-96 xl:sticky xl:top-22 xl:h-[calc(100vh-7.5rem)]">
              <MapArt />
              {cars.map((c) => {
                const on = c.id === selected;
                return (
                  <button key={c.id} onClick={() => select(c.id)} style={{ left: `${c.x}%`, top: `${c.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-full transition-all ${on ? "z-20 scale-110" : "z-10 hover:scale-105"}`}>
                    <span className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold shadow-card ${on ? "bg-primary text-primary-foreground shadow-lift" : c.status === "available" ? "bg-card text-foreground" : "bg-muted text-muted-foreground"}`}>
                      {c.ev && <Zap className="size-3" />}₩{won(c.price)}
                    </span>
                    <span className={`mx-auto block size-2.5 -translate-y-1 rotate-45 ${on ? "bg-primary" : c.status === "available" ? "bg-card" : "bg-muted"}`} />
                  </button>
                );
              })}
              <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-xl border bg-card shadow-card">
                <button className="grid size-9 place-items-center hover:bg-secondary"><Plus className="size-4" /></button>
                <button className="grid size-9 place-items-center border-t hover:bg-secondary"><Minus className="size-4" /></button>
              </div>
              <button className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-xl border bg-card shadow-card"><LocateFixed className="size-4 text-primary" /></button>
              <span className="absolute bottom-3 left-3 rounded-lg bg-card/90 px-2.5 py-1 text-[11px] text-muted-foreground">디자인 시안용 지도</span>
            </div>

            {/* Cards */}
            <div className="grid content-start gap-5 sm:grid-cols-2">
              {cars.map((c) => (
                <CarCard key={c.id} car={c} active={c.id === selected} liked={liked.includes(c.id)}
                  onSelect={() => setSelected(c.id)}
                  onLike={() => setLiked((p) => p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id])} />
              ))}
              {cars.length === 0 && (
                <div className="col-span-full rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">조건에 맞는 차량이 없어요. 필터를 조정해 보세요.</div>
              )}
              <div className="col-span-full flex flex-col items-start gap-4 rounded-3xl bg-gradient-navy p-7 text-navy-foreground sm:flex-row sm:items-center">
                <div className="flex-1">
                  <p className="text-xl font-bold">세워둔 내 차로 수익 만들기</p>
                  <p className="mt-1 text-sm opacity-75">이용하지 않는 시간에 차량을 빌려주고 월 평균 48만원을 벌어보세요.</p>
                </div>
                <button className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">차량 등록하기</button>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground">표시된 가격과 차량 정보는 디자인 시안용 예시 데이터입니다.</p>
        </main>
      </div>

      {/* Mobile filter */}
      {mobileFilter && (
        <Overlay onClose={() => setMobileFilter(false)} side="bottom">{filters}
          <button onClick={() => setMobileFilter(false)} className="mt-6 h-12 w-full rounded-xl bg-primary font-semibold text-primary-foreground">차량 {cars.length}대 보기</button>
        </Overlay>
      )}

      {/* Requests panel */}
      {panel && (
        <Overlay onClose={() => setPanel(false)} side="right">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold">내 대여 요청</h2>
            <button onClick={() => setPanel(false)} className="grid size-8 place-items-center rounded-full hover:bg-secondary"><X className="size-4" /></button>
          </div>
          <p className="mb-3 text-xs font-semibold text-muted-foreground">확인이 필요해요</p>
          <div className="space-y-3">
            {REQUESTS.map((r) => (
              <div key={r.id} className={`rounded-2xl border p-4 ${r.state === "contract" ? "border-warning/40 bg-warning-soft" : r.state === "done" ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{r.car}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="size-3.5" />{r.time}</p>
                  </div>
                  <StatusPill state={r.state} label={r.label} />
                </div>
                {r.state === "contract" && (
                  <button className="mt-4 h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground">계약서 확인 및 동의</button>
                )}
              </div>
            ))}
          </div>
        </Overlay>
      )}
    </div>
  );
}

function CarCard({ car, active, liked, onSelect, onLike }: { car: CarItem; active: boolean; liked: boolean; onSelect: () => void; onLike: () => void }) {
  const ok = car.status === "available";
  return (
    <article id={`car-${car.id}`} onClick={onSelect}
      className={`group cursor-pointer overflow-hidden rounded-3xl border bg-card transition-all ${active ? "border-primary shadow-lift ring-2 ring-primary/20" : "shadow-card hover:-translate-y-0.5 hover:shadow-lift"}`}>
      <div className="relative bg-card px-4 pt-4">
        <div className="absolute left-4 top-4 z-10 flex gap-1.5">
          {car.isNew && <span className="rounded-lg bg-navy px-2.5 py-1 text-xs font-semibold text-navy-foreground">NEW</span>}
          <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${ok ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"}`}>{ok ? "대여 가능" : `${car.bookedUntil}까지 예약`}</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onLike(); }} aria-label="찜하기" className="absolute right-4 top-4 z-10 grid size-8 place-items-center rounded-full bg-secondary">
          <Heart className={`size-4 ${liked ? "fill-primary text-primary" : "text-muted-foreground"}`} />
        </button>
        <img src={car.img} alt={`${car.brand} ${car.model}`} loading="lazy" width={1024} height={640}
          className={`mt-6 aspect-[16/10] w-full object-contain transition-transform duration-500 group-hover:scale-105 ${ok ? "" : "grayscale-[40%]"}`} />
      </div>
      <div className="space-y-3 p-5 pt-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{car.brand} · {car.year}년식</p>
            <h3 className="truncate text-lg font-bold">{car.model}</h3>
          </div>
          <p className="shrink-0 text-right"><span className="text-lg font-extrabold">₩{won(car.price)}</span><span className="text-xs text-muted-foreground"> /시간</span></p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {car.ev && <span className="flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"><Zap className="size-3" />전기차</span>}
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">{car.type}</span>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5 truncate"><MapPin className="size-3.5 shrink-0" />{car.address}</p>
          <p className="flex items-center gap-1.5"><User className="size-3.5 shrink-0" />{car.owner} 님의 차량</p>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button onClick={(e) => e.stopPropagation()} className="h-10 rounded-xl border text-sm font-semibold hover:bg-secondary">상세 보기</button>
          <button disabled={!ok} onClick={(e) => e.stopPropagation()} className="h-10 rounded-xl bg-primary text-sm font-semibold text-primary-foreground disabled:bg-muted disabled:text-muted-foreground">대여 신청</button>
        </div>
      </div>
    </article>
  );
}

function MapArt() {
  return (
    <svg className="absolute inset-0 size-full" preserveAspectRatio="xMidYMid slice" viewBox="0 0 600 600">
      <path d="M0 330 C120 300 200 360 320 330 S520 280 600 310 L600 370 C500 340 420 400 320 390 S120 360 0 390Z" className="fill-map-water" />
      <rect x="380" y="90" width="120" height="90" rx="20" className="fill-map-park" />
      <rect x="60" y="440" width="140" height="100" rx="24" className="fill-map-park" />
      <g className="stroke-map-road" strokeLinecap="round" fill="none">
        <path d="M0 160 H600 M0 480 H600 M150 0 V600 M430 0 V600" strokeWidth="14" />
        <path d="M0 60 L600 260 M80 600 L560 0 M0 250 H600 M290 0 V600 M0 560 H600" strokeWidth="7" />
      </g>
    </svg>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><p className="mb-3 text-sm font-semibold">{title}</p>{children}</div>;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition ${active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-secondary"}`}>{children}</button>;
}

function TimeField({ label, value }: { label: string; value: string }) {
  return (
    <button className="flex w-full items-center gap-3 rounded-xl border bg-card px-3.5 py-2.5 text-left hover:bg-secondary">
      <Clock className="size-4 text-primary" />
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="ml-auto text-sm font-medium">{value}</span>
    </button>
  );
}

function StatusPill({ state, label }: { state: string; label: string }) {
  const cls = state === "contract" ? "bg-warning text-primary-foreground" : state === "pending" ? "bg-accent text-accent-foreground" : "bg-success-soft text-success";
  const Icon = state === "done" ? CheckCircle2 : state === "contract" ? FileSignature : Clock;
  return <span className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold ${cls}`}><Icon className="size-3" />{label}</span>;
}

function Overlay({ children, onClose, side }: { children: React.ReactNode; onClose: () => void; side: "right" | "bottom" }) {
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-navy/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`absolute overflow-y-auto bg-card p-6 shadow-lift ${side === "right" ? "inset-y-0 right-0 w-full max-w-md" : "inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl"}`}>{children}</div>
    </div>
  );
}
