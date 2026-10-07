# Frontend regression tests

공통 구조 리뷰 기준은 저장소의 `docs/CODE_QUALITY_CHECKLIST.md`를 사용합니다.
이 디렉터리는 그 기준 중 자동으로 재현 가능한 동작을 검사합니다.

## 실행

- `npm test`: 도메인 테스트 → production build → 브라우저 회귀 테스트
- `npm run test:unit`: validation, mock operations, persistence, workflow reducer
- `npm run test:e2e`: 이미 빌드된 페이지의 브라우저 회귀 테스트
- `npx tsc --noEmit`, `npm run lint`: 정적 검사

Node 20 이상과 설치된 Google Chrome이 필요합니다. Playwright는 별도
브라우저 프로필과 `127.0.0.1:3100`의 production 서버를 사용합니다.
각 테스트의 저장소는 격리되어 기존 개발 브라우저의 데모 데이터를 바꾸지 않습니다.

## 유지할 핵심 흐름

| 흐름 | 기대 결과 |
| --- | --- |
| 조회 중 이동 → 뒤로 가기 | 코드 유지, pending 해제, 재조회 가능 |
| 발급 중 이동 → 뒤로 가기 | 확인 코드 유지, 미등록, 재연결 가능 |
| 인증서 발급 실패 | 등록되지 않음, 재시도 버튼 제공 |
| 정상 연결 → 차고지 | 등록 차량 표시, 새로고침 후 유지 |
| 잘못된 가입/로그인 입력 | 오류와 focus 제공, 진행 차단 |

브라우저 테스트는 내부 state 대신 화면과 실제 navigation 결과를 검사합니다.
취소 테스트에서는 브라우저 clock으로 요청을 진행 중에 고정해 타이밍 경쟁을 줄입니다.
