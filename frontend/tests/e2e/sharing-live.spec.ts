import { test, expect } from "./isolated-test";
import { type BrowserContext, type Page } from "@playwright/test";

// Actual Spring/PostgreSQL service; no intercepted APIs or synthetic successes.
test("두 계정 공유·계약·SSE·원격 승인·회수·세션 복원", async ({ browser }) => {
  test.skip(process.env.RUN_LIVE_SHARING !== "1", "RUN_LIVE_SHARING=1 및 실제 백엔드 필요");
  test.setTimeout(120000);
  const owner = await browser.newContext(), renter = await browser.newContext(), other = await browser.newContext();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  async function mutate(context: BrowserContext, method: "post" | "put", path: string, data?: unknown) {
    const csrf = await context.request.get("/api/csrf"); expect(csrf.status()).toBe(200);
    const token = await csrf.json();
    return context.request[method](path, { data, headers: { [token.headerName]: token.token } });
  }
  async function account(context: BrowserContext, name: string) {
    const email = `e2e-${process.env.E2E_RUN_ID}-${name}@example.com`;
    expect((await mutate(context, "post", "/api/users/signup", { name, email, password: "Password123!" })).status()).toBe(201);
    expect((await mutate(context, "post", "/api/auth/login", { email, password: "Password123!" })).status()).toBe(200);
  }
  async function connect(page: Page) {
    await page.evaluate(() => new Promise<void>(resolve => {
      (window as Window & { sharingEvents?: string[] }).sharingEvents = [];
      const stream = new EventSource("/api/notifications/stream");
      stream.addEventListener("ready", () => resolve(), { once: true });
      stream.addEventListener("change", event => (window as Window & { sharingEvents?: string[] }).sharingEvents?.push((event as MessageEvent).data));
    }));
  }
  async function event(page: Page, action: string) {
    await expect.poll(() => page.evaluate(action => (window as Window & { sharingEvents?: string[] }).sharingEvents?.some(e => e.includes(action)), action)).toBe(true);
  }
  try {
    await account(owner, "Owner"); await account(renter, "Renter"); await account(other, "Other");
    const response = await mutate(owner, "post", "/api/vehicles", { manufacturer: "Hyundai", model: `LIVE-${suffix}`, modelYear: 2025, licensePlate: "live-test", hourlyRate: 12000 });
    expect(response.status()).toBe(201); const vehicle = await response.json();
    expect((await mutate(owner, "put", `/api/vehicles/${vehicle.id}/sharing`, { enabled: true, pickupLocation: "서울 시청 테스트 픽업", latitude: 37.5665, longitude: 126.978 })).status()).toBe(200);
    const a = await owner.newPage(), b = await renter.newPage(), c = await other.newPage();
    await a.goto("/owner"); await b.goto("/renter");
    await expect(a.getByText("실시간 연결됨", { exact: true })).toBeVisible(); await expect(b.getByText("실시간 연결됨", { exact: true })).toBeVisible();
    await c.goto("/renter"); await connect(a); await connect(b); await connect(c);
    await b.getByLabel("차량·픽업 주소 검색", {exact:true}).fill("차량 정보 확인 필요");
    await b.locator(`button[data-vehicle-id="${vehicle.id}"]`).click();
    const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    await b.getByLabel("대여 시작 시각").fill(local(new Date(Date.now() + 60000)));
    await b.getByLabel("대여 종료 시각").fill(local(new Date(Date.now() + 3660000)));
    await b.getByRole("button", { name: "대여 신청하기", exact: true }).click();
    await expect(b.getByText(/대여 신청이 완료되었습니다/)).toBeVisible(); await event(a, "RENTAL_REQUESTED");
    expect(await c.evaluate(() => (window as Window & { sharingEvents?: string[] }).sharingEvents?.length)).toBe(0);
    const listing = await renter.request.get("/api/rentals");
    const requested = (await listing.json()).find((r: { vehicleId: number }) => r.vehicleId === vehicle.id);
    expect((await mutate(owner, "post", `/api/rentals/${requested.id}/reject`)).status()).toBe(200);
    // Request a current-time period through REST to run the activation flow immediately.
    const rentalResponse = await mutate(renter, "post", "/api/rentals", { vehicleId: vehicle.id, startsAt: new Date().toISOString(), endsAt: new Date(Date.now()+3600000).toISOString() });
    expect(rentalResponse.status()).toBe(201); const rental = await rentalResponse.json();
    const ownerCard = a.locator(`article[data-rental-id="${rental.id}"]`);
    await b.goto("/bookings");
    await connect(b);
const renterCard = b.locator(`article[data-rental-id="${rental.id}"]`);
    await ownerCard.getByRole("button", { name: "대여 승인", exact: true }).click(); await event(b, "RENTAL_APPROVED");
    await ownerCard.getByRole("checkbox", { name: "계약 조건과 대여 요금을 확인하고 동의합니다.", exact: true }).check();
    await ownerCard.getByLabel("서명 대신 이름 입력", { exact: true }).fill("테스트 동의자");
    await ownerCard.getByRole("button", { name: "위 계약 조건에 동의" }).click();
    await renterCard.getByRole("checkbox", { name: "계약 조건과 대여 요금을 확인하고 동의합니다.", exact: true }).check();
    await renterCard.getByLabel("서명 대신 이름 입력", { exact: true }).fill("테스트 동의자");
    await renterCard.getByRole("button", { name: "위 계약 조건에 동의" }).click();
    await expect(renterCard.getByText(/(?:접근 권한 활성|차량 접근 권한 활성)/)).toBeVisible();
    await renterCard.getByRole("button", { name: "문 열기 요청", exact: true }).click(); await event(a, "UNLOCK_REQUESTED");
    await ownerCard.getByRole("button", { name: "잠금 해제 승인", exact: true }).click(); await event(b, "UNLOCK_APPROVED");
    await expect(renterCard.getByText(/차량 잠금 해제됨/)).toBeVisible();
    await renter.setOffline(true);
    await expect(b.getByText(/재연결 중/)).toBeVisible();
    await renter.setOffline(false);
    await expect(b.getByText("실시간 연결됨", { exact: true })).toBeVisible();
    await b.reload(); await expect(renterCard.getByText(/차량 잠금 해제됨/)).toBeVisible();
    await ownerCard.getByRole("button", { name: "접근 권한 회수", exact: true }).click();
    await expect(renterCard.getByText("접근 권한 종료", { exact: true })).toBeVisible();
    expect((await mutate(renter, "post", `/api/rentals/${rental.id}/unlock-requests`)).status()).toBe(403);
    expect((await mutate(other, "post", `/api/rentals/${rental.id}/approve`)).status()).toBe(404);
    expect((await mutate(renter, "post", `/api/vehicles/${vehicle.id}/ota/verify`, { scenario: "VALID", protectionEnabled: true })).status()).toBe(404);
    expect((await mutate(owner, "post", `/api/vehicles/${vehicle.id}/ota/verify`, { scenario: "VALID", protectionEnabled: true })).status()).toBe(200);
    expect((await renter.request.post(`/api/rentals/${rental.id}/unlock-requests`)).status()).toBe(403);
    await a.screenshot({path:"/private/tmp/my-garage-owner-final.png",fullPage:true});
    await b.screenshot({path:"/private/tmp/my-garage-renter-final.png",fullPage:true});
    await b.setViewportSize({width:390,height:844});
    expect(await b.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await b.screenshot({path:"/private/tmp/my-garage-renter-mobile-final.png",fullPage:true});
    expect((await mutate(owner, "post", `/api/rentals/${rental.id}/complete`)).status()).toBe(200);
    expect((await mutate(owner, "put", `/api/vehicles/${vehicle.id}/sharing`, { enabled: false, pickupLocation: "서울 시청 테스트 픽업", latitude: 37.5665, longitude: 126.978 })).status()).toBe(200);
    await a.reload(); await a.locator(".rental-history > summary").click(); await expect(ownerCard.getByText("대여 종료", { exact: true })).toBeVisible();
    expect((await mutate(owner, "post", "/api/auth/logout")).status()).toBe(204);
    await expect(a.getByText("로그인이 필요하거나 세션이 만료되었습니다.", { exact: true })).toBeVisible();
    expect((await owner.request.get("/api/notifications/stream")).status()).toBe(401);
  } finally { await owner.close(); await renter.close(); await other.close(); }
});
