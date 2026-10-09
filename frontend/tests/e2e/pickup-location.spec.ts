import { pickupSdk as sdk } from "./pickup-sdk-fixture";
import { test, expect } from "@playwright/test";
import { installApiFixture, logIn } from "./api-fixture";

// Kakao SDK fixtures validate deterministic error/race UI; actual SDK verification is separate.


test("픽업 SDK fixture: 자동완성·최대 20개·선택·드래그·실패 후 수동 주소와 상세 안내 보존", async ({ page }) => {
  await installApiFixture(page);
  await page.route("https://dapi.kakao.com/v2/maps/sdk.js**", route => route.fulfill({ contentType: "application/javascript", body: sdk }));
  await logIn(page); await page.goto("/vehicles/register");
  await expect(page.locator('#pickup-preset')).toHaveCount(0);
  await page.getByLabel("픽업 주소", { exact: true }).fill("서울시청");
  const results = page.getByRole("list", { name: "픽업 주소 검색 결과" });
  await expect(results.getByRole("button")).toHaveCount(20);
  await expect(results).toHaveCSS("max-height", "420px");
  await expect(results).toHaveCSS("overflow-y", "auto");
  await results.getByRole("button").first().click();
  await expect(page.getByLabel("픽업 주소", { exact: true })).toHaveValue("서울시청 도로명 주소");
  await page.getByLabel("상세 위치", { exact: true }).fill("지하 2층 B구역");
  await page.getByLabel("픽업 안내", { exact: true }).fill("3번 출입구");
  await page.getByRole("button", { name: "SDK 테스트 마커 드래그" }).dispatchEvent("pointerup");
  await expect(page.getByLabel("픽업 주소", { exact: true })).toHaveValue("조정된 도로명 주소");
  await expect(page.getByRole("region", { name: "픽업 위치 선택 카카오맵" })).toBeVisible();
  await expect(page.getByLabel("픽업 위도", { exact: true })).toHaveCount(0);
  await page.evaluate(() => { (window as unknown as { failReverse: boolean }).failReverse=true; });
  await page.getByRole("region", { name: "픽업 위치 선택 카카오맵" }).click({ position: { x: 50, y: 70 } });
  await expect(page.getByRole("status").filter({ hasText: "주소를 찾지 못" })).toBeVisible();
  await expect(page.getByLabel("픽업 주소", { exact: true })).toHaveValue("");
  await page.getByLabel("픽업 주소", { exact: true }).fill("선택한 좌표의 수동 주소");
  await expect(page.getByLabel("픽업 주소", { exact: true })).toHaveValue("선택한 좌표의 수동 주소");
  await expect(page.getByLabel("상세 위치", { exact: true })).toHaveValue("지하 2층 B구역");
  await expect(page.getByLabel("픽업 안내", { exact: true })).toHaveValue("3번 출입구");
});

test("픽업 SDK fixture: 오래된 검색 응답은 무시하고 빈 검색 결과를 안내", async ({ page }) => {
  await installApiFixture(page);
  await page.route("https://dapi.kakao.com/v2/maps/sdk.js**", route => route.fulfill({ contentType: "application/javascript", body: sdk }));
  await logIn(page); await page.goto("/vehicles/register");
  await page.getByLabel("픽업 주소", { exact: true }).fill("이전검색");
  await expect(page.getByText("주소를 검색하고 있습니다…", { exact: true })).toBeVisible();
  await page.getByLabel("픽업 주소", { exact: true }).fill("새검색");
  await expect(page.getByRole("list", { name: "픽업 주소 검색 결과" })).toContainText("새검색");
  await page.waitForTimeout(1300);
  await expect(page.getByRole("list", { name: "픽업 주소 검색 결과" })).not.toContainText("이전검색");
  await page.getByLabel("픽업 주소", { exact: true }).fill("없는주소");
  await expect(page.getByRole("status").filter({ hasText: "검색 결과가 없습니다" })).toBeVisible();
});
