# Lovable 디자인 / 실제 풀스택 통합

## Phase 1 조사

reference/design-reference는 Vite + TanStack Start/Router + React 프로젝트다. src/routes/index.tsx에 마켓플레이스, 필터, 카드, 요청 패널, 모바일 오버레이가 있다. 다른 서비스 페이지는 실제 라우트로 구현되지 않았다. src/lib/store.tsx는 localStorage 기반 예시 차량/예약/로그인 상태를 가진다. 지도는 MapArt SVG, 시간 필터도 예시 문자열이다. 모두 실서비스 데이터/권한에 사용할 수 없다.

src/styles.css의 oklch 디자인 토큰(16px 기본 radius, primary 0.58/0.2/258, navy 0.22/0.06/262, 카드/그림자), Pretendard 계열 font stack, 둥근 모드 전환 헤더, 제조사 chip, EV toggle, 가격 range, map/card split을 실제 구현 기준으로 사용한다. Radix/lucide/TanStack Router를 그대로 가져와 라우터를 교체하지 않는다. 기존 컴포넌트/아이콘과 Next Link/네이티브 접근성 요소를 우선 재사용한다.

이미지 4장은 소스에 라이선스 증빙이 없어 권한 확인 전 복사하지 않는다. 폰트 바이너리가 포함되지 않아 Pretendard가 설치된 환경에서는 사용하고 그 외 한국어 시스템 폰트로 대체한다. 외부 분석/오류 전송 코드는 이식하지 않는다.

기존 My Garage: /login,/signup,/mode,/owner,/renter,/vehicles/register,/garage(OTA),/demo,/demo/garage. 차량 owner 조회/공개 조회, 기간 충돌, 신청/승인/동의, grant, unlock PKI, SSE after-commit, pickup Kakao, soft delete가 구현됨. 가격/가격 스냅샷, 차량 상세 수정, 실제 서명 패드, 별도 예약/디지털키/보안 라우트는 추가해야 함.

## 단계별 작업

1. 조사 및 기존 기능/이식 매핑(완료).
2. 레퍼런스 토큰과 헤더/상태/스켈레톤/입력/다이얼로그 공통 UI, 인증 화면.
3. 실제 Query/SSE 기반 marketplace와 알림/예약 분리.
4. 소유자/차량 등록·수정 폼.
5. nullable 요금/차량 속성과 rental 가격 스냅샷, 서버 quote.
6. 계약/서명(로컬 시각 정보만)/디지털키/분리된 보안 라우트.
7. 격리된 DB + 백엔드/프론트/브라우저 회귀와 반응형 확인.

기존 개발 DB 행 수정·삭제/리셋, Git commit/push/배포 금지. 스키마는 기존 값에 임의 가격을 넣지 않는 nullable 추가만 사용. E2E 데이터는 mygarage_e2e에서만 생성하고 기존 격리/정리 가드를 유지한다. 기존 역사적 무가격 계약은 그대로 조회 가능해야 한다.

## 구현 결과

- 공통 헤더의 모드 전환/계정/알림, 인증 화면, marketplace sidebar와 map/card split, 차량 카드에 원본 토큰과 구조를 이식했다. Vite 라우터, localStorage 계정·예약, SVG 가상 지도, 외부 분석/오류 전송은 사용하지 않는다.
- /renter: 실제 DB 차량, 제조사/모델/확인된 동력·차체 유형/가격/픽업 지역/기간/가능 여부 필터, 정렬, Kakao 마커·카드 양방향 선택, compact 예약 배너, 서버 예상 요금과 신청 폼.
- /owner: 실제 차량 통계, 새 신청/진행 중 계약/과거 내역 구분, 가격·공유·수정·삭제 관리. /security로 OTA 진입을 분리했다.
- /vehicles/register 및 /vehicles/[id]/edit: 정보/대여 조건/픽업/확인의 4개 구획. 기존 종속 카탈로그, 번호판 검증, 검색 debounce/최대20개/지도 드래그/역지오코딩/상세 위치·안내를 재사용했다.
- /bookings?mode=owner 또는 renter, /contracts/[rentalId], /digital-key?mode=owner 또는 renter: 실제 계약·동의·기간별 접근 권한·가상 잠금 상태. 계약 동의는 체크+캔버스 모의 서명 또는 키보드 이름 입력을 사용한다. 이름/서명 이미지를 저장하지 않고 기존 서버 동의자·시각·계약 버전만 보존한다.
- PKI X.509/RSA challenge proof, 세션/CSRF, 승인 후 가상 unlock, SSE after-commit, soft delete 및 OTA 검증 로직을 보존했다. 재잠금은 기존 소유자 전용 API를 재사용했다.

## API 및 스키마

- PUT /api/vehicles/{id}: 소유자 차량 수정. 비관적 잠금/본인 소유권/삭제 상태/카탈로그 동력 유형을 서버에서 검사한다.
- POST /api/rentals/quote: 공개된 다른 사람의 차량만 견적. 신규 신청도 서버에서 가격을 다시 계산한다. 클라이언트 금액을 받지 않는다.
- vehicles nullable hourly_rate, power_type, body_type, description, minimum_rental_hours. 기존 행에는 가격을 채우지 않는다. UI는 가격 설정 필요, 새 신청은 서버에서 차단한다.
- rentals nullable hourly_rate, estimated_total, billed_hours: 신청 시 요금 스냅샷. 이후 소유자가 가격을 수정해도 기존 계약 금액 유지. 기존 무가격 과거 계약은 그대로 조회한다.
- 요금 정책: 시간당 1~1,000,000원, 최소 1~24시간, 기존 최대 기간 30일. 소수 시간은 1시간 단위 올림. 실제 결제·정산 없음.
- db/migrations/20261009_rental_pricing.sql은 ADD COLUMN IF NOT EXISTS만 포함한다. 기존 개발 설정의 Hibernate ddl-auto=update로 신규 컬럼 추가가 가능하다. 기존 행 UPDATE/DELETE/초기화 SQL은 실행하지 않았다. 별도 운영 마이그레이션 자동화는 추가하지 않았다.

## 데이터 및 이미지

차량/공유/픽업/실제 가격은 Spring Boot → PostgreSQL API에서 조회한다. 프론트 카탈로그는 사람이 읽는 모델명·차종 기본 속성과 이미지 경로만 제공한다. 기본 속성으로 가솔린/하이브리드를 추측하지 않는다. powerType 필터는 DB에 확인된 값 또는 순수 전기차 카탈로그만 사용한다.

기존 LIVE-* 차량·LIVE-PICKUP-* 주소는 이전 sharing-live.spec.ts/sharing-data-live.spec.ts가 API로 생성한 DB 테스트 행이다. 생성 문자열은 presentation.ts에서 정보 확인 필요로 표시하나 DB 정리의 대체 수단이 아니다. 기존 개발 행은 수정/삭제하지 않았다. 새 E2E는 localhost:15432/mygarage_e2e 및 mygarage_e2e 제한 계정/8083 백엔드/3100 프론트만 허용하고 테스트별 namespace 정리 가드를 유지한다.

사용자가 Lovable 사진 권한 미확인을 답변하여 4장 모두 복사하지 않았다. 기존 기본 이미지와 placeholder 사용. 추가 사진은 frontend/public/images/vehicles/catalog에 vehicle-media.json의 imageFile 이름으로 넣는다. 표기 이름은 같은 JSON의 displayName, 설명은 imageAlt, 실제 파일 준비 여부는 assets:vehicles가 확인한다. 상세 절차는 해당 폴더 README.md.

## 검증 및 제한

검증 상세 결과는 최종 실행 후 아래에 기록한다. Kakao 외부 SDK/서비스 테스트 fixture는 브라우저 UI 테스트에서만 사용하고, 실제 Spring/DB/세션/SSE/PKI 응답은 대체하지 않는다. 127.0.0.1:3100 실제 Kakao 연결은 오류 상태가 확인되었다. 키/웹 도메인 설정 확인이 필요하며 정확한 외부 연결 실패 원인을 확정하지 않았다. 지도 성공 화면이나 실제 장소 검색 성공을 검증했다고 해석하지 않는다. localhost:3000은 사용자 계정 로그인이 필요하여 로그인 디자인/비로그인 보호 상태를 직접 확인했다.

남은 한계: 실제 결제·보험·법적 전자서명·실차 제어 없음, 서명 이미지 저장 없음, 대여자 직접 재잠금 권한 없음(소유자 잠금 제공), 사용자 사진 업로드 저장소 없음, Pretendard 폰트 바이너리 없음(시스템 폰트 fallback), 실제 Kakao 테스트 도메인 등록 후 지도 성공 재확인 필요. SSE 알림은 기존 in-memory로 영속 읽음/이벤트 replay 없음. 과거 무가격 계약의 가격 소급 생성 없음.

## 최종 검증 결과 (2026-10-09)

| 검사 | 실제 결과 |
| --- | --- |
| Gradle test | 57개 통과, 실패/제외 0. 인증·CSRF·권한·동시성·계약·PKI·OTA·가격/스냅샷/차종 변경·SSE 종료 예외 포함 |
| 프론트 단위 테스트 | 8개 통과 |
| TypeScript / ESLint / production build | 통과 |
| Playwright 전체 UI + 실제 A/B/C | 19개 통과, 7개 제외. 숨긴 과거 데모 등록 6건과 별도 실행하는 PKI 1건 |
| Playwright PKI 별도 실행 | 1개 통과. 잘못된 기기 신원 차단, Web Crypto 서명, 소유자 승인, 챌린지 재사용 거부 |
| 반응형 | 실제 DB 계정으로 390/768/1440px screenshot 및 가로 넘침 없음 확인 |

실제 UI 등록 → 12,000원 저장 → 다른 계정 공개 목록 → 본인 제외 → 공유 중단/재개 SSE → 1시간 서버 총액 12,000원 → 신청/소유자 SSE → 차량 수정 18,000원(기존 계약12,000원 유지) → 승인/양측 계약 동의(이름 입력 + 실제 캔버스 드로잉) → 계약 상세 → 디지털 키 → unlock 요청/승인/SSE → 소유자 재잠금/대여자 SSE → /security 실제 정상 OTA 승인 → 재연결 → 삭제 차단/다른 사용자 권한 차단/종료 후 soft delete/과거 계약 보존을 확인했다. C 계정에는 대여 change 이벤트가 전달되지 않았다.

페이지 이동이 잦을 때 이미 종료된 Servlet SSE 연결의 complete()가 IllegalStateException을 던져 다음 구독자의 전달까지 중단시키는 문제를 발견했다. NotificationService의 안전한 종료 처리를 추가하고 mock 종료 예외 회귀 + 실제 페이지 이동/A/B 이벤트 테스트로 확인했다. 인증/인가나 이벤트 수신자 범위는 변경하지 않았다.

검증 로그: /private/tmp/my-garage-lovable-backend-tests.log, my-garage-lovable-e2e.log, my-garage-lovable-pki-e2e.log, my-garage-lovable-final-build.log. 스크린샷: /private/tmp/my-garage-lovable-renter-{390,768,1440}.png, my-garage-lovable-contract.png, my-garage-lovable-security.png. 스크린샷 속 계정과 차량은 격리 DB에서 실제 API로 생성한 테스트 자료다. 3100 지도 오류는 실제 Kakao 성공 증거가 아니다.

## 직접 확인 절차

1. localhost:3000/login 또는 /signup에서 로그인한다. 현재 사용자 브라우저 세션은 비로그인 상태로 확인됐으며 이를 우회하지 않았다.
2. /owner → 차량 수정에서 기존 차량의 시간당 가격을 설정한다. 가격을 자동 생성하지 않았기 때문에 기존 차량은 설정 필요 상태일 수 있다.
3. /vehicles/register에서 차량/요금/픽업/공유를 입력한다. /renter에서 다른 사람의 공개 차량만 지도/목록으로 표시된다.
4. 다른 계정 또는 시크릿 창에서 신청 → 소유자 /owner 승인 → 양측 /bookings 또는 /contracts/[계약id] 동의 → /digital-key 이용. 잠금은 소유자 /digital-key?mode=owner 또는 /owner에서 수행한다.
5. /security → 차량 소프트웨어 보안 검증 → 본인 차량 선택 → 검증 실행. 실제 설치는 하지 않는다.
6. Kakao 키에 사용할 origin(localhost:3000, 테스트용127.0.0.1:3100)의 등록 여부를 확인한다. 외부 SDK 연결 성공은 이 설정 후 재확인해야 한다.

Git commit/push/배포/개발 DB 행 UPDATE/DELETE/초기화는 수행하지 않았다. 테스트 종료 시 정리한 것은 mygarage_e2e의 해당 실행 namespace뿐이다.

## 수정 파일

- `backend/src/main/java/com/mygarage/backend/sharing/NotificationService.java`
- `backend/src/main/java/com/mygarage/backend/sharing/Rental.java`
- `backend/src/main/java/com/mygarage/backend/sharing/SharingController.java`
- `backend/src/main/java/com/mygarage/backend/sharing/SharingDtos.java`
- `backend/src/main/java/com/mygarage/backend/sharing/SharingService.java`
- `backend/src/main/java/com/mygarage/backend/vehicle/Vehicle.java`
- `backend/src/main/java/com/mygarage/backend/vehicle/VehicleCatalog.java`
- `backend/src/main/java/com/mygarage/backend/vehicle/VehicleController.java`
- `backend/src/main/java/com/mygarage/backend/vehicle/VehicleService.java`
- `backend/src/main/java/com/mygarage/backend/vehicle/dto/VehicleRequest.java`
- `backend/src/main/java/com/mygarage/backend/vehicle/dto/VehicleResponse.java`
- `backend/src/main/resources/db/migrations/20261009_rental_pricing.sql`
- `backend/src/test/java/com/mygarage/backend/sharing/NotificationServiceTests.java`
- `backend/src/test/java/com/mygarage/backend/sharing/RentalPricingTests.java`
- `backend/src/test/java/com/mygarage/backend/sharing/SharingConcurrencyTests.java`
- `backend/src/test/java/com/mygarage/backend/sharing/SharingIntegrationTests.java`
- `backend/src/test/java/com/mygarage/backend/sharing/VehicleLifecycleTests.java`
- `backend/src/test/java/com/mygarage/backend/sharing/pki/PkiSharingIntegrationTests.java`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/LOVABLE_INTEGRATION.md`
- `frontend/app/bookings/page.tsx`
- `frontend/app/contracts/[id]/page.tsx`
- `frontend/app/digital-key/page.tsx`
- `frontend/app/globals.css`
- `frontend/app/layout.tsx`
- `frontend/app/security/page.tsx`
- `frontend/app/vehicles/[id]/edit/page.tsx`
- `frontend/app/vehicles/register/page.tsx`
- `frontend/components/layout/account-shell.tsx`
- `frontend/components/platform/app-header.tsx`
- `frontend/components/platform/design-system.css`
- `frontend/components/platform/platform-ui.tsx`
- `frontend/features/sharing/api.ts`
- `frontend/features/sharing/components/contract-consent.tsx`
- `frontend/features/sharing/components/contract-detail.tsx`
- `frontend/features/sharing/components/owner-dashboard.tsx`
- `frontend/features/sharing/components/owner-vehicle-card.tsx`
- `frontend/features/sharing/components/rental-attention-banner.tsx`
- `frontend/features/sharing/components/rental-card.tsx`
- `frontend/features/sharing/components/rental-form.tsx`
- `frontend/features/sharing/components/rental-list.tsx`
- `frontend/features/sharing/components/renter-dashboard.css`
- `frontend/features/sharing/components/renter-dashboard.tsx`
- `frontend/features/sharing/components/renter-filters.tsx`
- `frontend/features/sharing/components/renter-vehicle-card.tsx`
- `frontend/features/sharing/components/security-dashboard.tsx`
- `frontend/features/sharing/components/sharing-shell.tsx`
- `frontend/features/sharing/pricing.ts`
- `frontend/features/sharing/types.ts`
- `frontend/features/sharing/use-sharing-events.ts`
- `frontend/features/vehicle-registration/components/server-registration.tsx`
- `frontend/features/vehicle-registration/components/vehicle-editor.tsx`
- `frontend/services/garage-api.ts`
- `frontend/services/types.ts`
- `frontend/tests/e2e/api-fixture.ts`
- `frontend/tests/e2e/api-integration.spec.ts`
- `frontend/tests/e2e/onboarding.spec.ts`
- `frontend/tests/e2e/sharing-data-live.spec.ts`
- `frontend/tests/e2e/sharing-live.spec.ts`
- `frontend/tests/e2e/sharing-pki-live.spec.ts`
- `frontend/tests/e2e/sharing-ux.spec.ts`
