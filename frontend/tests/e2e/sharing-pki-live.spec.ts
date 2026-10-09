import { test, expect } from "./isolated-test";
import { type BrowserContext } from "@playwright/test";
import path from "node:path";

test("브라우저 Web Crypto PKI 요청·사용자 기기 검증·재사용 차단", async ({ browser }) => {
  test.skip(process.env.RUN_LIVE_PKI !== "1", "테스트 CA를 설정한 실제 백엔드와 PKI fixture가 필요합니다.");
  test.setTimeout(90000);
  const email = process.env.PKI_TEST_EMAIL;
  const directory = process.env.PKI_FIXTURE_DIR;
  expect(email).toBeTruthy(); expect(directory).toBeTruthy();
  const owner = await browser.newContext(), renter = await browser.newContext();
  async function post(context: BrowserContext, url: string, data?: unknown) {
    const csrf = await (await context.request.get("/api/csrf")).json();
    return context.request.post(url, { data, headers: { [csrf.headerName]: csrf.token } });
  }
  if (email && !email.startsWith(`e2e-${process.env.E2E_RUN_ID}-`)) throw new Error("PKI certificate email must use this isolated E2E run namespace.");
  async function account(context: BrowserContext, email: string, name: string) {
    expect((await post(context,"/api/users/signup", { email,name,password:"Password123!" })).status()).toBe(201);
    expect((await post(context,"/api/auth/login", { email,password:"Password123!" })).status()).toBe(200);
  }
  try {
    await account(owner,`e2e-${process.env.E2E_RUN_ID}-owner@example.com`,"PKI Owner"); await account(renter,email!,"PKI Renter");
    const response = await post(owner,"/api/vehicles",{manufacturer:"Hyundai",model:"PKI Browser",modelYear:2025,licensePlate:"pki-live"});
    expect(response.status()).toBe(201); const vehicle = await response.json();
    const csrf = await (await owner.request.get("/api/csrf")).json();
    expect((await owner.request.put(`/api/vehicles/${vehicle.id}/sharing`, { data:{enabled:true,pickupLocation:"서울 시청 PKI 테스트",latitude:37.5665,longitude:126.978},headers:{[csrf.headerName]:csrf.token} })).status()).toBe(200);
    const rentalResponse=await post(renter,"/api/rentals",{vehicleId:vehicle.id,startsAt:new Date().toISOString(),endsAt:new Date(Date.now()+3600000).toISOString()});
    expect(rentalResponse.status()).toBe(201); const rental=await rentalResponse.json();
    expect((await post(owner,`/api/rentals/${rental.id}/approve`)).status()).toBe(200);
    expect((await post(owner,`/api/rentals/${rental.id}/consents`)).status()).toBe(200);
    expect((await post(renter,`/api/rentals/${rental.id}/consents`)).status()).toBe(200);
    const a=await owner.newPage(), b=await renter.newPage();
    await a.goto("/owner"); await b.goto("/renter");
    const ownerCard=a.locator(`article[data-rental-id="${rental.id}"]`);
    const renterCard=b.locator(`article[data-rental-id="${rental.id}"]`);
    await expect(renterCard.getByRole("button",{name:"잠금 해제 요청",exact:true})).toBeDisabled();
    await renterCard.getByText("테스트 인증서로 서명된 잠금 해제 요청",{exact:true}).click();
    await renterCard.getByLabel("기기 ID",{exact:true}).fill("wrong-device");
    await renterCard.getByLabel("공개 기기 인증서 (.pem)",{exact:true}).setInputFiles(path.join(directory!,"browser-device-cert.pem"));
    await renterCard.getByLabel("로컬 테스트 개인키 (PKCS#8 PEM)",{exact:true}).setInputFiles(path.join(directory!,"browser-device-key.pem"));
    await renterCard.getByRole("button",{name:"서명하여 잠금 해제 요청",exact:true}).click();
    await expect(renterCard.getByRole("alert")).toContainText("CERTIFICATE_IDENTITY");
    await renterCard.getByLabel("기기 ID",{exact:true}).fill("browser-device");
    const sending=b.waitForRequest(request => request.url().endsWith(`/rentals/${rental.id}/unlock-requests`) && request.method()==="POST");
    await renterCard.getByRole("button",{name:"서명하여 잠금 해제 요청",exact:true}).click();
    const request=await sending; const proof=request.postDataJSON();
    expect(Object.keys(proof).sort()).toEqual(["certificatePem","challengeId","deviceId","signatureBase64"]);
    expect(request.postData()).not.toContain("PRIVATE KEY");
    await expect(renterCard.getByText("PKI 검증을 통과해 소유자에게 승인 요청을 전송했습니다.")).toBeVisible();
    await ownerCard.getByRole("button",{name:"잠금 해제 승인",exact:true}).click();
    await expect(renterCard.getByText(/차량 잠금 해제됨/)).toBeVisible();
    expect((await post(renter,`/api/rentals/${rental.id}/unlock-requests`,proof)).status()).toBe(403);
    await b.screenshot({path:"/private/tmp/my-garage-renter-desktop.png",fullPage:true});
    await a.screenshot({path:"/private/tmp/my-garage-owner-desktop.png",fullPage:true});
    await b.setViewportSize({width:390,height:844});
    await b.screenshot({path:"/private/tmp/my-garage-renter-mobile.png",fullPage:true});
    expect(await b.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await post(owner,`/api/rentals/${rental.id}/complete`)).status()).toBe(200);
    const csrfEnd=await (await owner.request.get("/api/csrf")).json();
    expect((await owner.request.put(`/api/vehicles/${vehicle.id}/sharing`, {data:{enabled:false,pickupLocation:"서울 시청 PKI 테스트",latitude:37.5665,longitude:126.978},headers:{[csrfEnd.headerName]:csrfEnd.token}})).status()).toBe(200);
  } finally { await owner.close(); await renter.close(); }
});
