import { test, expect } from "@playwright/test";
import { installApiFixture, logIn } from "./api-fixture";

test("대여자 메뉴와 현재 이용 차량은 탐색보다 먼저 표시되고 계약으로 연결된다", async ({ page }) => {
  await installApiFixture(page);
  await page.route("**/api/vehicles/available**", route => route.fulfill({ json: [] }));
  const now = Date.now();
  const active = { id: 41, vehicleId: 42, vehicleModel: "현대 IONIQ 5", ownerId: 2, renterId: 1, ownerName: "민수", renterName: "지민", pickupLocation: "서울 중구 세종대로 110", startsAt: new Date(now - 3600000).toISOString(), endsAt: new Date(now + 3600000).toISOString(), status: "CONFIRMED", termsVersion: "simulation-v1", terms: "계약 조건", ownerConsentedAt: new Date(now - 4000000).toISOString(), renterConsentedAt: new Date(now - 4000000).toISOString(), accessGrant: { active: true, startsAt: new Date(now - 3600000).toISOString(), endsAt: new Date(now + 3600000).toISOString(), revokedAt: null, allowedOperation: "REQUEST_UNLOCK" }, lockState: "LOCKED", unlockRequests: [] };
  const request = { ...active, id: 99, vehicleModel: "기아 EV6", status: "REQUESTED", accessGrant: null, startsAt: new Date(now + 7200000).toISOString(), endsAt: new Date(now + 10800000).toISOString() };
  let completed = false;
  await page.route("**/api/rentals", route => route.fulfill({ json: [request, { ...active, status: completed ? "COMPLETED" : "CONFIRMED" }] }));
  await logIn(page); await page.goto("/renter");
  await expect(page.getByRole("navigation", { name: "대여자 메뉴" })).toHaveCount(0);
  const nav = page.getByRole("navigation", { name: "이용 모드" });
  await expect(nav.getByRole("link", { name: "차량 빌리기", exact: true })).toHaveAttribute("aria-current", "page");
  const current = page.getByRole("region", { name: "현재 이용 중인 차량" });
  await expect(current).toContainText("현대 아이오닉 5");
  await expect(current).not.toContainText("기아 EV6");
  expect((await current.boundingBox())!.y).toBeLessThan((await page.getByRole("heading", { name: "차량 대여하기", exact: true }).boundingBox())!.y);
  await expect(current.getByRole("link", { name: "상세 보기" })).toHaveAttribute("href", "/contracts/41");
  await expect(current.getByRole("link", { name: "디지털 접근 권한", exact: true })).toHaveAttribute("href", "/digital-key?mode=renter");
  for (const width of [1440, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `/private/tmp/my-garage-renter-menu-${width}.png`, fullPage: true });
  }
  await current.getByRole("link", { name: "내가 빌린 차량 전체 보기" }).click();
  await expect(page).toHaveURL(/\/bookings\?mode=renter$/);
  await expect(page.getByRole("heading", { name: "내가 빌린 차량", exact: true })).toBeVisible();
  await expect(page.locator(".rental-grid .rental-card").first()).toContainText("현대 아이오닉 5");
  await expect(page.getByRole("navigation", { name: "대여자 메뉴" })).toHaveCount(0);
  completed = true;
  await nav.getByRole("link", { name: "차량 빌리기", exact: true }).click();
  await expect(page).toHaveURL(/\/renter$/);
  await page.reload();
  await expect(page.getByRole("region", { name: "현재 이용 중인 차량" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "내 대여 요청 및 계약" })).toContainText("1건의 예약");
});
