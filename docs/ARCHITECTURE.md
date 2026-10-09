# 아키텍처

## 구성

```text
Next.js App Router
  auth + TanStack Query + Axios (masked CSRF token)
  sharing: owner/renter dashboards, map, contracts, grants, unlocks
  API rewrites → Spring Boot REST
  explicit SSE Route Handler → Spring SSE (identity/no-transform)

Spring Security → Controllers → transactional SharingService
  Vehicle/User/OTA 재사용
  Rental / DigitalAccessGrant / RemoteUnlockRequest / UnlockChallenge
  PostgreSQL / SecurityAuditLog
  after-commit domain change → per-user SseEmitter
```

Frontend는 기존 `app`, `components`, `features`, `lib`, `services` 구조를 유지한다. 신규 공유 도메인은 `features/sharing`에 두며 불필요한 Zustand나 지도 npm 의존성을 추가하지 않는다. 지도 SDK는 브라우저에서 키가 있을 때 로드한다. 도메인 작업은 Axios API 모듈로, 서버 상태는 Query로 관리한다. 선택 차량·모드는 컴포넌트/URL 상태이다.

Backend의 `sharing` 도메인은 대여/계약/접근/가상 잠금 전이를 트랜잭션으로 처리한다. `sharing/pki`는 테스트 인증서 신뢰 검증과 일회용 서명 챌린지를 담당한다. OTA 키와 접근 키는 별도 목적·구조로 유지한다.

## 동시성

동일 차량의 공유 설정·신청·승인·동의·원격 처리·회수는 `VehicleRepository.lockById`의 `PESSIMISTIC_WRITE`로 직렬화한다. 승인 직전에 같은 차량의 예약과 겹침을 재검사한다. 지연 로딩 엔티티는 getter로 접근하고 잠금 후 refresh하여 오래된 영속성 컨텍스트 상태를 사용하지 않는다. 목록 조회는 차량 ID 오름차순으로 잠금을 잡아 교착 위험을 줄인다.

시간 전이는 서버의 Clock으로 조회/작업 시 확정한다. UI의 15초 조회로 시각 경계를 반영하며 grant 검증 자체는 매 요청 시 현재 시각을 사용하므로 조회가 누락되어도 제어가 허용되지 않는다. 백그라운드 스케줄러는 없다.

## SSE

DB 커밋 후 당사자 이메일 집합으로 `change` 이벤트를 전달한다. 구독은 인증 Principal로 등록하며 외부 userId 인자는 받지 않는다. 55초마다 연결을 종료하고 EventSource가 재연결한다. 완료/오류/타임아웃/세션 종료·ID 회전 시 구독을 제거한다.

Next Route Handler는 쿠키를 서버에 전달하고 body를 스트리밍한다. 압축/버퍼링을 피하기 위해 `Accept-Encoding: identity`, `Cache-Control: no-cache, no-transform` 및 `X-Accel-Buffering: no`를 사용한다. 브라우저 취소 시 upstream fetch/reader를 정리하고 연결 종료는 EOF로 전달하여 EventSource가 복구한다. 다른 API는 기존 rewrite를 유지한다.

이벤트는 데이터 변경의 힌트이며 영속 큐나 재생 로그가 아니다. 연결 `ready`와 재연결·온라인 복구 시 Query를 무효화하고 REST로 복원한다. 중복 이벤트는 재조회만 반복한다. 단일 인스턴스용이며 다중 서버 pub/sub는 향후 범위다.
