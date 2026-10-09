import { pickupSdk } from "./pickup-sdk-fixture";
import { chooseVehicleOption } from "./api-fixture";
import { test, expect } from "./isolated-test";
import { writeFileSync } from "node:fs";
import { type BrowserContext, type Page } from "@playwright/test";

type StreamEvent = { name: string; id: string; data: string };
declare global { interface Window { liveSharingEvents: StreamEvent[] } }

test("실제 DB 차량 등록부터 A/B 브라우저 계약·SSE·잠금 해제까지", async ({ browser }) => {
  test.skip(process.env.RUN_LIVE_SHARING !== "1", "실제 Spring Boot/PostgreSQL 백엔드 필요");
  test.setTimeout(120000);
  const aContext = await browser.newContext(), bContext = await browser.newContext(), cContext = await browser.newContext();
  await aContext.route("https://dapi.kakao.com/v2/maps/sdk.js**", route => route.fulfill({ contentType: "application/javascript", body: pickupSdk }));
  const suffix = `${Date.now()}`;
  const location = "서울 중구 세종대로 110", plate = `${suffix.slice(-7, -4)}가${suffix.slice(-4)}`;
  async function post(context: BrowserContext, path: string, data?: unknown) {
    const csrf = await (await context.request.get("/api/csrf")).json();
    return context.request.post(path, { data, headers: { [csrf.headerName]: csrf.token } });
  }
  async function user(context: BrowserContext, name: string) {
    const email = `e2e-${process.env.E2E_RUN_ID}-${name}@example.com`;
    expect((await post(context, "/api/users/signup", { name: ({DataOwner:"민수",DataRenter:"지민",DataOther:"서연"} as Record<string,string>)[name] ?? name, email, password: "Password123!" })).status()).toBe(201);
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
    await b.getByLabel("차량·픽업 주소 검색", { exact: true }).fill(location);
    await a.getByRole("link", { name: "차량 등록 +", exact: true }).click();
    await chooseVehicleOption(a, "제조사", "기아");
    await chooseVehicleOption(a, "차종", "EV6");
    await chooseVehicleOption(a, "제조사", "현대");
    await expect(a.getByRole("combobox", { name: "차종", exact: true })).toContainText("차종 선택");
    await a.getByRole("combobox", { name: "차종", exact: true }).click();
    await expect(a.getByRole("option", { name: "EV6", exact: true })).toHaveCount(0);
    await a.keyboard.press("Escape");
    await chooseVehicleOption(a, "차종", "IONIQ 5");
    await chooseVehicleOption(a, "연식", "2026");
  await a.getByLabel("시간당 대여 가격 (원)", { exact: true }).fill("12000");
    await a.getByLabel("차량 번호", { exact: true }).fill(plate);
    await a.getByLabel("픽업 주소", { exact: true }).fill(location);
    await a.getByRole("list", { name: "픽업 주소 검색 결과" }).getByRole("button").first().click();
    await a.getByLabel("상세 위치", { exact: true }).fill("지하 2층 B구역");
    await a.getByLabel("픽업 안내", { exact: true }).fill("3번 출입구 앞에서 인수");
    await a.getByLabel("등록 후 공개 목록에 차량 공유").check();
    await a.getByRole("button", { name: "차량 등록", exact: true }).click();
    await expect(a.getByRole("heading", { name: "차량 등록이 완료되었습니다." })).toBeVisible();
    await a.getByRole("link", { name: "내 차량 관리하기", exact: true }).click();
    await expect(a.getByRole("article").filter({ hasText: plate })).toContainText("목록 공개");
    const ownVehicles = await (await aContext.request.get("/api/vehicles")).json();
    const vehicle = ownVehicles.find((v: { licensePlate: string }) => v.licensePlate === plate);
    expect(vehicle.hourlyRate).toBe(12000);
    expect(vehicle.powerType).toBe("전기차");
    expect(vehicle.bodyType).toBe("SUV");
    expect(vehicle.pickupDetail).toBe("지하 2층 B구역");
    expect(vehicle.pickupInstructions).toBe("3번 출입구 앞에서 인수");
    // Inventory update still must arrive before the 30-second periodic refetch.
    await expect(b.locator(`button[data-vehicle-id="${vehicle.id}"]`)).toBeVisible({ timeout: 6000 });
    await b.getByLabel("차량·픽업 주소 검색", {exact:true}).fill("");
    for (const width of [1440,768,390]) {
      await b.setViewportSize({width,height:1000});
      expect(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await b.screenshot({path:`/private/tmp/my-garage-lovable-renter-${width}.png`,fullPage:true});
    }
    await b.setViewportSize({width:1440,height:1000});
    const vehicleCard = a.getByRole("article").filter({ hasText: plate });
    await vehicleCard.getByRole("button", { name: "공유 중단", exact: true }).click();
    await expect(b.locator(`button[data-vehicle-id="${vehicle.id}"]`)).toHaveCount(0, { timeout: 6000 });
    await expect(vehicleCard).toContainText("비공개");
    await vehicleCard.getByRole("button", { name: "공유 재개", exact: true }).click();
    await expect(b.locator(`button[data-vehicle-id="${vehicle.id}"]`)).toBeVisible({ timeout: 6000 });
    const foreignCsrf = await (await bContext.request.get("/api/csrf")).json();
    expect((await bContext.request.delete(`/api/vehicles/${vehicle.id}`, { headers: { [foreignCsrf.headerName]: foreignCsrf.token } })).status()).toBe(404);
    await b.locator(`button[data-vehicle-id="${vehicle.id}"]`).click();
    await expect(b.locator(`button[data-vehicle-id="${vehicle.id}"]`)).toHaveAttribute("aria-pressed", "true");
    expect(vehicle.sharingEnabled).toBe(true);
    expect((await (await bContext.request.get("/api/vehicles")).json()).some((v: { id: number }) => v.id === vehicle.id)).toBe(false);
    const publicVehicle = await bContext.request.get(`/api/vehicles/available/${vehicle.id}`);
    expect(publicVehicle.status()).toBe(200); expect(await publicVehicle.json()).not.toHaveProperty("licensePlate");
    expect((await aContext.request.get(`/api/vehicles/available/${vehicle.id}`)).status()).toBe(404);
    expect((await post(aContext, "/api/rentals", { vehicleId: vehicle.id, startsAt: new Date().toISOString(), endsAt: new Date(Date.now()+3600000).toISOString() })).status()).toBe(400);
    await a.goto("/renter"); await a.getByLabel("차량·픽업 주소 검색", { exact: true }).fill(location);
    await expect(a.locator(`button[data-vehicle-id="${vehicle.id}"]`)).toHaveCount(0);
    await a.goto("/owner"); await expect(a.getByText("실시간 연결됨", { exact: true })).toBeVisible();
    const start = local(new Date()), end = local(new Date(Date.now() + 3600000));
    await b.getByLabel("조회 시작 시각", { exact: true }).fill(start);
    await b.getByLabel("조회 종료 시각", { exact: true }).fill(end);
    await expect(b.locator(`article[data-vehicle-id="${vehicle.id}"]`)).toContainText("대여 가능");
    await b.getByRole("button", { name: "대여 신청하기", exact: true }).click();
    await expect(b.getByText(/대여 신청이 완료되었습니다/)).toBeVisible();
    const rental = (await (await bContext.request.get("/api/rentals")).json()).find((r: { vehicleId: number }) => r.vehicleId === vehicle.id);
    expect(rental.hourlyRate).toBe(12000);
    expect(rental.estimatedTotal).toBe(12000);
    expect(rental.billedHours).toBe(1);
    await event(a, "RENTAL_REQUESTED", rental.id);
    await vehicleCard.getByRole("link", {name:"차량 수정",exact:true}).click();
    await a.getByLabel("시간당 대여 가격 (원)", {exact:true}).fill("18000");
    await a.getByRole("button", {name:"차량 수정 저장",exact:true}).click();
    await expect(a.getByRole("heading", {name:"차량 수정이 완료되었습니다.",exact:true})).toBeVisible();
    await a.getByRole("link", {name:"내 차량 관리하기",exact:true}).click();
    expect((await (await bContext.request.get(`/api/rentals/${rental.id}`)).json()).hourlyRate).toBe(12000);
    expect((await (await aContext.request.get(`/api/vehicles/${vehicle.id}`)).json()).hourlyRate).toBe(18000);
    const ownerCard = a.locator(`article[data-rental-id="${rental.id}"]`);
    await b.goto("/bookings");
    await expect(b.getByText("실시간 연결됨", {exact:true})).toBeVisible();
    await expect.poll(()=>b.evaluate(()=>window.liveSharingEvents.some(e=>e.name === "ready"))).toBe(true);
const renterCard = b.locator(`article[data-rental-id="${rental.id}"]`);
    await expect(ownerCard.getByRole("button", { name: "대여 승인", exact: true })).toBeVisible({ timeout: 6000 });

    await ownerCard.getByRole("button", { name: "대여 승인", exact: true }).click(); await event(b, "RENTAL_APPROVED", rental.id);
    await ownerCard.getByRole("checkbox", { name: "계약 조건과 대여 요금을 확인하고 동의합니다.", exact: true }).check();
    await ownerCard.getByLabel("서명 대신 이름 입력", { exact: true }).fill("테스트 동의자");
    await ownerCard.getByRole("button", { name: "위 계약 조건에 동의", exact: true }).click();
    await event(b, "CONSENT_RECORDED", rental.id);
    await expect(renterCard.getByText(/접근 권한 활성/)).toHaveCount(0);
    expect((await post(bContext, `/api/rentals/${rental.id}/unlock-requests`)).status()).toBe(403);
    await renterCard.getByRole("checkbox", { name: "계약 조건과 대여 요금을 확인하고 동의합니다.", exact: true }).check();
    const signature = renterCard.getByLabel("모의 계약 서명 패드", {exact:true});
    const signatureBox = await signature.boundingBox();
    expect(signatureBox).toBeTruthy();
    await b.mouse.move(signatureBox!.x+30,signatureBox!.y+70); await b.mouse.down();
    await b.mouse.move(signatureBox!.x+130,signatureBox!.y+110); await b.mouse.move(signatureBox!.x+200,signatureBox!.y+50); await b.mouse.up();
    await renterCard.getByRole("button", { name: "위 계약 조건에 동의", exact: true }).click();
    await expect(a.locator(".owner-vehicle-card").filter({ hasText: plate }).locator(".sharing-status")).toContainText(/예약 확정|이용 중/);
    await a.screenshot({ path: "/private/tmp/my-garage-polish-owner-contract.png", fullPage: true });
    for (const card of [ownerCard, renterCard]) { await expect(card.getByText(/(?:접근 권한 활성|차량 접근 권한 활성)/)).toBeVisible({ timeout: 6000 }); await expect(card.getByText("계약 확정 · 양측 동의 완료", { exact: true })).toBeVisible(); }
    await b.goto("/renter");
    await expect(b.getByRole("region", { name: "현재 이용 중인 차량" })).toContainText("현대 아이오닉 5");
    await b.goto(`/contracts/${rental.id}`);
    await expect(b.getByRole("heading",{name:"차량 대여 계약",exact:true})).toBeVisible();
    await expect(renterCard).toContainText("예상 총액 12,000원");
    await b.screenshot({path:"/private/tmp/my-garage-lovable-contract.png",fullPage:true});
    await b.goto("/digital-key");
    await expect(b.getByRole("heading",{name:"내 디지털 키",exact:true})).toBeVisible();
    await expect(b.getByText("실시간 연결됨",{exact:true})).toBeVisible();
    await vehicleCard.getByRole("button", { name: "차량 삭제", exact: true }).click();
    await a.getByRole("dialog", { name: "차량 삭제 확인" }).getByRole("button", { name: "삭제 확인", exact: true }).click();
    await expect(a.getByRole("dialog", { name: "차량 삭제 확인" }).getByRole("alert")).toContainText("삭제할 수 없습니다");
    await a.getByRole("dialog", { name: "차량 삭제 확인" }).getByRole("button", { name: "취소", exact: true }).click();
    const confirmed = await (await bContext.request.get(`/api/rentals/${rental.id}`)).json();
    expect(confirmed.ownerConsentedAt).toBeTruthy(); expect(confirmed.renterConsentedAt).toBeTruthy(); expect(confirmed.termsVersion).toBe("simulation-v1");
    await renterCard.getByRole("button", { name: "문 열기 요청", exact: true }).click(); await event(a, "UNLOCK_REQUESTED", rental.id);
    await ownerCard.getByRole("button", { name: "잠금 해제 승인", exact: true }).click(); await event(b, "UNLOCK_APPROVED", rental.id);
    await expect(renterCard.getByText(/차량 잠금 해제됨/)).toBeVisible({ timeout: 6000 });
    await a.goto("/security");
    await a.getByText("차량 소프트웨어 보안 검증",{exact:true}).click();
    await a.getByLabel("검증할 차량",{exact:true}).selectOption(String(vehicle.id));
    await a.getByRole("button",{name:"검증 실행",exact:true}).click();
    await expect(a.getByRole("region",{name:"검증 결과",exact:true})).toContainText("검증 승인");
    await a.screenshot({path:"/private/tmp/my-garage-lovable-security.png",fullPage:true});
    await a.goto("/owner");
    await expect(a.getByText("실시간 연결됨",{exact:true})).toBeVisible();
    await ownerCard.getByRole("button", {name:"차량 문 잠그기",exact:true}).click();
    await event(b,"VEHICLE_LOCKED",rental.id);
    await expect(renterCard.getByText(/차량 잠김/)).toBeVisible();
    expect(await c.evaluate(() => window.liveSharingEvents.filter(e => e.name === "change").length)).toBe(0);
    expect((await cContext.request.get(`/api/rentals/${rental.id}`)).status()).toBe(404);
    const ids = await b.evaluate(() => window.liveSharingEvents.filter(e => e.name === "change").map(e => e.id));
    expect(new Set(ids).size).toBe(ids.length);
    await bContext.setOffline(true); await expect(b.getByText(/재연결 중/)).toBeVisible();
    await bContext.setOffline(false); await expect(b.getByText("실시간 연결됨", { exact: true })).toBeVisible();
    await expect(renterCard.getByText(/차량 잠김/)).toBeVisible();
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
    await a.getByRole("article").filter({ hasText: plate }).getByRole("button", { name: "차량 삭제", exact: true }).click();
    await a.getByRole("button", { name: "삭제 확인", exact: true }).click();
    await expect(a.getByRole("article").filter({ hasText: plate })).toHaveCount(0);
    expect((await aContext.request.get(`/api/vehicles/${vehicle.id}`)).status()).toBe(404);
    const preserved = await (await bContext.request.get(`/api/rentals/${rental.id}`)).json();
    expect(preserved.status).toBe("COMPLETED"); expect(preserved.pickupDetail).toBe("지하 2층 B구역");

  } finally { if (test.info().status !== test.info().expectedStatus) { for (const page of pages) console.log("SSE diagnostics", page.url(), await page.evaluate(() => window.liveSharingEvents).catch(() => [])); } await aContext.close(); await bContext.close(); await cContext.close(); }
});
