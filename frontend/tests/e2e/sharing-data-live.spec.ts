import { writeFileSync } from "node:fs";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

type StreamEvent = { name: string; id: string; data: string };
declare global { interface Window { liveSharingEvents: StreamEvent[] } }

test("실제 DB 차량 등록부터 A/B 브라우저 계약·SSE·잠금 해제까지", async ({ browser }) => {
  test.skip(process.env.RUN_LIVE_SHARING !== "1", "실제 Spring Boot/PostgreSQL 백엔드 필요");
  test.setTimeout(120000);
  const aContext = await browser.newContext(), bContext = await browser.newContext(), cContext = await browser.newContext();
  const suffix = `${Date.now()}`;
  const location = `LIVE-PICKUP-${suffix}`, plate = `${suffix.slice(-7, -4)}가${suffix.slice(-4)}`;
  async function post(context: BrowserContext, path: string, data?: unknown) {
    const csrf = await (await context.request.get("/api/csrf")).json();
    return context.request.post(path, { data, headers: { [csrf.headerName]: csrf.token } });
  }
  async function user(context: BrowserContext, name: string) {
    const email = `${name}-${suffix}@example.com`;
    expect((await post(context, "/api/users/signup", { name, email, password: "Password123!" })).status()).toBe(201);
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.liveSharingEvents = [];
      const Original = window.EventSource;
      window.EventSource = class extends Original {
        constructor(url: string | URL, options?: EventSourceInit) {
          super(url, options);
          for (const name of ["ready", "change", "vehicles", "inventory"]) this.addEventListener(name, event => {
            const message = event as MessageEvent;
            window.liveSharingEvents.push({ name, id: message.lastEventId, data: message.data });
          });
        }
      };
    });
    await page.goto("/login");
    await page.getByLabel("이메일", { exact: true }).fill(email);
    await page.getByLabel("비밀번호", { exact: true }).fill("Password123!");
    await page.getByRole("button", { name: "로그인", exact: true }).click();
    await expect(page).toHaveURL(/\/mode$/);
    return page;
  }
  async function event(page: Page, action: string, rentalId: number) {
    await expect.poll(() => page.evaluate(({ action, rentalId }) => window.liveSharingEvents.some(e => e.name === "change" && JSON.parse(e.data).action === action && JSON.parse(e.data).rentalId === rentalId), { action, rentalId })).toBe(true);
  }
  const local = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const pages: Page[] = [];
  try {
    const a = await user(aContext, "DataOwner"), b = await user(bContext, "DataRenter"), c = await user(cContext, "DataOther");
    pages.push(a,b,c);
    await a.goto("/owner"); await b.goto("/renter"); await c.goto("/renter");
    for (const page of [a,b,c]) await expect(page.getByText("실시간 연결됨", { exact: true })).toBeVisible();
    await b.getByRole("searchbox").fill("픽업 주소 확인 필요");
    await a.getByRole("link", { name: "차량 등록 +", exact: true }).click();
    await a.getByLabel("제조사", { exact: true }).selectOption("기아");
    await a.getByLabel("차종", { exact: true }).selectOption("EV6");
    await a.getByLabel("제조사", { exact: true }).selectOption("현대");
    await expect(a.getByLabel("차종", { exact: true })).toHaveValue("");
    await expect(a.getByLabel("차종", { exact: true }).locator('option[value="EV6"]')).toHaveCount(0);
    await a.getByLabel("차종", { exact: true }).selectOption("IONIQ 5");
    await a.getByLabel("연식", { exact: true }).selectOption("2026");
    await a.getByLabel("차량 번호", { exact: true }).fill(plate);
    await a.getByLabel("픽업 주소", { exact: true }).fill(location);
    await a.getByText("위치를 직접 입력하기", { exact: true }).click();
    await a.getByLabel("픽업 위도", { exact: true }).fill("37.54");
    await a.getByLabel("픽업 경도", { exact: true }).fill("127.05");
    await a.getByLabel("등록 후 공개 목록에 차량 공유").check();
    await a.getByRole("button", { name: "차량 등록", exact: true }).click();
    await expect(a.getByRole("heading", { name: "차량 등록이 완료되었습니다." })).toBeVisible();
    await a.getByRole("link", { name: "내 차량 관리하기", exact: true }).click();
    await expect(a.getByRole("article").filter({ hasText: plate })).toContainText("공유 공개");
    const ownVehicles = await (await aContext.request.get("/api/vehicles")).json();
    const vehicle = ownVehicles.find((v: { licensePlate: string }) => v.licensePlate === plate);
    // Inventory update still must arrive before the 30-second periodic refetch.
    await expect(b.locator(`button[data-vehicle-id="${vehicle.id}"]`)).toBeVisible({ timeout: 6000 });
    await b.locator(`button[data-vehicle-id="${vehicle.id}"]`).click();
    await expect(b.locator(`button[data-vehicle-id="${vehicle.id}"]`)).toHaveAttribute("aria-pressed", "true");
    expect(vehicle.sharingEnabled).toBe(true);
    expect((await (await bContext.request.get("/api/vehicles")).json()).some((v: { id: number }) => v.id === vehicle.id)).toBe(false);
    const publicVehicle = await bContext.request.get(`/api/vehicles/available/${vehicle.id}`);
    expect(publicVehicle.status()).toBe(200); expect(await publicVehicle.json()).not.toHaveProperty("licensePlate");
    expect((await aContext.request.get(`/api/vehicles/available/${vehicle.id}`)).status()).toBe(404);
    expect((await post(aContext, "/api/rentals", { vehicleId: vehicle.id, startsAt: new Date().toISOString(), endsAt: new Date(Date.now()+3600000).toISOString() })).status()).toBe(400);
    await a.goto("/renter"); await a.getByRole("searchbox").fill("픽업 주소 확인 필요");
    await expect(a.locator(`button[data-vehicle-id="${vehicle.id}"]`)).toHaveCount(0);
    await a.goto("/owner"); await expect(a.getByText("실시간 연결됨", { exact: true })).toBeVisible();
    const start = local(new Date()), end = local(new Date(Date.now() + 3600000));
    await b.getByLabel("조회 시작 시각", { exact: true }).fill(start);
    await b.getByLabel("조회 종료 시각", { exact: true }).fill(end);
    await expect(b.locator(`button[data-vehicle-id="${vehicle.id}"]`)).toContainText("선택 기간 대여 가능");
    await b.getByRole("button", { name: "대여 신청하기", exact: true }).click();
    await expect(b.getByText(/대여 신청이 완료되었습니다/)).toBeVisible();
    const rental = (await (await bContext.request.get("/api/rentals")).json()).find((r: { vehicleId: number }) => r.vehicleId === vehicle.id);
    await event(a, "RENTAL_REQUESTED", rental.id);
    const ownerCard = a.locator(`article[data-rental-id="${rental.id}"]`);
    const renterCard = b.locator(`article[data-rental-id="${rental.id}"]`);
    await expect(ownerCard.getByRole("button", { name: "대여 승인", exact: true })).toBeVisible({ timeout: 6000 });
    await expect(a.getByText("새 대여 요청 · 내 대여 요청에서 확인해주세요.", { exact: true })).toBeVisible();
    await ownerCard.getByRole("button", { name: "대여 승인", exact: true }).click(); await event(b, "RENTAL_APPROVED", rental.id);
    await ownerCard.getByRole("button", { name: "위 계약 조건에 동의", exact: true }).click();
    await event(b, "CONSENT_RECORDED", rental.id);
    await expect(renterCard.getByText(/디지털 키 발급 완료/)).toHaveCount(0);
    expect((await post(bContext, `/api/rentals/${rental.id}/unlock-requests`)).status()).toBe(403);
    await renterCard.getByRole("button", { name: "위 계약 조건에 동의", exact: true }).click();
    for (const card of [ownerCard, renterCard]) { await expect(card.getByText(/디지털 키 발급 완료 · 차량 접근 가능/)).toBeVisible({ timeout: 6000 }); await expect(card.getByText("계약 확정 · 양측 동의 완료", { exact: true })).toBeVisible(); }
    const confirmed = await (await bContext.request.get(`/api/rentals/${rental.id}`)).json();
    expect(confirmed.ownerConsentedAt).toBeTruthy(); expect(confirmed.renterConsentedAt).toBeTruthy(); expect(confirmed.termsVersion).toBe("simulation-v1");
    await renterCard.getByRole("button", { name: "잠금 해제 요청", exact: true }).click(); await event(a, "UNLOCK_REQUESTED", rental.id);
    await ownerCard.getByRole("button", { name: "잠금 해제 승인", exact: true }).click(); await event(b, "UNLOCK_APPROVED", rental.id);
    await expect(renterCard.getByText(/차량 잠금 해제됨/)).toBeVisible({ timeout: 6000 });
    expect(await c.evaluate(() => window.liveSharingEvents.filter(e => e.name === "change").length)).toBe(0);
    expect((await cContext.request.get(`/api/rentals/${rental.id}`)).status()).toBe(404);
    const ids = await b.evaluate(() => window.liveSharingEvents.filter(e => e.name === "change").map(e => e.id));
    expect(new Set(ids).size).toBe(ids.length);
    await bContext.setOffline(true); await expect(b.getByText(/재연결 중/)).toBeVisible();
    await bContext.setOffline(false); await expect(b.getByText("실시간 연결됨", { exact: true })).toBeVisible();
    await expect(renterCard.getByText(/차량 잠금 해제됨/)).toBeVisible();
    await a.screenshot({ path: "/private/tmp/my-garage-data-owner.png", fullPage: true });
    await b.screenshot({ path: "/private/tmp/my-garage-data-renter.png", fullPage: true });
    const evidence = { vehicleId: vehicle.id, rentalId: rental.id, plate, location, aEvents: await a.evaluate(() => window.liveSharingEvents), bEvents: await b.evaluate(() => window.liveSharingEvents) };
    writeFileSync("/private/tmp/my-garage-data-live-evidence.json", JSON.stringify(evidence, null, 2));
    console.log(`Actual vehicle ${vehicle.id}, rental ${rental.id}: UI registration, dual consent, SSE and unlock passed`);
    expect((await post(aContext, `/api/rentals/${rental.id}/complete`)).status()).toBe(200);
    const csrf = await (await aContext.request.get("/api/csrf")).json();
    expect((await aContext.request.put(`/api/vehicles/${vehicle.id}/sharing`, { data: { enabled: false, pickupLocation: location, latitude: 37.54, longitude: 127.05 }, headers: { [csrf.headerName]: csrf.token } })).status()).toBe(200);
    await expect(b.locator(`button[data-vehicle-id="${vehicle.id}"]`)).toHaveCount(0, { timeout: 6000 });
    await expect(a.getByRole("article").filter({ hasText: plate })).toContainText("비공개");
    expect((await bContext.request.get(`/api/vehicles/available/${vehicle.id}`)).status()).toBe(404);
    expect((await post(bContext, "/api/rentals", { vehicleId: vehicle.id, startsAt: new Date().toISOString(), endsAt: new Date(Date.now()+3600000).toISOString() })).status()).toBe(409);
    await a.reload(); await expect(a.getByRole("article").filter({ hasText: plate })).toContainText("비공개");
  } finally { if (test.info().status !== test.info().expectedStatus) { for (const page of pages) console.log("SSE diagnostics", page.url(), await page.evaluate(() => window.liveSharingEvents).catch(() => [])); } await aContext.close(); await bContext.close(); await cContext.close(); }
});
