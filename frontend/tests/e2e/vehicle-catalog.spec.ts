import { test, expect } from "./isolated-test";
import { chooseVehicleOption } from "./api-fixture";
import vehicleMedia from "../../features/vehicle-registration/vehicle-media.json";

test("실제 계정 등록 화면은 로컬 사진이 있는 20개 차종만 선택하고 이미지를 렌더링한다", async ({ page }) => {
  test.setTimeout(60000);
  const email = `e2e-${process.env.E2E_RUN_ID}-catalog@example.com`;
  async function post(path: string, data: unknown) {
    const csrf = await (await page.request.get("/api/csrf")).json();
    return page.request.post(path, { data, headers: { [csrf.headerName]: csrf.token } });
  }
  expect((await post("/api/users/signup", { name: "차종 검증", email, password: "Password123!" })).status()).toBe(201);
  expect((await post("/api/auth/login", { email, password: "Password123!" })).status()).toBe(200);
  await page.goto("/vehicles/register");
  await page.getByRole("combobox", { name: "제조사", exact: true }).click();
  await expect(page.getByRole("option", { name: "기타", exact: true })).toHaveCount(0);
  await expect(page.getByRole("option")).toHaveCount(2);
  await page.keyboard.press("Escape");
  expect(vehicleMedia).toHaveLength(20);
  for (const maker of ["현대", "기아"]) {
    await chooseVehicleOption(page, "제조사", maker);
    await page.getByRole("combobox", { name: "차종", exact: true }).click();
    await expect(page.getByRole("option")).toHaveCount(10);
    await page.keyboard.press("Escape");
    for (const entry of vehicleMedia.filter(item => item.manufacturer === maker)) {
      expect(entry.imageReady).toBe(true);
      expect((await page.request.get(`/images/vehicles/catalog/${entry.imageFile}`)).status()).toBe(200);
      await chooseVehicleOption(page, "차종", entry.displayName);
      const image = page.locator(".registration-preview img");
      await expect(image).toHaveAttribute("alt", entry.imageAlt);
      await expect.poll(() => image.evaluate(node => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
    }
  }
  await page.screenshot({ path: "/private/tmp/my-garage-catalog-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "/private/tmp/my-garage-catalog-mobile.png", fullPage: true });
  // Selecting a catalog entry alone must never create a registered vehicle.
  expect(await (await page.request.get("/api/vehicles")).json()).toEqual([]);
});
