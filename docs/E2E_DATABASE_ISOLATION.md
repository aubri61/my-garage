# E2E 전용 DB 설정과 실행

개발 PostgreSQL `mygarage`는 보존합니다. 이번 구성은 `mygarage_e2e` DB와 동일 이름의 비관리자 역할을 새로 만들었습니다. 개발 차량 테이블에 이 역할의 SELECT/INSERT/UPDATE/DELETE 권한이 모두 false임을 조회했습니다. 개발 DB의 기존 권한을 변경하지 않았습니다.

## 1. 최초 생성

저장소 루트에서 유지보수 DB `postgres`에 연결해 아래 명령을 실행합니다. 스크립트는 존재하지 않는 역할/DB만 생성하며 기존 역할의 권한이나 DB 소유자가 예상과 다르면 중단합니다. 기존 데이터 삭제·초기화 명령은 없습니다.

```sh
PGPASSWORD=mygarage psql -h localhost -p 15432 -U mygarage -d postgres -f scripts/provision-e2e.sql
```

`mygarage_e2e` 암호 기본값은 로컬 테스트용으로만 사용합니다. 원격/운영 자격 증명이 아닙니다. 변경한 경우 `E2E_DB_PASSWORD`로 전달하세요. URL 기본값 `jdbc:postgresql://localhost:15432/mygarage_e2e`, 계정 기본값 `mygarage_e2e`. 개발 데이터 복사나 seed 가져오기를 하지 않습니다.

## 2. 토큰 생성과 별도 백엔드

저장소 루트에서 최초 1회 생성한 토큰을 두 터미널에서 공유합니다. `.local/`은 Git 제외 대상입니다. 재실행 시 기존 파일을 덮어쓰면 실행 중 백엔드와 토큰이 달라질 수 있으니 생성은 처음에만 합니다.

```sh
mkdir -p .local
umask 077
printf 'export E2E_TOKEN=%s\n' "$(openssl rand -hex 32)" > .local/e2e.env
```

터미널 A:

```sh
source .local/e2e.env
cd backend
./gradlew bootRun --args='--spring.profiles.active=e2e'
```

8083에 loopback 전용으로 실행합니다. 정상 개발 서버 8080은 그대로 사용합니다. E2eDatabaseGuard는 DataSource 초기화 직후, Hibernate 스키마 DDL 전에 PostgreSQL `current_database/current_user/rolsuper`를 조회합니다. `mygarage_e2e/mygarage_e2e/false`가 아니면 시작을 거부합니다. 단순 환경 플래그를 믿지 않습니다.

## 3. Playwright

터미널 B, 저장소 루트:

```sh
source .local/e2e.env
cd frontend
RUN_LIVE_SHARING=1 npm run test:e2e
```

Playwright가 별도 Next dev 서버 127.0.0.1:3100을 시작합니다. `BACKEND_URL=http://127.0.0.1:8083`, 빌드 캐시 `.next-e2e`를 강제하여 개발 3000/8080 및 `.next` 캐시와 분리합니다. 운영 build 결과의 과거 rewrite를 재사용하지 않습니다.

globalSetup은 **실제 프론트 프록시를 통해** `/api/test-support/environment`를 조회하고 전용 DB·계정·비관리자·프로필과 토큰을 검증합니다. 토큰 미설정, 일반 개발 백엔드, 잘못된 프록시, 응답 실패면 테스트 본문 전에 중단합니다. 이 검증은 UI fixture 테스트에도 적용됩니다. 해당 test-support 컨트롤러와 특수 보안 체인은 e2e 프로필에만 존재하며 정상 인증·세션·CSRF 체인은 바뀌지 않습니다.

Kakao 실제 SDK를 이 주소에서도 검증하려면 Kakao 앱의 웹 도메인에 `http://127.0.0.1:3100`을 등록하세요. 미등록이면 지도 실패 안내·수동 fallback으로 저장을 검증합니다. 이번 실제 SDK 검색/드래그/클릭은 이미 허용된 localhost:3000에서 개발 API를 모두 fixture로 차단하고 별도 확인했습니다. 실패/응답 경합의 결정적 E2E는 SDK fixture로 명확히 구분합니다.

## 4. 테스트별 데이터와 정리

실제 데이터 테스트는 `isolated-test.ts`를 사용합니다. 테스트마다 새로운 32자리 hex namespace로 `e2e-<runId>-<역할>@example.com` 계정을 생성합니다. finally에서 해당 namespace만 정리합니다. 정리 API는 매번 실제 DB 신원과 토큰을 확인하며 일반 dev/prod에서는 사용할 수 없습니다. 테이블 전체 DELETE, TRUNCATE, DB DROP, 초기화는 하지 않습니다.

계정→소유 차량/대여 관계를 확인하고 다른 namespace/수동 사용자의 대여 관계가 발견되면 409로 정리 자체를 거부합니다. 잠금 요청·접근 권한·PKI 챌린지·관련 감사 로그→대여→OTA 이력→차량→계정 순서로 해당 테스트 생성 행만 제거합니다. 테스트 중 브라우저 세션도 종료합니다. Gradle 통합 테스트는 전용 DB에서 트랜잭션 rollback 또는 해당 테스트의 고유 ID만 정리합니다.

프로세스 강제 종료로 finally가 실행되지 않은 경우 전용 DB에 일부 행이 남을 수 있습니다. 실패 trace/오류의 namespace를 확인하고 전용 DB에서만 관계를 검토해 정리 API를 사용하세요. 반복 실행은 새로운 namespace를 사용하므로 남은 행을 덮어쓰지 않습니다. 개발 DB 오염은 DB 분리·역할 권한·프론트 프록시 신원 검사로 차단됩니다.

```sh
curl -f -X POST http://127.0.0.1:8083/api/test-support/cleanup \
  -H "X-E2E-Token: $E2E_TOKEN" -H 'Content-Type: application/json' \
  -d '{"runId":"실패한_테스트의_32자리_hex"}'
```

## 5. 백엔드 회귀 테스트

```sh
cd backend
./gradlew test
```

test resources는 전용 DB 자격 증명을 사용합니다. Gradle은 개발 URL/역할 override를 거부하고 Spring test 프로필의 DataSource 신원 가드도 DDL 전에 검사합니다. 실제 DB가 없으면 실패하며 개발 DB로 fallback하지 않습니다. 환경 격리를 검증하려면 `E2E_DB_URL=jdbc:postgresql://localhost:15432/mygarage ./gradlew test --rerun-tasks`가 테스트 전에 실패하는지 확인할 수 있습니다.

## 6. 선택적 브라우저 PKI

`RUN_LIVE_PKI=1` 실행에는 테스트 CA를 설정한 **8083 격리 백엔드**와 기기 인증서 fixture가 필요합니다. 새 `E2E_PKI_RUN_ID`(32자리 hex)를 만들고 인증서의 사용자 이메일을 `e2e-${E2E_PKI_RUN_ID}-pki@example.com`로 발급하여 `PKI_TEST_EMAIL`, `PKI_FIXTURE_DIR`를 전달하세요. 이 테스트도 동일한 namespace 정리와 DB 가드를 사용합니다. 이전 개발 DB용 인증서 이메일을 재사용하면 테스트를 차단합니다. PKI 인증 자체를 우회하거나 기존 개발 CA/계정/기기를 수정하지 않습니다.
