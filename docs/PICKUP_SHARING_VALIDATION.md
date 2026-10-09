# 픽업·공유·삭제 검증 결과 (2026-10-09)

## 실행 결과

- backend Gradle test: **51개 통과**, 실패 0. 전용 `mygarage_e2e` DB에서 실행. session/CSRF/권한/계약/SSE/동시 승인/PKI/OTA 기존 회귀 포함.
- frontend TypeScript `npx tsc --noEmit`: 통과.
- frontend ESLint `npm run lint`: 통과. 생성된 `.next-e2e`는 검사 대상에서 제외.
- frontend unit: **8개 통과**.
- Playwright 전체 실제 Chrome: **23개 통과, 1개 건너뜀**. 45.6초. 실제 공유 두 시나리오는 Spring/PostgreSQL/SSE를 사용. 일반 API UI fixture 테스트와 픽업 SDK fixture 테스트는 실제 DB 검증과 구분.
- 프론트 운영 build: **통과** (`NEXT_FORCE_WORKER_THREADS=1 npm run build`).
- 선택적 브라우저 Web Crypto PKI 1개는 이번 실행의 테스트 CA/기기 fixture 미설정으로 건너뜀. 백엔드 PKI 회귀는 통과. 브라우저 PKI를 이번에 검증했다고 보고하지 않음.

## 요구 시나리오

| 항목 | 실제 확인 내용 | 결과 |
|---|---|---|
| 주소 검색→선택→주소/좌표/마커 | 실제 Kakao SDK localhost:3000, 서울시청 검색 5개 결과→세종대로 110, 37.566824/126.978652 | 통과 |
| 실제 마커 드래그 | 실제 마우스 드래그 후 37.559627/126.991308, 서울 중구 예장동 2-40로 주소 갱신 | 통과 |
| 실제 지도 클릭 | 실제 클릭 후 37.563799/126.955269, 서울특별시 서대문구 북아현로18길 26 주소 갱신 | 통과 |
| 역지오코딩 실패 | SDK fixture에서 ZERO_RESULT, 기본 주소 비움·수동 안내·수동 주소 후 좌표 유지 | 통과 (fixture) |
| 검색 경합/결과 없음 | SDK fixture에서 늦은 이전 응답 무시, 최대 6개, 빈 결과 안내 | 통과 (fixture) |
| 상세 위치·픽업 안내 | 실제 DB 등록/GET/계약 스냅샷 재조회, 지도 조작 후 유지 | 통과 |
| 공유 중단/재개 | A 브라우저 버튼, B 공개 목록이 6초 이내 제거/복원, owner 목록 유지 | 통과 |
| 삭제 | 실제 확인 모달 후 owner GET 404·목록 제거, 공개 GET 404, 종료 계약 조회 유지 | 통과 |
| 진행 중·미래 계약 삭제 | 실 브라우저 active 계약 409 안내, backend pending/future/active 각각 차단 | 통과 |
| 다른 사용자 삭제 | B DELETE가 404, 소유자 데이터 유지 | 통과 |
| 기존 계약·SSE | A/B 신청→승인→양측 동의→키 활성→잠금 요청→승인→변경. 제3자 private change 0, 중복 ID 없음, offline 재연결 | 통과 |
| 과거 OTA 보존 | 삭제 전 OTA 이력 생성→soft delete→권한 있는 owner history GET 유지 | 통과 (backend integration) |
| 개발 DB 오염 방지 | 기존 8개 테이블 row snapshot 동일, 전용 DB 모든 테스트 행 정리 확인 | 통과 |
| 모달 접근성 | 개발 모드에서 열린 상태 유지, 차단 이유 표시, 취소와 트리거 버튼 포커스 복원 | 통과 |

실제 Kakao SDK 확인은 개발 API를 모두 브라우저 fixture로 차단한 독립 세션에서 수행하여 개발 DB에 가입/등록/상태 변경을 보내지 않았습니다. 외부 Kakao 검색과 지오코딩은 실제 API입니다. 127.0.0.1:3100은 현재 Kakao 미등록 도메인이라 실제 DB live E2E는 수동 fallback을 사용했습니다. 지도 SDK 실패 상황에 임의 성공 응답을 사용해 live 데이터 테스트를 통과시키지 않았습니다.

## 개발 데이터 보존 근거

작업 전후 users/vehicles/rentals/ota/audit/grants/unlocks/challenges의 기존 행을 id순 정렬한 JSON으로 비교했습니다. 추가 nullable 스키마 컬럼만 비교에서 제외하고 기존 값·updated_at·대여 상태까지 포함했습니다.

두 스냅샷 SHA-256: `a1cd5ee6f8920ff58fc9efd06003f4c735f0de9e14c40aebaead6fb729506fd2` (동일).

전용 DB의 users/vehicles/rentals/ota/audit/grants/unlocks/challenges는 검증 종료 시 모두 0행. 정리 API가 이번 namespace만 삭제했으며 기존 개발 DB 데이터·권한은 수정하지 않았습니다.

환경 부정 검사: E2E_TOKEN 미설정 차단, localhost:3000→8080 개발 프록시를 대상으로 한 환경 attestation 차단, Gradle E2E_DB_URL을 mygarage로 지정했을 때 Tests blocked로 테스트 프로세스 시작 전 실패. 개발 DB로 fallback 없음.

## 직접 확인 경로

1. 기존 로그인 계정의 `/vehicles/register`에서 기본 주소 검색→선택→상세 위치/픽업 안내 입력→마커 이동→공개 등록.
2. `/owner` 카드에서 공유 중단/재개 및 삭제 버튼. 종료 전 계약이면 확인 모달에 이유 표시.
3. 다른 실제 계정 브라우저의 `/renter`에서 같은 차량의 목록/지도 제거·복원 확인. 실제 SDK를 테스트 서버3100에서 보고 싶으면 Kakao 웹 도메인 등록이 필요.
4. 대여 신청→A 승인→각 계정 동의→이용 시작/잠금 해제 요청→A 승인. 기존 계약 UI 흐름 유지.
5. 개발 DB에 새로운 수동 테스트 행을 남기지 않고 반복하려면 E2E_DATABASE_ISOLATION.md의 격리 환경을 사용.

## 남은 범위

- 기존 DB 테스트 행 정리 및 실제 사용자 요청 89·145 처리: 승인 전 미실행.
- 선택적 브라우저 PKI: 격리 환경용 CA/기기 인증서와 이메일 namespace 설정 후 별도 실행 필요.
- 수동으로 입력한 주소와 좌표의 실제 일치는 사용자가 확인해야 함.
- 삭제된 차량 OTA 이력은 owner 권한으로 기존 `/api/vehicles/{id}/ota/history`에서 보존·조회 가능. 삭제 차량만을 탐색하는 별도 보관함 UI는 이번 범위에 추가하지 않음.
- 이미지 LCP/eager 경고와 Next/Node worker 경고는 기존 경고이며 이번 검증 실패를 발생시키지 않음.

검증용 8083 백엔드는 종료했습니다. 개발 서버는 유지하고 생성한 전용 테스트 DB 자체는 보존했습니다.

Git commit/push/배포/개발 DB 초기화 및 기존 행 수정·삭제는 수행하지 않았습니다.
