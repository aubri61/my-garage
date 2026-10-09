import { expect, test } from "@playwright/test";
import { installApiFixture, logIn } from "./api-fixture";
import { pickupSdk } from "./pickup-sdk-fixture";
const sdk = pickupSdk.replace("CustomOverlay:class{setMap(){}}", "CustomOverlay:class{constructor(o){this.content=o.content;o.map.el.appendChild(this.content);}setMap(map){if(!map)this.content.remove();}}");
// Prices here are test API fixtures. Production prices are never synthesized.
const vehicles = [
  { id: 42, manufacturer: "현대", model: "IONIQ 5", modelYear: 2024, pickupLocation: "서울 중구 세종대로 110", latitude: 37.5665, longitude: 126.978, available: true, hourlyPriceWon: 12000 },
  { id: 43, manufacturer: "기아", model: "K5", modelYear: 2025, pickupLocation: "서울 강남구 테헤란로", latitude: 37.50, longitude: 127.03, available: false, hourlyPriceWon: 8000 },
  { id: 44, manufacturer: "기아", model: "EV3", modelYear: 2026, pickupLocation: "서울 성동구", latitude: 37.54, longitude: 127.04, available: true },
];
test("탐색 UI: 요금·가격 필터·정렬·지도와 카드 선택·신청·모바일", async ({ page }) => {
  await installApiFixture(page);
  await page.route("**/api/rentals", route => route.fulfill({ status: route.request().method() === "POST" ? 201 : 200, json: route.request().method() === "POST" ? { id: 99 } : [] }));
  await page.route("https://dapi.kakao.com/v2/maps/sdk.js**", route => route.fulfill({ contentType: "application/javascript", body: sdk }));
  await page.route("**/api/vehicles/available*", route => route.fulfill({ json: vehicles }));
  await logIn(page); await page.goto("/renter");
  await expect(page.getByText("검색 결과 3대", { exact: true })).toBeVisible();
  const first = page.locator('article[data-vehicle-id="42"]');
  await expect(first).toContainText("12,000원"); await expect(first).toContainText("2024년식");
  await expect(page.locator('article[data-vehicle-id="44"]')).toContainText("요금 미등록");
  await page.getByRole("combobox", { name: "정렬", exact: true }).click();
  await page.getByRole("option", { name: "낮은 가격순", exact: true }).click();
  await expect(page.locator('.renter-vehicle-card').first()).toHaveAttribute("data-vehicle-id", "43");
  await page.getByLabel("최소 금액", { exact: true }).fill("10000");
  await page.getByLabel("최대 금액", { exact: true }).fill("15000");
  await expect(page.locator('.renter-vehicle-card')).toHaveCount(1);
  await expect(page.getByRole("button", { name: "기아 K5 픽업 마커", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "초기화", exact: true }).click();
  await page.getByRole("button", { name: "현대 아이오닉 5 픽업 마커", exact: true }).click();
  await expect(first).toHaveClass(/is-selected/);
  await expect(page.locator('button[data-vehicle-id="42"]')).toHaveAttribute("aria-pressed", "true");
  await page.locator('article[data-vehicle-id="44"]').getByRole("button", { name: "상세 보기", exact: false }).click();
  await expect(page.getByRole("button", { name: "기아 EV3 픽업 마커", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("대여 가능한 차량만", { exact: true })).toHaveCount(0);
  await expect(page.locator('.renter-vehicle-card')).toHaveCount(3);
  await first.getByRole("button", { name: "대여 신청", exact: true }).click();
  await expect(page.getByRole("button", { name: "대여 신청하기", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "대여 신청하기", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "대여 신청이 완료" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("차량·픽업 주소 검색", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "검색·필터 열기", exact: true }).click();
  await expect(page.getByLabel("차량·픽업 주소 검색", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("실제 API에 가격이 없으면 요금을 만들지 않고 검색·빈 결과·조회 오류 처리", async ({ page }) => {
  await installApiFixture(page);
  await page.route("**/api/rentals", route => route.fulfill({ status: route.request().method() === "POST" ? 201 : 200, json: route.request().method() === "POST" ? { id: 99 } : [] }));
  let failure = false;
  await page.route("**/api/vehicles/available*", route => failure ? route.fulfill({ status: 500, json: { message: "조회 실패" } }) : route.fulfill({ json: vehicles.map(vehicle => ({ ...vehicle, hourlyPriceWon: null })) }));
  await logIn(page); await page.goto("/renter");
  await expect(page.getByLabel("최소 금액", { exact: true })).toBeDisabled();
  await expect(page.locator('.renter-card-price')).toHaveCount(3);
  await page.getByLabel("차량·픽업 주소 검색", { exact: true }).fill("찾을수없는차량");
  await expect(page.getByRole("heading", { name: "조건에 맞는 차량이 없습니다", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "필터 초기화", exact: true }).click();
  await expect(page.locator('.renter-vehicle-card')).toHaveCount(3);
  failure = true; await page.reload();
  await expect(page.getByRole("heading", { name: "차량 목록을 불러오지 못했습니다", exact: true })).toBeVisible({ timeout: 15000 });
  failure = false; await page.locator(".renter-empty").getByRole("button", { name: "다시 조회", exact: true }).click();
  await expect(page.locator('.renter-vehicle-card')).toHaveCount(3);
});
