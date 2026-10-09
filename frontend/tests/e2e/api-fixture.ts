import { expect, type Page } from "@playwright/test";

export async function installApiFixture(page: Page) {
  let session = false;
  let token = 0;
  let expire = false;
  let rejectCsrf = false;
  const registered = new Set<string>();
  const vehicles: { id: number; manufacturer: string; model: string; modelYear: number; licensePlate: string; createdAt: string; updatedAt: string }[] = [];
  const histories = new Map<number, unknown[]>();
  const mutations: { path: string; body: Record<string, unknown> }[] = [];
  const scenarioNames = ["VALID", "TAMPERED_FILE", "FAKE_PUBLISHER", "ROLLBACK", "INCOMPATIBLE_VEHICLE", "TAMPERED_METADATA", "INVALID_PACKAGE"];
  await page.route("**/api/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (status: number, body: unknown, headers: Record<string, string> = {}) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body), headers });
    if (path === "/api/csrf") return json(200, { token: `response-token-${++token}`, headerName: "X-XSRF-TOKEN" }, { "Set-Cookie": "XSRF-TOKEN=raw-cookie-token; Path=/; SameSite=Lax" });
    if (request.method() === "POST") {
      // The header must use the response token, never Axios's automatic raw-cookie value.
      expect(request.headers()["x-xsrf-token"]).toMatch(/^response-token-\d+$/);
      if (rejectCsrf) { rejectCsrf = false; return json(403, { code: "FORBIDDEN", message: "CSRF 토큰이 유효하지 않습니다." }); }
      mutations.push({ path, body: request.postDataJSON() ?? {} });
    }
    if (path === "/api/users/signup") {
      const email = request.postDataJSON().email;
      if (registered.has(email)) return json(409, { code: "DUPLICATE_EMAIL", message: "이미 가입된 이메일입니다." });
      registered.add(email); return json(201, { userId: 1, message: "회원가입 성공" });
    }
    if (path === "/api/auth/login") {
      if (request.postDataJSON().password === "WrongPass123!") return json(401, { code: "UNAUTHORIZED", message: "이메일 또는 비밀번호를 확인해주세요." });
      session = true;
      return json(200, { id: 1, email: "garage-test@example.com", message: "로그인 성공" }, { "Set-Cookie": "JSESSIONID=fixture-session; HttpOnly; Path=/; SameSite=Lax" });
    }
    if (path === "/api/auth/logout") { session = false; return route.fulfill({ status: 204, headers: { "Set-Cookie": "JSESSIONID=; Max-Age=0; Path=/" } }); }
    if (!session || expire) return json(401, { code: "UNAUTHORIZED", message: "로그인이 필요합니다." });
    if (path === "/api/users/me") return json(200, { id: 1, name: "회귀 테스트 회원", email: "garage-test@example.com" });
    if (path === "/api/vehicles" && request.method() === "POST") {
      const body = request.postDataJSON();
      expect(Object.keys(body).sort()).toEqual(["licensePlate", "manufacturer", "model", "modelYear"]);
      const vehicle = { ...body, id: vehicles.length + 1, createdAt: "2026-10-09T10:00:00", updatedAt: "2026-10-09T10:00:00" };
      vehicles.push(vehicle); return json(201, vehicle);
    }
    if (path === "/api/vehicles") return json(200, vehicles);
    if (path === "/api/ota/scenarios") return json(200, scenarioNames.map(scenario => ({ scenario, description: scenario })));
    const match = path.match(/^\/api\/vehicles\/(\d+)(?:\/ota\/(verify|history))?$/);
    if (match) {
      const id = Number(match[1]);
      const vehicle = vehicles.find(item => item.id === id);
      if (!vehicle) return json(404, { code: "VEHICLE_NOT_FOUND", message: "차량을 찾을 수 없습니다." });
      if (!match[2]) return json(200, vehicle);
      if (match[2] === "history") return json(200, histories.get(id) ?? []);
      const body = request.postDataJSON();
      const failureCode = body.scenario === "VALID" ? null : "HASH_MISMATCH";
      const status = !body.protectionEnabled ? "SIMULATED_APPROVAL" : failureCode ? "BLOCKED" : "APPROVED";
      const records = histories.get(id) ?? [];
      const record = { id: records.length + 1, vehicleId: id, ...body, status, failureCode: body.protectionEnabled ? failureCode : null, executedAt: "2026-10-09T01:00:00Z" };
      histories.set(id, [record, ...records]);
      return json(200, { ...record, historyId: record.id,
        checks: [{ name: "SIGNATURE", status: body.protectionEnabled ? "PASSED" : "NOT_RUN" }, { name: "FILE_INTEGRITY", status: !body.protectionEnabled ? "NOT_RUN" : failureCode ? "FAILED" : "PASSED" }],
        message: status === "BLOCKED" ? "업데이트 파일의 무결성 검증에 실패했습니다." : "서버 검증 결과입니다.",
        simulatedRisk: body.protectionEnabled ? null : { code: "UNVERIFIED_HASH_MISMATCH", description: "교육용 가상 위험이며 실제 설치는 없습니다." },
        simulationState: { manufacturer: vehicle.manufacturer, model: vehicle.model, hardwareId: "SIM-HW-2025", component: "INFOTAINMENT", currentVersion: "1.0.0", securityVersion: 10 } });
    }
    return json(404, { code: "NOT_FOUND", message: "없는 경로" });
  });
  return { mutations, expireSession: () => { expire = true; }, rejectNextCsrf: () => { rejectCsrf = true; } };
}

export async function logIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("이메일", { exact: true }).fill("garage-test@example.com");
  await page.getByLabel("비밀번호", { exact: true }).fill("DemoPass123!");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/mode$/);
  await expect(page.getByRole("heading", { name: "어떤 서비스를 이용하시겠어요?" })).toBeVisible();
  await page.goto("/garage");
  await expect(page.getByRole("heading", { name: "등록된 차량이 없습니다." })).toBeVisible();
}

export async function addVehicle(page: Page, model = "EV6") {
  await page.goto("/vehicles/register");
  await page.getByLabel("제조사", { exact: true }).selectOption("기아");
  await page.getByLabel("차종", { exact: true }).selectOption(model);
  await page.getByLabel("연식", { exact: true }).selectOption("2025");
  await page.getByLabel("차량 번호", { exact: true }).fill("123가4567");
  await page.getByRole("button", { name: "차량 등록", exact: true }).click();
  await expect(page.getByRole("heading", { name: "차량 등록이 완료되었습니다." })).toBeVisible();
  await page.getByRole("link", { name: "기존 차고지·OTA 확인하기", exact: true }).first().click();
  await expect(page.getByRole("heading", { name: `기아 ${model}`, exact: true })).toBeVisible();
}
