# My Garage frontend

Next.js App Router + strict TypeScript + Axios + TanStack Query. 설치/전체 시연은 루트 README를 따른다.

- `/mode`: 로그인 후 이용 모드 선택
- `/owner`: 소유 차량 공유 설정, 신청/원격 승인, 계약/접근 회수, OTA
- `/renter`: 공개 픽업 검색/지도/목록, 대여 신청, 계약/가상 원격 접근
- `/vehicles/register`: 기존 실제 차량 등록 API
- `/garage`: 기존 소유 차량/OTA 화면 보존
- `/demo`, `/demo/garage`: 사용자 요청으로 제거 (404). 실제 로그인 및 API 기반 차량 등록만 제공한다.

`features/sharing`에 타입/API/실시간 hook 및 도메인 컴포넌트를 둔다. 서버 상태는 Query, 입력/선택은 지역 state/URL로 관리한다. `.env.example`을 참고한다. 지도 키가 없어도 공유 목록과 신청은 동작한다. Kakao SDK 실지도는 키/도메인 등록 후 사용할 수 있다.

REST는 Next rewrite, SSE는 `app/api/notifications/stream/route.ts` 스트리밍 프록시를 사용한다. 서버 신원을 나타내는 쿠키를 전달하고 SSE 압축/버퍼링을 차단한다. EventSource 재연결 후 REST로 복원하며 대여 상태는 서버가 결정한다.

PKI 서명 폼은 로컬 테스트 키만 지원한다. 설정과 한계는 `docs/SECURITY.md`에 있다. typecheck/lint/build와 브라우저/실제 API 시나리오는 `tests/README.md`를 참고한다.
