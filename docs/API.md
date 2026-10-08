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
