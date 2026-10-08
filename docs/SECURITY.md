# 보안 경계와 오프라인 PKI

## 서버 인가

세션 인증·BCrypt·CSRF 및 세션 ID 회전을 유지한다. 모드/ownerId/renterId를 클라이언트가 선택해도 권한이 바뀌지 않는다. 차량 공유 설정, 승인/거절, 잠금, grant 회수/종료 및 OTA는 소유자만 수행한다. 대여 상세/계약은 당사자만, 원격 요청은 지정 대여자만 가능하다. 타인 차량과 대여는 404로 숨긴다.

기간·양측 동의·grant 미회수를 원격 요청 및 승인 시 모두 검사한다. 차량별 트랜잭션 잠금으로 검사-상태 변경 사이 경쟁을 차단한다. 승인 재처리는 DB 상태를 추가로 바꾸지 않는다. 활성 grant가 없으면 이미 승인된 요청 재호출도 거부한다.

SSE는 서버 Principal로 구독을 분리한다. 세션 종료/ID 회전 때 이전 구독을 닫는다. 캐시/이벤트는 권한의 근거가 아니며 REST가 최신 권한과 상태를 반환한다. 감사 테이블에는 성공한 공유/대여/동의/접근/잠금 전이를 기록한다. 거부 요청의 영속 감사와 사용자 감사 조회 API는 아직 없다.

## PKI 구현 범위

기본 `SHARING_PKI_REQUIRED=false`는 DB 권한만으로도 완전한 공유 흐름을 제공한다. PKI proof를 보내면 이 설정과 무관하게 검증한다. `true`는 모든 새 원격 요청과 미서명 요청 승인을 차단한다.

검증:

- 서버 설정의 단일 오프라인 테스트 CA trust anchor와 Java PKIX 인증서 경로
- CA/leaf 유효기간, CA/keyCertSign, leaf CA 아님, digitalSignature 및 clientAuth EKU
- RSA 2048비트 이상 키
- CA가 서명한 SAN email과 현재 사용자 이메일의 정확한 일치
- CA가 서명한 SAN URI `urn:my-garage:device:<deviceId>`와 요청 기기 ID의 일치
- SHA256withRSA 서명 및 개인키 보유 증명
- 계약/차량/사용자/nonce/만료 시각을 결합한 challenge, 2분 제한, 한 번 사용
- 현재 대여와 DB grant의 유효성/회수 여부
- 소유자 승인 시 저장된 공개 인증서·서명과 현재 grant를 다시 검증

기기 ID는 단순 브라우저 입력으로 신뢰하지 않으며 인증서 SAN에 CA가 서명한 값이어야 한다. CA의 이메일/기기 발급은 아래 로컬 fixture script로 수동 수행한다. 가입만으로 실제 신원이나 차량 소유권을 검증하지 않는다.

## 로컬 시연

저장소 루트에서, 실제로 가입한 대여자 이메일을 사용한다.

```sh
sh scripts/create-test-device.sh .local/pki renter@example.com browser-device
```

OpenSSL 3.x가 필요하다. CA와 RSA PKCS#8 개인키는 `.local`에만 생성하며 Git에서 제외한다. 기존 기기 파일을 덮어쓰지 않는다. 같은 출력 디렉터리로 다른 기기 ID를 생성하면 같은 테스트 CA를 사용한다. 테스트 CA 개인키는 외부 제공하거나 커밋하지 않는다.

백엔드를 실행할 때 공개 CA 인증서만 지정한다:

```sh
cd backend
SHARING_PKI_TRUSTED_CA=file:/ABSOLUTE/PATH/my-garage/.local/pki/ca.pem \
SHARING_PKI_REQUIRED=true ./gradlew bootRun
```

대여 활성 후 B의 카드에서 '테스트 인증서로 서명된 잠금 해제 요청'을 펼친다. 기기 ID `browser-device`, `browser-device-cert.pem`, `browser-device-key.pem`을 선택하고 서명 요청한다. 개인키 파일은 로컬에서 Web Crypto로 `extractable=false` import하며 서버 전송/브라우저 저장소 저장을 하지 않는다. HTTPS/localhost secure context가 필요하다. 서버에는 공개 인증서와 서명만 전송한다.

## 시뮬레이션 한계

CA 발급은 운영 CA 서비스가 아니며 CRL/OCSP와 인증서 등록/회전/폐기 관리는 없다. 단일 leaf → CA 경로만 지원한다. grant 회수는 인증서 폐기와 별개로 즉시 제어를 차단한다. 브라우저 메모리 키는 하드웨어/OS 키 저장소나 secure enclave가 아니며 XSS/확장 프로그램으로부터 상용 수준 보호를 보장하지 않는다. 파일은 교육용 fixture 개인키이며 실제 사용자·차량 키로 사용하지 않는다.

서버는 사용자 개인키를 발급·반환하거나 저장하지 않는다. 입력한 개인키 PEM은 파일 import 과정에서 브라우저 메모리를 거친다. 이 제한과 로컬 테스트 키 파일의 존재를 명시한다. 실제 OEM 인증서, 제조사 차량 API, 상용 KMS는 사용하지 않는다.

## OTA 유지

기존 SHA-256 무결성, Ed25519 패키지 서명, 배포자/호환성/롤백 검증 및 이력을 유지한다. OTA의 공개 교육용 publisher/attacker key fixture는 접근 키와 혼용하지 않는다. fixture의 상세 경계는 `backend/src/main/resources/ota/simulation/README.md`를 따른다. 보안 OFF는 실제 검증/설치 성공이 아닌 비교 시뮬레이션이다.
