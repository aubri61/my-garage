import { expect, test } from "@playwright/test";

for (const route of ["/demo", "/demo/garage"]) {
  test(`제거한 데모 경로 ${route}는 예시 차량을 노출하지 않는다`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(404);
    await expect(page.getByText("차량 공유 서비스 체험", { exact: true })).toHaveCount(0);
  });
}
