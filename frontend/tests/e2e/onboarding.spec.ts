import { expect, test, type Page } from "@playwright/test";
import { installApiFixture, logIn } from "./api-fixture";

async function signUp(page: Page) {
  await installApiFixture(page);
  await page.goto("/signup");
  await page.getByLabel("이름", { exact: true }).fill("회귀 테스트 회원");
  await page.getByLabel("이메일", { exact: true }).fill("garage-test@example.com");
  await page.getByLabel("비밀번호", { exact: true }).fill("DemoPass123!");
  await page.getByLabel("비밀번호 확인", { exact: true }).fill("DemoPass123!");
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await expect(page.getByRole("heading", { name: "가입이 완료되었습니다." })).toBeVisible();
  await logIn(page);
  await expect(page.getByRole("heading", { name: "등록된 차량이 없습니다." })).toBeVisible();
  await page.getByRole("link", { name: "차량 등록하기", exact: false }).click();
  await page.getByText("소유권·인증서 발급 데모 체험", { exact: true }).click();
  await expect(page.getByLabel("연결 코드 / VIN", { exact: true })).toBeEnabled();
}

async function findVehicle(page: Page) {
  await page.getByLabel("연결 코드 / VIN", { exact: true }).fill("EV6-2026");
  await page.getByRole("button", { name: "차량 조회", exact: true }).click();
  await expect(page.getByRole("heading", { name: "이 차량이 맞나요?" })).toBeVisible();
  await page.getByRole("button", { name: "차량 확인 · 다음" }).click();
  await page.getByLabel("데모 확인 코드", { exact: true }).fill("123456");
}

test("조회 중 이동 후 뒤로 돌아오면 입력을 보존하고 다시 조회할 수 있다", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-08T00:00:00Z") });
  await signUp(page);
  await page.clock.pauseAt(new Date("2026-10-08T01:00:00Z"));
  await page.getByLabel("연결 코드 / VIN", { exact: true }).fill("EV6-2026");
  await page.getByRole("button", { name: "차량 조회", exact: true }).click();
  await expect(page.getByRole("button", { name: "차량 조회 중…", exact: true })).toBeDisabled();
  await page.getByRole("link", { name: "차고지로 돌아가기" }).click();
  await expect(page).toHaveURL(/\/garage$/);
  await page.goBack();
  await expect(page.getByLabel("연결 코드 / VIN", { exact: true })).toHaveValue("EV6-2026");
  await expect(page.getByRole("button", { name: "차량 조회", exact: true })).toBeEnabled();
  await page.clock.resume();
  await page.getByRole("button", { name: "차량 조회", exact: true }).click();
  await expect(page.getByRole("heading", { name: "이 차량이 맞나요?" })).toBeVisible();
});

for (const stage of [
  { label: "식별정보 생성", elapsed: 500, step: "차량 식별정보 생성" },
  { label: "인증서 발급", elapsed: 1150, step: "차량 인증서 발급" },
  { label: "차량 연결", elapsed: 1900, step: "차량 연결" },
]) {
 test(`${stage.label} 중 이동 후 뒤로 돌아오면 확인 코드를 보존하고 다시 연결할 수 있다`, async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-08T00:00:00Z") });
  await signUp(page);
  await findVehicle(page);
  await page.clock.pauseAt(new Date("2026-10-08T01:00:00Z"));
  await page.getByRole("button", { name: "코드 확인 후 차량 연결" }).click();
  // Each await lets the next async stage schedule its own timer.
  await page.clock.runFor(500);
  await expect(page.getByRole("heading", { name: "차량 연결을 준비하고 있습니다." })).toBeVisible();
  if (stage.elapsed >= 1150) await page.clock.runFor(650);
  if (stage.elapsed >= 1900) await page.clock.runFor(750);
  await expect(page.getByRole("list", { name: "데모 차량 연결 진행 상태" }).getByRole("listitem").filter({ hasText: stage.step }).filter({ hasText: "진행 중" })).toBeVisible();
  await page.getByRole("link", { name: "차고지로 돌아가기" }).click();
  // Query notifications use timers; resume after the demo work has been cancelled.
  await page.clock.resume();
  await expect(page.getByRole("heading", { name: "등록된 차량이 없습니다." })).toBeVisible();
  await page.goBack();
  await expect(page.getByLabel("데모 확인 코드", { exact: true })).toHaveValue("123456");
  await expect(page.getByRole("button", { name: "코드 확인 후 차량 연결" })).toBeEnabled();
  await page.clock.resume();
  await page.getByRole("button", { name: "코드 확인 후 차량 연결" }).click();
  await expect(page.getByRole("heading", { name: "차량 연결이 완료되었습니다." })).toBeVisible();
 });
}

test("인증서 발급 실패 시 차량이 등록되지 않으며 재시도할 수 있다", async ({ page }) => {
  await signUp(page);
  await findVehicle(page);
  await page.getByLabel("데모 연결 결과").selectOption("certificate-error");
  await page.getByRole("button", { name: "코드 확인 후 차량 연결" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "데모 인증서 발급에 실패했습니다." })).toContainText("데모 인증서 발급에 실패했습니다.");
  await expect(page.getByRole("button", { name: "소유권 확인부터 다시 시도" })).toBeEnabled();
  await page.getByRole("link", { name: "차고지로 돌아가기" }).click();
  await expect(page.getByRole("heading", { name: "등록된 차량이 없습니다." })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "등록된 차량이 없습니다." })).toBeVisible();
});

test("데모 등록은 실제 서버 차량 목록에 섞이지 않는다", async ({ page }) => {
  await signUp(page);
  await findVehicle(page);
  await page.getByRole("button", { name: "코드 확인 후 차량 연결" }).click();
  await expect(page.getByRole("heading", { name: "차량 연결이 완료되었습니다." })).toBeVisible();
  await page.getByRole("link", { name: "내 차량 확인하기" }).click();
  await expect(page.getByRole("heading", { name: "등록된 차량이 없습니다." })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "등록된 차량이 없습니다." })).toBeVisible();
});

test("잘못된 회원가입 입력은 오류를 표시하고 가입을 진행하지 않는다", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("이름", { exact: true }).fill(" ");
  await page.getByLabel("이메일", { exact: true }).fill("invalid");
  await page.getByLabel("비밀번호", { exact: true }).fill("short");
  await page.getByLabel("비밀번호 확인", { exact: true }).fill("different");
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  for (const message of ["이름을 입력해주세요.", "올바른 이메일 주소를 입력해주세요.", "비밀번호는 8자 이상 입력해주세요.", "비밀번호가 일치하지 않습니다."]) {
    await expect(page.getByText(message, { exact: true })).toBeVisible();
  }
  await expect(page.getByLabel("이름", { exact: true })).toBeFocused();
  await expect(page.getByLabel("이메일", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("heading", { name: "가입이 완료되었습니다." })).toHaveCount(0);
  await page.getByRole("link", { name: "My Garage", exact: true }).click();
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  const loginFields = page.getByRole("group", { name: "로그인 정보" });
  await expect(loginFields.getByText("올바른 이메일 주소를 입력해주세요.", { exact: true })).toBeVisible();
  await expect(loginFields.getByLabel("이메일", { exact: true })).toBeFocused();
});


test("가입 요청 중 이동 후 뒤로 돌아와도 입력을 보존하고 다시 제출할 수 있다", async ({ page }) => {
  await installApiFixture(page);
  let first = true;
  let release = () => {};
  await page.route("**/api/users/signup", async route => {
    if (!first) { await route.fallback(); return; }
    first = false;
    await new Promise<void>(resolve => { release = resolve; });
    await route.abort("aborted");
  });
  await page.clock.install({ time: new Date("2026-10-08T00:00:00Z") });
  await page.goto("/signup");
  await page.getByLabel("이름", { exact: true }).fill("취소 테스트 회원");
  await page.getByLabel("이메일", { exact: true }).fill("cancel-test@example.com");
  await page.getByLabel("비밀번호", { exact: true }).fill("DemoPass123!");
  await page.getByLabel("비밀번호 확인", { exact: true }).fill("DemoPass123!");
  await page.clock.pauseAt(new Date("2026-10-08T01:00:00Z"));
  const requestStarted = page.waitForRequest("**/api/users/signup");
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await requestStarted;
  await expect(page.getByRole("button", { name: "가입 처리 중…", exact: true })).toBeDisabled();
  await page.getByRole("link", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  release();
  await page.goBack();
  const fields = page.getByRole("group", { name: "회원가입 정보" });
  await expect(fields.getByLabel("이메일", { exact: true })).toHaveValue("cancel-test@example.com");
  await expect(fields.getByLabel("이메일", { exact: true })).toBeEnabled();
  await expect(page.getByRole("button", { name: "회원가입", exact: true })).toBeEnabled();
  await page.clock.resume();
  await page.getByRole("button", { name: "회원가입", exact: true }).click();
  await expect(page.getByRole("heading", { name: "가입이 완료되었습니다." })).toBeVisible();
});
