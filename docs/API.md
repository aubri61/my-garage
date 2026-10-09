# API 계약

공통 prefix는 `/api`다. 모든 변경은 로그인 세션과 `GET /api/csrf` 응답의 `headerName`/`token` 헤더가 필요하다. 로그인/회원가입도 CSRF가 필요하다. 오류는 `{code,message}`를 반환한다. 타인의 소유 차량·대여는 일관되게 404로 숨긴다.

| Method | 경로 | 동작 |
| --- | --- | --- |
| GET | /csrf | masked CSRF 응답 및 cookie |
| POST | /users/signup | name/email/password 가입 |
| POST | /auth/login | email/password 세션 로그인 |
| POST | /auth/logout | 세션 무효화 |
| GET | /users/me | id/name/email |
| GET, POST | /vehicles | 내 차량 조회/등록 |
| GET | /vehicles/{id} | 소유 차량 상세 |
| GET | /vehicles/available | 인증 사용자에게 타인의 공유 공개 차량 |
| PUT | /vehicles/{id}/sharing | enabled/pickupLocation/latitude/longitude |
| POST | /vehicles/{id}/lock | 소유자 가상 잠금 |
| GET, POST | /rentals | 당사자 목록/vehicleId, startsAt, endsAt 신청 |
| GET | /rentals/{id} | 당사자 상세 |
| POST | /rentals/{id}/approve, /reject | 소유자 신청 결정 |
| POST | /rentals/{id}/consents | 현재 당사자의 고정 조건 동의 |
| GET | /rentals/{id}/access-grant | grant 또는 null |
| POST | /rentals/{id}/access-grant/revoke | 소유자 권한 회수 |
| POST | /rentals/{id}/complete | 소유자 종료 및 권한 회수 |
| POST | /rentals/{id}/unlock-challenges | 대여자의 유효 grant에 서명 challenge |
| POST | /rentals/{id}/unlock-requests | 대여자 해제 요청, 선택적 PKI proof |
| POST | /unlock-requests/{id}/approve, /reject | 소유자 원격 결정 |
| GET | /sharing/security | pkiRequired |
| GET | /notifications/stream | 인증 사용자 SSE |
| GET | /ota/scenarios | 기존 7개 OTA 시나리오 |
| POST | /vehicles/{id}/ota/verify | 소유자 scenario/protectionEnabled |
| GET | /vehicles/{id}/ota/history | 소유자 최근 50개 이력 |

## 응답 타입

VehicleResponse는 기존 필드 + `sharingEnabled`, `pickupLocation`, `pickupLatitude`, `pickupLongitude`, `lockState`다. 등록 요청은 기존 manufacturer/model/modelYear/licensePlate를 유지하고 공유 설정을 별도로 수행한다.

AvailableVehicle: `id, manufacturer, model, modelYear, pickupLocation, latitude, longitude`. 목록 검색은 브라우저에서 이 공개 결과만 필터링하며 동일 목록으로 지도 마커를 만든다.

RentalView: `id, vehicleId, vehicleModel, ownerId, renterId, pickupLocation, startsAt, endsAt, status, termsVersion, terms, ownerConsentedAt, renterConsentedAt, accessGrant, lockState, unlockRequests`. grant는 `{active, startsAt, endsAt, revokedAt, allowedOperation}`, 원격 이력은 `{id, status, requestedAt, pkiVerified}`다. 모든 대여/원격 변경은 최신 RentalView를 반환한다. POST /rentals는 201이다.

날짜는 대여/보안 영역에서 UTC Instant ISO-8601을 사용한다. 기존 차량 생성/수정·OTA 시각 응답 형식은 유지한다.

## PKI

challenge 응답은 `{id, payload, expiresAt}`. payload는 서버가 정의한 `my-garage:unlock:v1`, rental/user/vehicle ID, nonce, expiresAt을 개행으로 연결한 UTF-8 문자열이다. 그대로 서명한다.

unlock-requests proof:

```json
{"challengeId": 123, "certificatePem": "-----BEGIN CERTIFICATE-----...", "signatureBase64": "...", "deviceId": "browser-device"}
```

서명은 SHA256withRSA / Web Crypto RSASSA-PKCS1-v1_5다. 기본 DB 모드에서는 body가 없어도 된다. PKI 필수 모드는 body 없는 요청을 403 PKI_REQUIRED로 차단한다. proof가 제공되면 모드와 관계없이 반드시 검증한다. 개인키는 요청에 포함하지 않는다.

주요 오류: 400 INVALID_PERIOD/OWN_VEHICLE/INVALID_REQUEST, 401 UNAUTHORIZED, 403 FORBIDDEN/ACCESS_DENIED/PKI_REQUIRED/CHALLENGE_INVALID/인증서 검증 코드, 404 VEHICLE_NOT_FOUND/NOT_FOUND, 409 RENTAL_CONFLICT/NOT_SHARED/INVALID_STATE/UNLOCK_PENDING.

SSE `ready`는 연결/REST 복원 신호다. `change`는 `{action,rentalId}` 힌트이며 이벤트 UUID는 중복 처리용이다. Last-Event-ID 재생은 제공하지 않는다.

## 실제 차량 등록과 공개 기간 조회 (2026-10-09)

`POST /api/vehicles`의 기존 네 필드에 선택적 `sharing` 객체를 추가했습니다. 생략하면 기존과 동일하게 비공개 등록됩니다. 제공한 경우 차량과 픽업/공유 설정을 한 트랜잭션에서 저장합니다.

```json
{"manufacturer":"현대","model":"IONIQ 5","modelYear":2026,"licensePlate":"123가4567","sharing":{"enabled":true,"pickupLocation":"서울 성수 공유 주차장","latitude":37.5445,"longitude":127.0557}}
```

- `GET /api/vehicles`: 로그인 사용자 소유 차량만, 공개 여부와 무관하게 반환.
- `GET /api/vehicles/available?startsAt=ISO8601&endsAt=ISO8601`: 타인 소유 공개 차량만 반환. 두 기간 파라미터를 함께 제공하면 `available`을 반환하며 승인된 겹치는 예약 및 본인의 겹치는 대기 요청을 반영합니다. 기간을 생략하면 `available: null`입니다. 이 조회는 최종 예약 보장이 아닙니다. 신청·승인은 기존 차량 행 잠금으로 재검증합니다.
- `GET /api/vehicles/available/{id}`: 타인 소유 공개 차량의 제한된 DTO만 반환. 본인 소유/비공개 차량은 404. 차량 번호, 소유자 이메일 및 사용자 엔티티는 반환하지 않습니다.
- SSE `change`: 대여 당사자에게만 action/rentalId 전달.
- SSE `vehicles`: 소유자의 다른 활성 화면에 내 차량 조회 갱신 안내.
- SSE `inventory`: 인증된 사용자에게 공개 목록 갱신 안내만 전달. 대여 ID, 소유자, 차량 번호 및 계약 내용이 없습니다.
- 모든 SSE 상태 이벤트는 트랜잭션 커밋 이후 전송합니다. 같은 이벤트는 모든 수신자에게 같은 ID를 사용합니다. 클라이언트는 ID 중복을 제거하고 갱신을 묶으며, 초기 조회까지 취소 후 재조회해 이전 응답이 남지 않게 합니다. 재연결의 `ready` 시 REST 전체 상태를 다시 조회합니다.

### 사용자 표시 이름 (UI 개선)

기존 공개 차량 응답에 `ownerName`, 계약 응답에 `ownerName`/`renterName`을 추가했다. 값은 기존 사용자 계정의 표시 이름이며 별도의 닉네임 저장 필드는 아니다. 기존 필드·URL·세션·권한·상태 전이는 유지한다. 공개 차량 DTO에는 번호판이나 이메일을 추가하지 않는다.


## Pickup details and vehicle lifecycle (2026-10-09)

`PUT /api/vehicles/{id}/sharing` and registration sharing accept optional `pickupDetail` (200 characters) and `pickupInstructions` (500 characters). Missing/null fields retain existing optional details on legacy sharing updates; empty strings clear them. Rental responses snapshot these fields at application time.

`PATCH /api/vehicles/{id}/sharing` accepts `{ "enabled": false | true }`. Owner-only; paused vehicles stay in owner inventory and preserve existing requests/contracts. Resume requires a valid stored base address and coordinates. New requests on paused vehicles return 409 NOT_SHARED.

`DELETE /api/vehicles/{id}` returns 204 for an owner-authorized soft deletion. Unexpired REQUESTED/CONTRACT_PENDING/CONFIRMED/ACTIVE rentals return 409 VEHICLE_IN_USE; a non-owner returns 404. Deleted vehicles cannot be publicly read, shared again, or newly OTA-verified. Past participant contracts and owner OTA history remain accessible.

Test-only `/api/test-support/environment` and `/cleanup` exist exclusively in the verified e2e profile; see E2E_DATABASE_ISOLATION.md. These endpoints do not exist in normal development/production.
