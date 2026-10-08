# My Garage

**신뢰할 수 있는 차량 원격 공유 플랫폼 — Trusted P2P Vehicle Sharing Platform**

개인 소유 차량의 공유, 대여 신청, 양측 계약 동의, 디지털 접근 권한 및 소유자 승인 기반 가상 잠금 해제를 연결하는 학습·포트폴리오 프로젝트입니다. 한 사용자가 소유자와 대여자로 모두 참여할 수 있습니다. 실제 차량 제어, 결제, 보험, 면허 검증, 법적 전자서명은 제공하지 않습니다.

## 구현

- 세션 인증, BCrypt, CSRF, 새로고침 후 인증 복원
- 모드 선택 → 대여자 검색/신청 → 소유자 승인 → 계약 조건 양측 동의
- 공개 픽업 위치 및 선택적 Kakao 지도 SDK; 키 없이도 목록/신청 가능
- 차량별 PostgreSQL 비관적 잠금으로 승인 경쟁 및 중복 예약 방지
- 기간 제한 DB 접근 권한, 가상 잠금 해제 요청/승인/거절, 권한 회수/대여 종료
- 사용자별 SSE, 커밋 이후 이벤트, Query 무효화 및 REST 복원
- 선택적 오프라인 X.509 PKI: CA 경로, 기간, 용도, 사용자/기기 SAN, RSA 요청 서명, 일회용 챌린지
- 기존 소유자 전용 OTA Security Lab: SHA-256, Ed25519, 7개 시나리오 및 이력

## 실행

Java 21, Node 22 LTS 권장, Docker/PostgreSQL 17, 설치된 frontend dependencies가 필요합니다.

```sh
# 기존 볼륨을 보존합니다. down -v 또는 데이터 초기화를 하지 마세요.
docker compose up -d postgres
cd backend
./gradlew bootRun
```

별도 터미널:

```sh
cd frontend
npm ci
npm run dev
```

[localhost:3000](http://localhost:3000)에서 회원가입/로그인하면 `/mode`로 이동합니다. 백엔드는 기본 8080, PostgreSQL은 15432 포트입니다. DB 계정은 `DB_USERNAME`, `DB_PASSWORD`로 변경할 수 있습니다. 기존 `ddl-auto=update`를 유지하며 공유 필드와 신규 테이블만 추가합니다. 기존 데이터 삭제 작업은 없습니다.

`frontend/.env.local` 설정 예시는 [frontend/.env.example](frontend/.env.example)에 있습니다. `BACKEND_URL`은 REST rewrite 빌드 시와 SSE 실행 시 동일하게 설정해야 합니다. 지도 키는 직접 발급하고 허용 웹 도메인을 등록하세요. [Kakao 공식 문서](https://apis.map.kakao.com/web/documentation/)를 참고하세요. 위치는 등록한 공개 픽업 좌표이며 GPS가 아닙니다.

## 두 사용자 시연

서로 다른 Chrome 프로필/시크릿 창에서 A와 B 계정을 만듭니다.

1. A: 차량 빌려주기 → 차량 등록 → 공유 설정하기 → 공개 픽업 위치/좌표와 공유 공개 저장.
2. B: 차량 빌리기 → 차종/위치 검색 → 차량 선택 → 현재 분 또는 미래 시작 시각과 종료 시각으로 신청.
3. A: 대여 승인 → 계약 조건 펼치기 → 동의. B도 같은 조건에 동의.
4. 시작 시각 이후 서버가 `ACTIVE`와 접근 권한 활성 여부를 반환합니다. 화면은 15초마다 서버와 동기화합니다.
5. B: 잠금 해제 요청. A: 잠금 해제 승인. 양쪽에 `UNLOCKED` 표시.
6. A: 접근 권한 회수 → `LOCKED`, B 추가 요청 차단 → 대여 종료.
7. A: OTA Security Lab에서 정상/변조/보호 OFF 검증과 이력 확인. B는 같은 차량 OTA API에 접근할 수 없습니다.

PKI 시연 설정과 로컬 키 취급은 [보안 문서](docs/SECURITY.md)에 있습니다. 기본 모드는 DB 권한만으로 동작하고, `SHARING_PKI_REQUIRED=true`에서는 서명된 요청이 필수입니다.

## 검증 및 문서

```sh
cd backend
./gradlew test
cd ../frontend
npx tsc --noEmit
npm run lint
npm run test:unit
npm run build
npm run test:e2e
# 실제 backend가 실행 중일 때: 실제 DB에 고유 시연 계정/차량을 생성합니다.
RUN_LIVE_SHARING=1 npm run test:e2e -- sharing-live.spec.ts
```

제한된 실행 환경에서 Node 24.13.1 이상은 Turbopack CSS 작업자의 포트 제한과 충돌할 수 있습니다. 이번 환경에서는 `NEXT_FORCE_WORKER_THREADS=1 npm run build`로 검증합니다. 기본 설정은 강제하지 않습니다. 지원 LTS 버전 사용을 권장하며 강제 옵션에는 Next가 경고하는 native worker 종료 위험이 있습니다.

- [요구사항](docs/REQUIREMENTS.md), [사용 흐름](docs/USER_FLOWS.md)
- [구조](docs/ARCHITECTURE.md), [API](docs/API.md), [데이터 모델](docs/DATA_MODEL.md)
- [보안](docs/SECURITY.md), [디자인](docs/DESIGN.md)
- [구현 상태와 한계](docs/IMPLEMENTATION_PLAN.md), [검증 기록](docs/VALIDATION.md)

`/garage`는 기존 소유 차량/OTA 화면을 보존한 경로입니다. `/demo`는 새 차량 공유 흐름을 로그인 없이 체험하는 분리된 화면입니다. 이전 차고지 목업은 `/demo/garage`에 보존합니다. 데모와 기존 연결 체험은 실제 서버 상태를 변경하지 않습니다. 충전 기능은 이전 체험 코드만 보존하고 현재 서비스 범위에서 제외합니다. Git commit/push/배포는 하지 않았습니다.
