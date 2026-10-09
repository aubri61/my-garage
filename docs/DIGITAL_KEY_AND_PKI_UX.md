# 디지털 접근 권한과 PKI UX 조사 (2026-10-10)

## 현재 구현 범위

| 기능 | 실제 구현 |
| --- | --- |
| 디지털 키 발급 | 양측 계약 동의 시 `DigitalAccessGrant` DB 행 생성. X.509 인증서나 기기 키를 발급하는 동작이 아님 |
| 권한 활성 | 실제 대여 기간 및 ACTIVE 계약 상태, 회수 여부로 서버가 계산 |
| 일반 문 열기 요청 | `POST /api/rentals/{id}/unlock-requests`, 세션·CSRF·대여자·활성 권한·중복 요청 검사. PKI 필수 설정에서는 서명 없는 요청 거절 |
| 기기 등록·인증서 발급 | 일반 사용자용 API/등록 레지스트리/브라우저 키 생성 및 자동 서명 없음. `scripts/create-test-device.sh`의 오프라인 테스트 CA·기기 fixture만 존재 |
| 챌린지 | `POST /api/rentals/{id}/unlock-challenges`: 활성 권한과 대여자 검사, 32바이트 nonce, 120초 만료, 대여/회원/차량/nonce/만료 시각에 바인딩된 payload. 유효 미사용 챌린지 재사용 조회, 성공한 서명 요청에서 소비 |
| 챌린지 서명 | 기존 `SignedUnlockForm`에서 로컬 PKCS#8 RSA 키를 Web Crypto에 비추출 키로 import, SHA-256/RSA 서명. HTTP에는 challengeId·공개 certificatePem·signatureBase64·deviceId만 전송 |
| PKI 검증 | `PkiVerifier`: 설정한 공개 CA로 PKIX 검증, CA/leaf 유효기간·용도·RSA 2048+·digitalSignature/clientAuth·이메일 SAN·device URI SAN·payload 서명 검사. DB 기기 등록 조회는 없음 |
| 소유자 승인 | `POST /api/unlock-requests/{id}/approve`: 소유권·현재 활성 권한 재확인, 서명된 요청이면 인증서와 서명 재검증 후 DB 가상 UNLOCKED 설정. 실제 차량 명령 없음 |
| 회수·종료 | 권한 회수/기간 종료 시 대기 요청 취소/만료 및 가상 잠금. 기존 차량 DB 잠금·커밋 후 SSE 힌트·REST 재조회 유지 |

챌린지 만료·소비 여부는 요청 접수 시 검사한다. 승인 시에는 활성 권한과 PKI 인증서/서명을 다시 검증한다. 오프라인 PKI 검증에 CRL/OCSP는 없으며, 계약 접근 권한 회수는 별도로 검사한다. 인증서의 기기 SAN 일치가 일반 사용자 기기 등록 완료를 뜻하지 않는다.

근거: `backend/.../sharing/SharingController.java`, `SharingService.java`, `DigitalAccessGrant.java`, `sharing/pki/{PkiVerifier,UnlockChallenge}.java`, `frontend/features/sharing/components/signed-unlock-form.tsx`. 공개 인증서·서명·챌린지 ID는 기존 요청 기록에 보관되지만 개인키는 API/DB/브라우저 저장소에 저장하지 않는다.

## 적용한 화면 분리

- 계약/디지털 키/예약 화면: 디지털 접근 권한 상태 → 문 열기 요청 → 소유자 승인 대기 → 가상 차량 잠금 해제. PEM 및 개인키 파일 입력 없음.
- `pkiRequired=false`: 기존 세션 기반 문 열기 요청 사용. PKI 인증/기기 등록 완료라는 표현을 사용하지 않음.
- `pkiRequired=true`: 일반 요청 버튼 비활성, 일반 기기 등록·자동 서명 미구현 안내. 필수 정책을 낮추거나 우회하지 않음.
- `/security-lab`: 본인이 대여자인 실제 접근 권한 발급 계약만 선택. 기존 로컬 테스트 서명 폼과 챌린지·PKI API 재사용. 권한 비활성/승인 대기 중에는 요청 비활성. 디지털 키 화면과 PKI 필수 안내에서 접근 가능.
- 기존 소프트웨어 보안 `/security`와 OTA 실험실은 별도 목적이므로 유지.

## 일반 사용자 자동 서명을 위해 필요한 설계 (이번 작업 미구현)

1. 로그인·CSRF 보호 하에 공개키와 소유 증명을 등록하는 기기 등록/해제 API, 회원·기기·공개키 바인딩과 회수 정책을 정의한다. 클라이언트가 지정한 deviceId와 SAN만으로 등록을 대체하지 않는다.
2. 브라우저에서 비추출 키를 생성하고 메모리에서만 유지한다. 서버에는 공개키/CSR와 등록 챌린지 서명만 전송한다. 새로고침/탭 종료로 키를 잃으면 재등록이 필요함을 명시한다. 영구 개인키 저장을 추가하지 않는다.
3. 공개 인증서 발급과 신뢰 체계·유효기간·재등록/회수 정책을 정한다. 오프라인 테스트 CA를 제품용 자동 발급처럼 연결하지 않는다. 서버/API에 CA 또는 기기 개인키를 전달하지 않는다.
4. 활성 계약과 등록 기기의 일회용 챌린지를 자동 서명하고, 현재 서버의 권한/소유자 승인 검사를 그대로 유지한다. UX는 등록 필요·검증 중·실패·승인 대기·가상 해제를 구분한다.

이 설계는 새로운 기기 수명주기와 보안 정책을 필요로 하므로 이번에는 API/DB 변경이나 자동 인증 구현을 하지 않았다.
