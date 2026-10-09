# 실제 DB 차량·계약·SSE 연동 결과

## 1. 데이터 출처 및 원인 조사

| 경로 | 데이터 출처 | 저장/상태 변경 |
|---|---|---|
| `/owner` | Axios → Next `/api` rewrite → Spring `GET /api/vehicles` → PostgreSQL | 로그인 계정의 소유 차량 전체 |
| `/renter` 목록/마커 | `GET /api/vehicles/available` → PostgreSQL | 타인 소유 공개 차량, 같은 배열로 목록과 마커 렌더링 |
| `/vehicles/register` 기본 폼 | `POST /api/vehicles` → PostgreSQL | 실제 차량 등록 |
| 등록 화면의 별도 소유권·인증서 체험 | `mocks/vehicle-registration`, 브라우저 데모 상태 | DB 저장 없음, 화면에 별도 데모라고 명시 |
| `/demo` | `features/sharing/demo/state.ts` 정적 예시 | 화면 안 상태만 변경 |
| `/demo/garage` | 기존 `mocks/garage` | 이전 차고지 예시 |

MSW는 설치/실행하지 않습니다. 개발의 기본 소유자/대여자 경로는 실제 API입니다. 브라우저 회귀용 route fixture는 테스트 코드에서만 사용합니다. 실행 시 DB 자동 시드를 만드는 코드는 없습니다. 과거 실제 통합 테스트로 생성되어 DB에 남은 예시 이름의 차량도 실제 DB 행입니다.

수정 전 직접 SQL 조회에서는 차량 9대(공개 3, 비공개 6)가 저장되어 있었습니다. 기존 소유자 API는 이미 소유권으로 조회했고 실제 등록 후 해당 계정 쿼리 무효화도 있었습니다. 따라서 특정 사용자의 "DB 등록이 성공했는데 소유자 목록에서만 빠진다"는 현상은 현재 환경에서 재현되지 않았으며, 개별 클릭 기록 없이 그 원인을 단정하지 않습니다.

확인된 혼동/갱신 문제는 다음과 같습니다.

- 소유권·인증서 데모는 DB에 등록하지 않지만 "차량 연결 완료"라고 표시하므로 실제 등록과 혼동할 여지가 있었습니다. 기본 등록은 실제 API이며 별도 데모에는 DB 미저장을 명시합니다.
- 기존 등록 요청에는 픽업/공유 설정이 없어 무조건 기본 비공개로 등록되었습니다. 따라서 대여자 공개 목록에 바로 나타나지 않았습니다.
- 실제 등록 성공의 버튼은 기존 `/garage` 위주여서 새 소유자 화면 진입이 덜 명확했습니다.
- 기존 SSE는 대여 당사자의 상태 변경만 알렸고, 차량 생성/공개 변경으로 다른 사용자의 공개 목록을 갱신하는 이벤트가 없었습니다.
- 공개 가능 여부는 공유 여부만 표시했으며 선택 기간과 기존 승인 예약을 비교하지 않았습니다.

## 2. 변경 결과

차량 등록은 제조사 → 해당 차종 종속 선택, 연식, 차량 번호, 픽업 위치 선택/직접 입력, 좌표 및 공유 여부를 제공합니다. 드롭다운 목록은 입력 추천이며 차량 데이터가 아닙니다. 기존 네 필드 요청도 그대로 허용됩니다. 선택적인 `sharing` 객체를 차량과 한 트랜잭션에서 저장하여 부분 등록을 피합니다. 성공 후 내 차량 관리 `/owner`로 연결하고 소유자·공개 목록 캐시를 무효화합니다.

공개 조회에서 본인과 비공개 차량을 SQL 조건으로 제외합니다. 추가 공개 상세 엔드포인트도 같은 경계를 강제하고 차량 번호와 소유자 이메일을 반환하지 않습니다. 기간별 예약 조회는 계약 대기/확정/활성 예약과 본인의 대기 신청의 겹침을 비교하고 경계가 맞닿는 기간은 허용합니다. 실제 신청·승인은 기존 차량별 DB 행 잠금과 충돌 검사를 유지합니다.

기존 Rental/Grant 엔티티와 계약 API를 재사용합니다. `REQUESTED → CONTRACT_PENDING → CONFIRMED → ACTIVE → COMPLETED`이며 양측 동의 전에는 grant가 없습니다. 미래 계약은 CONFIRMED/접근 비활성 상태이고 서버 시간에 유효한 기간에만 접근을 허용합니다. 승인 후 계약 조건을 자동 펼치고, 모의 계약 표시, 계약 버전, 소유자/대여자 ID와 동의 시각, 양측 동의 완료 표시를 제공합니다.

SSE는 커밋 후 전달합니다. 개인 대여 `change`, 소유자 차량 `vehicles`, 개인정보가 없는 공개 목록 `inventory`를 구분합니다. 클라이언트는 이벤트 ID 중복 제거, 50ms 조회 묶음, 초기 조회 취소 후 재조회, 재연결 ready 시 REST 복구를 적용합니다. 실시간 알림을 화면에도 표시합니다.

최초 데이터 통합 검증 당시 지도 키가 비어 있어 좌표 개요로 검증했습니다. 후속 Kakao 지도 변경에서는 사용자 설정 JavaScript 키로 실제 SDK와 도로 타일, 차량 마커를 `localhost:3000` Chrome에서 확인했습니다. 실제 대여자 목록과 지도는 동일한 API 차량 데이터를 사용하고, 데모는 명확하게 표시된 예시 데이터만 사용합니다. 차량 등록과 소유자 설정에서는 지도 클릭으로 좌표를 지정하며, 위치 설명은 직접 입력합니다. 차량 사진은 기존 직접 작성한 ServiceIcon 기반 기본 플레이스홀더입니다.

## 3. 주요 변경 파일

- 백엔드: vehicle/VehicleService.java, VehicleRepository.java, dto/VehicleRequest.java; sharing/SharingController.java, SharingService.java, SharingDtos.java, RentalRepository.java, NotificationService.java.
- 프런트: vehicle-registration/catalog.ts, components/server-registration.tsx, app/vehicles/register/page.tsx; sharing/api.ts, types.ts, use-sharing-events.ts; components/owner-dashboard.tsx, owner-vehicle-card.tsx, renter-dashboard.tsx, rental-form.tsx, rental-card.tsx, sharing-shell.tsx, pickup-map.tsx, pickup-overview.tsx, vehicle-placeholder.tsx; services/types.ts, app/globals.css, auth/components/session-boundary.tsx.
- 테스트: SharingIntegrationTests.java; sharing-data-live.spec.ts, sharing-live.spec.ts, api-fixture.ts, api-integration.spec.ts.

## 4. 직접 브라우저 확인

1. PostgreSQL과 Spring Boot 8080, Next 개발 서버 3000을 실행합니다. `/demo`가 아닌 `/login`에서 실제 계정을 사용합니다.
2. 일반 창 A와 시크릿 창/별도 브라우저 B를 사용해 각각 다른 계정으로 로그인합니다. B는 `/renter`에서 실시간 연결됨을 확인합니다.
3. A의 `/owner` → 차량 등록에서 제조사/모델/연식/번호를 입력하고 픽업 위치를 선택합니다. "등록 후 공개 목록에 차량 공유"를 체크하고 등록합니다.
4. A의 내 차량과 B의 공개 목록/픽업 마커에 같은 차량이 보이는지 확인합니다. A가 대여자 모드로 바꾸면 자신의 차량은 나타나지 않습니다.
5. B가 대여 기간을 조회하고 신청합니다. A의 새 대여 요청 알림과 카드에서 승인합니다.
6. 두 당사자가 각각 자동 펼쳐진 계약 조건에 동의합니다. 양측 동의 완료 표시와 접근 상태를 확인합니다. 미래 시작이라면 대여 시작 대기이며 잠금 해제는 차단됩니다. 즉시 흐름 확인에는 시작을 현재 분으로 입력하고, 60초가 지나기 전에 신청합니다.
7. B가 잠금 해제를 요청하고 A가 승인합니다. 두 화면의 UNLOCKED 반영을 확인합니다. 회수/종료하면 권한이 차단되고 가상 차량은 잠깁니다.
8. A가 공유를 비활성화하면 B 목록·마커에서 사라지고 공개 상세/신청도 서버에서 차단됩니다. A의 내 차량에는 계속 보입니다.

## 5. 남은 범위

- MSW 데모는 미구현이며 기존 독립 데모를 유지합니다.
- 다른 hostname/port의 지도는 Kakao 웹 도메인 등록이 필요합니다. `127.0.0.1:3100` 테스트 주소에서는 SDK 요청이 차단되며 실제 지도 검증은 허용된 `localhost:3000`에서 수행했습니다. 주소 검색/역지오코딩은 미구현입니다.
- 제조사/차종은 입력 추천 카탈로그이며 외부 차량 DB, 차량 번호 검증, 실제 소유권 인증, 주소 검색/지오코딩은 연동하지 않았습니다.
- SSE 이벤트는 영구 보관/재생하지 않습니다. 연결 중 놓친 이벤트는 재연결 REST 조회와 주기 재조회로 복구합니다. 현재는 단일 서버의 메모리 구독 관리입니다.
- 예약 가능 조회는 순간 정보이며 최종 충돌 검사는 신청·승인에서 수행합니다. 기간 경계 전이는 REST 조회/동작 때 반영하며 별도 백그라운드 스케줄러는 없습니다.
- 법적 전자서명, 실제 차량 제어·결제·보험은 제공하지 않습니다.
- 테스트 고유 계정·차량·계약은 DB에 남습니다. DB 초기화/기존 데이터 삭제 및 Git commit/push/배포는 하지 않았습니다.

## 6. 검증 결과

백엔드 46개, 프런트 단위 8개, 기본 브라우저 회귀 18개와 별도 실제 PKI 브라우저 1개가 통과했습니다. 최종 스타일/계정별 알림 조정 후 실제 공유·데모 4개도 재검증했습니다. 타입·lint·기본 8080 연결 빌드가 통과했고 3000 개발 서버에서도 실제 소유 차량과 등록 폼을 확인했습니다. 최신 A/B 증거는 차량 157/계약 123의 실제 이벤트 프레임과 스크린샷이며 PostgreSQL에서 동일 행과 양측 동의 시각을 직접 조회했습니다. 상세 실행/실패 후 수정 기록은 VALIDATION.md를 참고합니다.
