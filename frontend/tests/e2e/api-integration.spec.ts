import { expect, test } from "@playwright/test";
import { installApiFixture, logIn, addVehicle, chooseVehicleOption } from "./api-fixture";

test("로그인 실패·세션 복원·로그아웃·localStorage 플래그로 접근 불가", async ({ page }) => {
  const api = await installApiFixture(page);
  await page.goto("/login");
  await page.getByLabel("이메일", { exact: true }).fill("garage-test@example.com");
  await page.getByLabel("비밀번호", { exact: true }).fill("WrongPass123!");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "이메일 또는 비밀번호" })).toContainText("이메일 또는 비밀번호");
  await logIn(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "등록된 차량이 없습니다." })).toBeVisible();
  const cookies = await page.context().cookies();
  expect(cookies.some(cookie => cookie.name === "JSESSIONID" && cookie.httpOnly)).toBeTruthy();
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.evaluate(() => localStorage.setItem("my-garage:demo-session:v1", JSON.stringify({ mode: "member", registeredVehicleIds: ["kia-ev6"] })));
  await page.goto("/garage");
  await expect(page.getByText("로그인이 필요하거나 세션이 만료되었습니다.", { exact: true })).toBeVisible();
  expect(api.mutations.filter(item => item.path === "/api/auth/logout")).toHaveLength(1);
});

test("회원가입 후 자동 로그인·중복 이메일 409 표시", async ({ page }) => {
  await installApiFixture(page);
  async function signup() {
    await page.goto("/signup");
    await page.getByLabel("이름", { exact: true }).fill("회원");
    await page.getByLabel("이메일", { exact: true }).fill("duplicate@example.com");
    await page.getByLabel("비밀번호", { exact: true }).fill("DemoPass123!");
    await page.getByLabel("비밀번호 확인", { exact: true }).fill("DemoPass123!");
    await page.getByRole("button", { name: "회원가입", exact: true }).click();
  }
  await signup();
  await expect(page.getByRole("heading", { name: "가입이 완료되었습니다." })).toBeVisible();
  await page.goto("/garage");
  await expect(page.getByRole("heading", { name: "등록된 차량이 없습니다." })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "등록된 차량이 없습니다." })).toBeVisible();
  await signup();
  await expect(page.getByRole("alert").filter({ hasText: "이미 가입된 이메일" })).toContainText("이미 가입된 이메일");
});

test("차량 등록·상세·새로고침·OTA 승인/차단/OFF·이력 갱신", async ({ page }) => {
  const api = await installApiFixture(page);
  await logIn(page);
  await addVehicle(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "기아 EV6", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "차량 정보 자세히 보기" }).click();
  await expect(page.getByRole("dialog")).toContainText("2025 · 123가4567");
  await expect(page.getByRole("dialog")).not.toContainText("디지털 차량 인증서");
  await page.getByRole("button", { name: "팝업 닫기" }).click();
  await page.locator("button#updates").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("아직 검증 이력이 없습니다.")).toBeVisible();
  await dialog.getByRole("button", { name: "검증 실행", exact: true }).click();
  await expect(dialog.getByText("검증 승인", { exact: true }).first()).toBeVisible();
  await dialog.getByLabel("검증 시나리오").selectOption("TAMPERED_FILE");
  await dialog.getByRole("button", { name: "검증 실행", exact: true }).click();
  await expect(dialog.getByText("검증 차단", { exact: true }).first()).toBeVisible();
  await expect(dialog.getByRole("region", { name: "검증 결과" })).toContainText("HASH_MISMATCH");
  await expect(dialog.getByRole("region", { name: "검증 결과" })).toContainText("실패");
  await dialog.getByLabel("보안 검증 사용").uncheck();
  await expect(dialog.getByText(/보안 검증을 끄면 검증 생략/)).toBeVisible();
  await dialog.getByRole("button", { name: "검증 실행", exact: true }).click();
  await expect(dialog.getByText("교육용 가상 승인", { exact: true }).first()).toBeVisible();
  await expect(dialog.getByRole("region", { name: "검증 결과" })).toContainText("UNVERIFIED_HASH_MISMATCH");
  await expect(dialog.getByRole("region", { name: "검증 결과" })).toContainText("미실행");
  await expect(dialog.getByRole("region", { name: "검증 이력" }).locator("li")).toHaveCount(3);
  expect(api.mutations.filter(item => item.path.endsWith("/ota/verify")).map(item => item.body)).toEqual([
    { scenario: "VALID", protectionEnabled: true }, { scenario: "TAMPERED_FILE", protectionEnabled: true }, { scenario: "TAMPERED_FILE", protectionEnabled: false },
  ]);
});

test("CSRF 403은 자동 재시도하지 않으며 다음 수동 요청으로 복구", async ({ page }) => {
  const api = await installApiFixture(page);
  await logIn(page);
  await page.goto("/vehicles/register");
  await chooseVehicleOption(page, "제조사", "기아");
  await chooseVehicleOption(page, "차종", "EV6");
  await chooseVehicleOption(page, "연식", "2025");
  await page.getByLabel("시간당 대여 가격 (원)", { exact: true }).fill("12000");
  await page.getByLabel("차량 번호", { exact: true }).fill("123가4567");
  let attempts = 0;
  page.on("request", request => { if (request.url().endsWith("/api/vehicles") && request.method() === "POST") attempts++; });
  api.rejectNextCsrf();
  await page.getByRole("button", { name: "차량 등록", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "CSRF 토큰" })).toContainText("CSRF 토큰");
  expect(attempts).toBe(1);
  await page.getByRole("button", { name: "차량 등록", exact: true }).click();
  await expect(page.getByRole("heading", { name: "차량 등록이 완료되었습니다." })).toBeVisible();
  expect(attempts).toBe(2);
});

test("보호 API의 세션 만료는 차량 화면을 숨긴다", async ({ page }) => {
  const api = await installApiFixture(page);
  await logIn(page);
  await addVehicle(page);
  api.expireSession();
  await page.getByRole("button", { name: "차량 정보 자세히 보기" }).click();
  await expect(page.getByText("로그인이 필요하거나 세션이 만료되었습니다.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "기아 EV6", exact: true })).toHaveCount(0);
});

test("검증 중 중복 실행 방지 및 차량 전환 후 이전 결과 격리", async ({ page }) => {
  const api = await installApiFixture(page);
  await logIn(page);
  await addVehicle(page);
  await page.goto("/vehicles/register");
  await chooseVehicleOption(page, "제조사", "기아");
  await chooseVehicleOption(page, "차종", "EV3");
  await chooseVehicleOption(page, "연식", "2025");
  await page.getByLabel("시간당 대여 가격 (원)", { exact: true }).fill("12000");
  await page.getByLabel("차량 번호", { exact: true }).fill("234나5678");
  await page.getByRole("button", { name: "차량 등록", exact: true }).click();
  await expect(page.getByRole("heading", { name: "차량 등록이 완료되었습니다." })).toBeVisible();
  await page.goto("/garage");
  await page.getByRole("button", { name: "기아 EV6 선택", exact: true }).click();
  await page.locator("button#updates").click();
  await page.getByLabel("검증 시나리오").selectOption("TAMPERED_FILE");
  let release = () => {};
  await page.route("**/api/vehicles/1/ota/verify", async route => {
    await new Promise<void>(resolve => { release = resolve; });
    await route.fallback();
  });
  const started = page.waitForRequest("**/api/vehicles/1/ota/verify");
  await page.getByRole("button", { name: "검증 실행", exact: true }).click();
  await started;
  await expect(page.getByRole("button", { name: "검증 실행 중…", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "팝업 닫기" }).click();
  await page.getByRole("button", { name: "기아 EV3 선택", exact: true }).click();
  await page.locator("button#updates").click();
  await expect(page.getByRole("dialog")).toContainText("기아 EV3");
  const finished = page.waitForResponse("**/api/vehicles/1/ota/verify");
  release();
  await finished;
  await expect(page.getByRole("dialog").getByRole("region", { name: "검증 결과" })).toHaveCount(0);
  await expect(page.getByText("아직 검증 이력이 없습니다.", { exact: true })).toBeVisible();
  expect(api.mutations.filter(item => item.path === "/api/vehicles/1/ota/verify")).toHaveLength(1);
  await page.getByRole("button", { name: "검증 실행", exact: true }).click();
  await expect(page.getByRole("dialog").getByText("검증 승인", { exact: true }).first()).toBeVisible();
});
