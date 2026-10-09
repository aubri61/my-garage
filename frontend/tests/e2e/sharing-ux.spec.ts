import { expect, test } from "@playwright/test";
import { installApiFixture, logIn } from "./api-fixture";

test("대여 요청은 상단에 표시되고 테스트 식별자는 카드·지도·검색에 노출되지 않는다", async ({ page }) => {
  await installApiFixture(page);
  await page.route("**/api/vehicles/available*", route => route.fulfill({ json: [
    { id: 42, manufacturer: "현대", model: "IONIQ 5", modelYear: 2026, pickupLocation: "서울 중구 세종대로 110", latitude: 37.5665, longitude: 126.978, available: true, ownerName: "민수" },
    { id: 43, manufacturer: "Hyundai", model: "LIVE-1729423841324", modelYear: 2025, pickupLocation: "LIVE-PICKUP-1729423841324", latitude: 37.54, longitude: 127.05, available: null, ownerName: "DataOwner" },
  ] }));
  await page.route("**/api/rentals", route => route.fulfill({ json: [{ id: 89, vehicleId: 42, vehicleModel: "현대 IONIQ 5", ownerId: 2, renterId: 1, ownerName: "민수", renterName: "지민", pickupLocation: "서울 중구 세종대로 110", startsAt: new Date(Date.now()+3600000).toISOString(), endsAt: new Date(Date.now()+7200000).toISOString(), status: "CONTRACT_PENDING", termsVersion: "simulation-v1", terms: "계약 예시", ownerConsentedAt: null, renterConsentedAt: null, accessGrant: null, lockState: "LOCKED", unlockRequests: [] }] }));
  await page.route("**/api/sharing/security", route => route.fulfill({ json: { pkiRequired: false } }));
  await logIn(page);
  await page.goto("/renter");
  await expect(page.getByRole("heading", { name: "차량 대여하기", exact: true })).toBeVisible();
  const request = page.locator('.request-board'), inventory = page.locator('.inventory-filters');
  expect((await request.boundingBox())!.y).toBeLessThan((await inventory.boundingBox())!.y);
  await expect(request.getByText("계약 동의 필요", { exact: true })).toBeVisible();
  await expect(request.getByText("민수", { exact: true })).toBeVisible();
  await expect(page.locator('body')).not.toContainText("대여 #89");
  await expect(page.locator('body')).not.toContainText("LIVE-");
  await expect(page.locator('body')).not.toContainText("LIVE-PICKUP-");
  await expect(page.locator('button[data-vehicle-id="43"]')).toContainText("차량 정보 확인 필요");
  await expect(page.getByLabel("조회 시작 시각", { exact: true })).not.toHaveValue("");
  await page.getByLabel("전기차만 보기", { exact: true }).check();
  await expect(page.locator('.available-card')).toHaveCount(1);
  await page.locator('button[data-vehicle-id="42"]').click();
  await expect(page.getByRole("button", { name: "대여 신청하기", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("차량 번호는 직접 입력하고 형식 오류는 저장 전에 안내한다", async ({ page }) => {
  const api = await installApiFixture(page);
  await logIn(page); await page.goto("/vehicles/register");
  await page.getByLabel("제조사", { exact: true }).selectOption("현대");
  await expect(page.getByLabel("차종", { exact: true }).locator('option[value="Casper Electric"]')).toHaveCount(1);
  await page.getByLabel("차종", { exact: true }).selectOption("IONIQ 5");
  await page.getByLabel("연식", { exact: true }).selectOption("2026");
  await page.getByLabel("차량 번호", { exact: true }).fill("무작위번호");
  await page.getByRole("button", { name: "차량 등록", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "차량 번호를 확인" })).toContainText("123가4567");
  expect(api.mutations.filter(item => item.path === "/api/vehicles")).toHaveLength(0);
  await page.getByLabel("차량 번호", { exact: true }).fill("123 가 4567");
  await page.getByRole("button", { name: "차량 등록", exact: true }).click();
  await expect(page.getByRole("heading", { name: "차량 등록이 완료되었습니다.", exact: true })).toBeVisible();
  expect(api.mutations.find(item => item.path === "/api/vehicles")?.body.licensePlate).toBe("123가4567");
});
