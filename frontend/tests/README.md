# Frontend 검증

```sh
npx tsc --noEmit
npm run lint
npm run test:unit
npm run build
npm run test:e2e
RUN_LIVE_SHARING=1 npm run test:e2e -- sharing-live.spec.ts
```

production 서버는 127.0.0.1:3100에 별도로 실행한다. Chrome 설치가 필요하다. 일반 e2e는 기존 목업 연결 흐름과 API 오류/인증 복원/OTA UI를 route fixture로 검증한다. 로그인 fixture는 새 `/mode` 전환을 확인한 뒤 보존된 `/garage` 회귀를 수행한다.

`sharing-live.spec.ts`는 환경 flag가 없으면 명시적으로 skip한다. flag가 있으면 실행 중인 실제 Spring/PostgreSQL 서버에 가입·로그인하고 세 개의 독립 브라우저 세션으로 공유, 계약, grant, SSE, 잠금 해제, 회수, OTA 소유권, 새로고침 복원을 검증한다. API를 가로채지 않는다. 고유 이메일/차량/계약을 생성해 DB에 남긴다. 완료한 테스트 차량은 공유를 비활성화한다. 실패 시 그 시연 데이터는 남을 수 있으며 기존 데이터를 지우지 않는다.

백엔드 전체 검증과 실제 결과는 `docs/VALIDATION.md`를 참고한다. 제한 환경에서 빌드가 포트 제한에 막히면 README의 worker 옵션을 사용할 수 있다.


`sharing-pki-live.spec.ts`는 `RUN_LIVE_PKI=1`, `PKI_TEST_EMAIL`, `PKI_FIXTURE_DIR`로 켭니다.
해당 이메일과 browser-device 인증서를 `scripts/create-test-device.sh`로 먼저 만들고, 동일 CA의 공개 인증서를 설정한 PKI 필수 백엔드를 사용해야 합니다.
REST rewrite에 사용하는 BACKEND_URL로 build한 뒤 같은 BACKEND_URL로 test:e2e를 실행합니다.
테스트는 Web Crypto 실제 서명, 잘못된 기기 ID, replay 차단 및 모바일 overflow를 검사합니다.
검증을 위해 잠시 다른 backend 포트로 build했다면 최종 일반 실행용으로 기본 BACKEND_URL로 다시 build하세요.
