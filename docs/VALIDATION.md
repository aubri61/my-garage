# 검증 기록 — 2026-10-09 (Asia/Seoul)

## 실제 실행 결과

| 검증 | 결과 |
| --- | --- |
| Java 21 / PostgreSQL 전체 `./gradlew test` | 44 tests, 0 failures, 0 errors |
| Frontend `tsc --noEmit` | 통과 |
| Frontend ESLint | 통과 |
| Frontend 단위 테스트 | 8/8 통과 |
| Frontend production build | worker 옵션으로 통과 |
| 기존 Chrome 회귀 (route fixture) | 14/14 통과 |
| 실제 DB/Next/Spring 공유 Chrome 시연 | 1/1 통과: offline/online 재연결, 알림 격리, 로그아웃 포함 |
| PKI 필수 모드 실제 Chrome 시연 | 1/1 통과 (별도 8082 서버, 실제 Web Crypto) |
| 공유/PKI 데스크톱 및 390px 모바일 화면 | PNG로 확인, 가로 overflow 검사 통과 |
| Git diff whitespace | 통과 |

44개 backend 테스트는 기존 인증/CSRF/소유권/OTA 회귀 29개와 신규 공유·PKI 15개다. 실제 PostgreSQL을 사용한다. 서비스 통합 테스트는 트랜잭션 rollback, 동시 승인 테스트는 고유 행을 commit하여 별도 두 스레드로 경쟁시키고 해당 테스트가 만든 행만 정리한다. 인증서 fixture는 테스트 임시 폴더에서 OpenSSL 3.x로 생성하고 개인키를 Git에 넣지 않는다.

PKI 단위/DB 검증에는 신뢰 CA 정상 서명, 미신뢰 CA, 만료, 용도 누락, 서명/차량 payload 변조, 사용자/기기 SAN 불일치, 챌린지 만료/재사용, grant 회수/기간 만료를 포함한다.

실제 공유 시연은 세 개의 독립 계정에서 A 차량 공개, B 목록/신청, A SSE 요청, 승인과 B SSE, 양측 동의, grant 활성, B 원격 요청과 A SSE, A 승인과 B UNLOCKED, 새로고침 복원, 회수 후 403, C 위장 승인 404, B OTA 404/A OTA 200, CSRF 누락 403, 대여 종료, C에게 당사자 이벤트가 전달되지 않음, 네트워크 offline/online 이후 실제 SSE 재연결, 로그아웃 후 로그인 필요 화면과 SSE 401도 검증한다. 일반 전체 Chrome run은 15 passed, 1 skipped(PKI 별도 run용)이며 별도 PKI run의 1 passed를 합쳐 16개 시나리오를 확인했다.

PKI Chrome 시연은 별도 backend 8082에서 `sharing.pki.required=true`와 로컬 공개 CA를 설정했다. 실제 브라우저에서 파일을 import하고 challenge 서명 → 서버 검증 → 소유자 승인까지 수행했다. 잘못된 deviceId는 CERTIFICATE_IDENTITY로 거부되고, 성공 요청 payload에 공개 certificate/challengeId/deviceId/signature만 포함됨을 확인했다. 개인키 업로드/저장 요청은 없다. 승인 뒤 같은 proof 재사용은 403이다. 테스트용 8082 서버는 검증 후 종료했고 frontend build의 기본 backend는 8080으로 복원했다.

## 검증 중 발견해 수정한 문제

- 공유 전이 테스트의 영속성 컨텍스트 refresh 전에 flush하여 직전 동의/승인 상태 유실 방지.
- 실제 HTTP에서 Hibernate lazy proxy의 필드 직접 접근으로 null ID가 생긴 문제를 getter로 수정.
- Next 일반 rewrite의 SSE 압축으로 ready frame이 지연되어 전용 identity/no-transform 프록시 추가.
- 픽업 위치 변경으로 계약 표시가 바뀌지 않도록 Rental snapshot 저장.
- offline 이벤트에서 EventSource를 닫고 online에서 새 연결/REST 복원하도록 보완.
- 스트림 취소/세션 종료 때 upstream reader를 정리하고 예상 연결 종료를 EOF로 전달하여 Next pipe 오류 로그를 방지.

일반 build는 Node 25.3.0 환경의 Turbopack child process 포트 제한에 실패했다. 명시적 `NEXT_FORCE_WORKER_THREADS=1`로 통과했으며 기본 강제 설정은 하지 않는다. 이후 디스크 공간 부족도 발생해 본 작업의 재생성 가능한 Turbopack production cache만 정리했다. 소스/기존 DB/사용자의 dev cache는 삭제하지 않았다.

## 미검증과 범위 밖

- Kakao SDK 타일/마커는 실제 키가 없어 현장 검증하지 못했다. 키 없는 목록/신청은 실제 서버와 검증했다. SDK 참고: [Kakao 공식 문서](https://apis.map.kakao.com/web/documentation/).
- 서버 장시간 idle session 자연 만료, DB lock timeout/다중 서버 부하, 실제 인증서 운영 폐기/OCSP는 별도 운영 검증이 필요하다.
- 실제 e2e는 테스트 계정/차량/대여 행을 DB에 남긴다. 성공 완료 차량은 비공개로 전환하며 실패한 시연 행은 남을 수 있다. 기존 데이터 삭제/초기화는 하지 않았다.

## 수정·생성 파일

아래는 Git 추적 변경 및 새 소스/문서 목록이다. 생성된 build, node_modules, 브라우저 trace, `.local` 키는 포함하지 않는다. 기존 ignored `backend/HELP.md`는 루트 실행 문서로 연결하는 안내를 갱신했다.

### Markdown

- `AGENTS.md`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/CODE_QUALITY_CHECKLIST.md`
- `docs/DATA_MODEL.md`
- `docs/DESIGN.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/REQUIREMENTS.md`
- `docs/SECURITY.md`
- `docs/USER_FLOWS.md`
- `docs/VALIDATION.md`
- `frontend/AGENTS.md`
- `frontend/README.md`
- `frontend/tests/README.md`

### Backend

- `backend/src/main/java/com/mygarage/backend/global/exception/GlobalExceptionHandler.java`
- `backend/src/main/java/com/mygarage/backend/sharing/DigitalAccessGrant.java`
- `backend/src/main/java/com/mygarage/backend/sharing/DigitalAccessGrantRepository.java`
- `backend/src/main/java/com/mygarage/backend/sharing/NotificationService.java`
- `backend/src/main/java/com/mygarage/backend/sharing/RemoteUnlockRepository.java`
- `backend/src/main/java/com/mygarage/backend/sharing/RemoteUnlockRequest.java`
- `backend/src/main/java/com/mygarage/backend/sharing/Rental.java`
- `backend/src/main/java/com/mygarage/backend/sharing/RentalRepository.java`
- `backend/src/main/java/com/mygarage/backend/sharing/SecurityAuditLog.java`
- `backend/src/main/java/com/mygarage/backend/sharing/SecurityAuditRepository.java`
- `backend/src/main/java/com/mygarage/backend/sharing/SharingController.java`
- `backend/src/main/java/com/mygarage/backend/sharing/SharingDtos.java`
- `backend/src/main/java/com/mygarage/backend/sharing/SharingException.java`
- `backend/src/main/java/com/mygarage/backend/sharing/SharingService.java`
- `backend/src/main/java/com/mygarage/backend/sharing/pki/PkiVerifier.java`
- `backend/src/main/java/com/mygarage/backend/sharing/pki/UnlockChallenge.java`
- `backend/src/main/java/com/mygarage/backend/sharing/pki/UnlockChallengeRepository.java`
- `backend/src/main/java/com/mygarage/backend/vehicle/Vehicle.java`
- `backend/src/main/java/com/mygarage/backend/vehicle/VehicleRepository.java`
- `backend/src/main/java/com/mygarage/backend/vehicle/dto/VehicleResponse.java`
- `backend/src/main/resources/application.properties`
- `backend/src/test/java/com/mygarage/backend/sharing/SharingConcurrencyTests.java`
- `backend/src/test/java/com/mygarage/backend/sharing/SharingIntegrationTests.java`
- `backend/src/test/java/com/mygarage/backend/sharing/pki/PkiSharingIntegrationTests.java`
- `backend/src/test/java/com/mygarage/backend/sharing/pki/PkiVerifierTests.java`

### Frontend

- `frontend/.env.example`
- `frontend/.gitignore`
- `frontend/app/api/notifications/stream/route.ts`
- `frontend/app/globals.css`
- `frontend/app/layout.tsx`
- `frontend/app/mode/page.tsx`
- `frontend/app/owner/page.tsx`
- `frontend/app/renter/page.tsx`
- `frontend/components/layout/account-shell.tsx`
- `frontend/components/layout/app-header.tsx`
- `frontend/features/auth/components/auth-form.tsx`
- `frontend/features/garage/components/service-introduction.tsx`
- `frontend/features/sharing/api.ts`
- `frontend/features/sharing/components/mode-selection.tsx`
- `frontend/features/sharing/components/owner-dashboard.tsx`
- `frontend/features/sharing/components/owner-vehicle-card.tsx`
- `frontend/features/sharing/components/pickup-map.tsx`
- `frontend/features/sharing/components/rental-card.tsx`
- `frontend/features/sharing/components/rental-form.tsx`
- `frontend/features/sharing/components/rental-list.tsx`
- `frontend/features/sharing/components/renter-dashboard.tsx`
- `frontend/features/sharing/components/sharing-shell.tsx`
- `frontend/features/sharing/components/signed-unlock-form.tsx`
- `frontend/features/sharing/types.ts`
- `frontend/features/sharing/use-sharing-events.ts`
- `frontend/features/updates/components/ota-security-lab.tsx`
- `frontend/features/vehicle-registration/components/server-registration.tsx`
- `frontend/lib/api-client.ts`
- `frontend/next.config.ts`
- `frontend/services/types.ts`
- `frontend/tests/e2e/api-fixture.ts`
- `frontend/tests/e2e/sharing-live.spec.ts`
- `frontend/tests/e2e/sharing-pki-live.spec.ts`

### Local fixture / repository rules

- `.gitignore`
- `scripts/create-test-device.sh`


## Authentication screen correction — 2026-10-09

- AccountShell now owns the dark sharing theme, so login, signup, session error and registration screens receive the same tokens. Disabled, validation, success and autofill states use dark surfaces too. Removed the redundant theme wrapper around mode selection.
- `/` redirects to `/login` in Next configuration before rendering. Its page exports the login page as a renderable app-shell fallback, avoiding the observed `instant` validation / `NEXT_REDIRECT` conflict.
- Explicitly allow `127.0.0.1` in development; Next 16.4 otherwise blocks resources for that alternate local hostname.
- The user's existing development server automatically restarted after configuration changes. `/renter` returned 200; actual UI signup → login → mode → renter → logout passed against the live backend for both localhost and 127.0.0.1. Fresh test accounts were created; existing records were preserved. No page exceptions or hydration errors appeared in clean browser contexts. One expected unauthenticated 401 appeared during logout/session checking.
- Desktop login/signup and 390px mobile login screenshots were inspected; no mobile horizontal overflow. Screenshots: `/private/tmp/garage-login-fixed.png`, `/private/tmp/garage-signup-fixed.png`, `/private/tmp/garage-login-mobile-fixed.png`.
- Lint, `tsc --noEmit`, 8 unit tests, production build (`NEXT_FORCE_WORKER_THREADS=1`, the already documented local runtime workaround), and 14 onboarding/API browser regression tests passed.
- The pasted hydration mismatch contains only an unexpected body attribute `cz-shortcut-listen`. No application code emits this attribute; external DOM modification is the likely source. The application does not suppress all hydration warnings. If this warning persists in the user's browser, disable the injecting extension for localhost and reload.
- The pasted Turbopack panic did not produce its named log, so its original cause could not be established. It did not recur during the post-restart development navigation checks. Separate earlier panic logs show loader port permission failures from restricted tool runs and should not be conflated with that missing log.

## Sharing demo replacement — 2026-10-09

- `/demo` now provides a dark, isolated P2P walkthrough: search/select vehicle, request, owner approval/rejection, both parties' consent, active access, unlock request/approval/rejection, revocation, completion and reset. No session/API/SSE hooks or persisted demo state are used.
- Previous garage preview is preserved at `/demo/garage`. The existing login demo button now renders the new walkthrough through its existing `/demo` URL.
- Files: `frontend/app/demo/page.tsx`, `frontend/app/demo/garage/page.tsx`, `frontend/features/sharing/demo/{state,rental-preview,sharing-demo}.tsx` (state is `.ts`), `frontend/tests/e2e/sharing-demo.spec.ts`, CSS, frontend AGENTS/README, root README and implementation plan.
- Lint, TypeScript and production build passed. Two new sharing-demo browser tests and six existing API/auth/OTA regression tests passed (8 total). Tests verify dual consent, owner approval, access revocation blocking unlock, rejection, reset, refresh isolation, no `/api` calls and no page exceptions.
- Development-server button navigation and desktop/390px mobile screenshots were inspected; no horizontal overflow. Screenshots: `/private/tmp/garage-sharing-demo-desktop.png`, `/private/tmp/garage-sharing-demo-mobile.png`.
