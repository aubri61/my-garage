# 픽업·공유·삭제와 E2E 격리 변경 보고 (2026-10-09)

## 픽업 위치

고정 프리셋 드롭다운을 제거하고 기존 Kakao Places + Geocoder 검색을 재사용했습니다. 450ms debounce, 늦은 응답 무시, 최대 6개 결과는 유지합니다. 기본 주소 바로 아래 결과의 장소명·도로명/지번 주소를 표시합니다. 선택하면 기본 주소·위도·경도·실제 Kakao 드래그 마커를 갱신합니다.

지도 클릭·마커 dragend·수동 좌표 입력 완료 시 기본 주소를 비우고 역지오코딩합니다. 성공하면 해당 좌표 주소로 갱신합니다. 실패/결과 없음이면 주소를 만들어 내지 않고 수동 입력을 안내하며, 수동 주소 입력은 선택한 좌표를 유지합니다. 다시 검색하려면 ‘주소 검색으로 다시 선택’을 누릅니다. 상세 위치와 안내는 지도 조작과 독립적으로 유지합니다. 검색 또는 좌표 입력 중에는 완전한 주소·좌표가 없어서 저장 검증에서 차단됩니다. 수동 주소가 실제 좌표와 일치하는지는 사용자의 확인이 필요합니다.

## 저장과 호환성

- `vehicles.pickup_location`은 기존 기본 주소 그대로 유지.
- `vehicles.pickup_detail varchar(200)`, `pickup_instructions varchar(500)`, `deleted_at timestamp`는 nullable 추가.
- 대여 신청 시 `rentals.pickup_location/pickup_detail/pickup_instructions`에 스냅샷을 저장. 차량 정보 변경으로 이미 체결 중인 계약 픽업 정보가 바뀌지 않습니다.
- 구형 요청 DTO의 4인자 생성자·기존 JSON 필드를 유지하고 신규 필드는 선택 입력. 기존 계약의 신규 상세 필드는 NULL이며 소급 작성하지 않습니다.
- `backend/src/main/resources/db/migrations/20261009_pickup_soft_delete.sql`은 ADD COLUMN IF NOT EXISTS만 수행합니다. UPDATE/DELETE/초기화 없음. 현재 프로젝트는 Flyway를 사용하지 않으며 로컬 `ddl-auto=update` 또는 해당 SQL의 명시 적용을 사용합니다.

## 공유와 삭제 정책

`PATCH /api/vehicles/{id}/sharing {enabled}`로 공유 중단/재개. 중단해도 소유자 목록과 기존 요청·계약·접근 권한은 유지되며 신규 신청만 차단합니다. 기존 요청의 소유자 승인도 가능합니다. 재개 시 주소와 유효한 좌표 및 삭제 여부를 서버에서 확인합니다. 기존 PUT 전체 공유 설정 API도 유지합니다.

`DELETE /api/vehicles/{id}`는 소유자 권한 확인과 차량 비관적 잠금을 수행합니다. 종료 시각이 미래이고 REQUESTED/CONTRACT_PENDING/CONFIRMED/ACTIVE이면 409 VEHICLE_IN_USE. 요청까지 차단해 삭제된 차량의 미처리 신청이 남지 않도록 했습니다. 거절하거나 정상 대여 종료 후 삭제할 수 있습니다. 실제 행 삭제가 아닌 deleted_at 설정과 sharing_enabled=false. 공개 목록/지도/상세와 현재 소유자 목록에서 제외됩니다. 역사적 계약과 OTA 이력 GET은 원래 차량 FK를 유지하여 조회 가능하며 삭제 차량의 신규 OTA 검증은 차단합니다. 비소유자는 404. 브라우저 기본 모달로 확인하고 서버 차단 사유를 표시합니다. 트랜잭션 커밋 이후 기존 vehicles/inventory SSE와 Query 캐시 갱신을 사용합니다.

## 개발 DB 읽기 전용 조사

현재 23개 차량, 67개 계정, 30개 대여, 18개 접근 권한, 18개 잠금 해제 요청, 2개 PKI 챌린지, 14개 OTA 이력, 206개 감사 로그. 이전 19개 차량 보고 이후 기존 E2E 실행이 4대를 더 생성한 상태입니다. 이번 테스트는 새 전용 DB에서만 실행했습니다.

LIVE-* 모델 12대는 sharing-live.spec.ts의 `LIVE-${suffix}` 직접 POST입니다. LIVE-PICKUP-* 주소 7대는 sharing-data-live.spec.ts의 등록 UI 입력입니다. PKI Browser 2대는 sharing-pki-live.spec.ts입니다. 프론트 seed/MSW/fallback이 아니라 기존 실 DB에 남은 E2E 생성 행입니다. 생성 당시 사용된 소유자·대여자·제3자 패턴과 연결 관계를 대조했습니다. 테스트 패턴과 일치하지 않는 차량 3·8은 수동/기존 데이터로 보존 대상입니다. 생성 출처 컬럼이 없어 수동 등록이라는 사실 자체를 DB만으로 증명할 수는 없습니다.

| 차량 ID | 출처 | 소유 계정 ID | 대여 ID 및 현재 저장 상태 |
|---|---|---|---|
| 39 | sharing-live | 75 | 없음 |
| 66 | sharing-live | 132 | 44:REJECTED (대여자 133), 45:ACTIVE (대여자 133) |
| 81 | sharing-live | 164 | 57:REJECTED (대여자 165), 58:COMPLETED (대여자 165) |
| 96 | sharing-pki-live | 196 | 70:COMPLETED (대여자 197) |
| 112 | sharing-live | 230 | 83:REJECTED (대여자 231), 84:ACTIVE (대여자 231), 89:REQUESTED (대여자 9) |
| 113 | sharing-live | 233 | 85:REJECTED (대여자 234), 86:COMPLETED (대여자 234) |
| 114 | sharing-live | 236 | 87:REJECTED (대여자 237), 88:COMPLETED (대여자 237) |
| 149 | sharing-live | 313 | 없음 |
| 150 | sharing-data-live | 312 | 115:COMPLETED (대여자 316) |
| 151 | sharing-data-live | 318 | 145:REQUESTED (대여자 9) |
| 152 | sharing-live | 321 | 116:REJECTED (대여자 322), 117:ACTIVE (대여자 322) |
| 153 | sharing-data-live | 324 | 118:COMPLETED (대여자 325) |
| 154 | sharing-data-live | 327 | 119:COMPLETED (대여자 328) |
| 155 | sharing-live | 330 | 120:REJECTED (대여자 331), 121:COMPLETED (대여자 331) |
| 156 | sharing-pki-live | 333 | 122:COMPLETED (대여자 334) |
| 157 | sharing-data-live | 335 | 123:COMPLETED (대여자 336) |
| 158 | sharing-live | 338 | 124:REJECTED (대여자 339), 125:COMPLETED (대여자 339) |
| 178 | sharing-data-live | 379 | 139:COMPLETED (대여자 380) |
| 179 | sharing-live | 382 | 140:REJECTED (대여자 383), 141:COMPLETED (대여자 383) |
| 180 | sharing-data-live | 385 | 142:COMPLETED (대여자 386) |
| 181 | sharing-live | 388 | 143:REJECTED (대여자 389), 144:COMPLETED (대여자 389) |

차량 112의 대여 89와 차량 151의 대여 145는 실제 사용자 계정 9에 연결되어 있습니다. 이 두 차량·계정 그룹은 일괄 정리에서 제외해야 합니다. ACTIVE로 저장된 45·84·117은 실제 시간 경과와 DB 상태가 다를 수 있으므로 단순히 테스트라고 종료/취소해서는 안 됩니다. 조사에는 상태를 갱신할 수 있는 GET /rentals를 사용하지 않고 SQL SELECT만 사용했습니다.

### 테스트 계정 (61개, 생성 패턴 및 소유 관계 일치)

| 계정 ID | 이름 | 테스트 이메일 |
|---|---|---|
| 75 | Owner | Owner-1791485656627-w4cacj7qbpa@example.com |
| 76 | Renter | Renter-1791485656627-w4cacj7qbpa@example.com |
| 77 | Other | Other-1791485656627-w4cacj7qbpa@example.com |
| 132 | Owner | Owner-1791486032429-zodl0yuqzo@example.com |
| 133 | Renter | Renter-1791486032429-zodl0yuqzo@example.com |
| 134 | Other | Other-1791486032429-zodl0yuqzo@example.com |
| 164 | Owner | Owner-1791486555387-0ge6de3fagq7@example.com |
| 165 | Renter | Renter-1791486555387-0ge6de3fagq7@example.com |
| 166 | Other | Other-1791486555387-0ge6de3fagq7@example.com |
| 196 | PKI Owner | owner-1791486857300@example.com |
| 197 | PKI Renter | live-pki-1791486600@example.com |
| 230 | Owner | Owner-1791487217629-7eqtp0sztpr@example.com |
| 231 | Renter | Renter-1791487217629-7eqtp0sztpr@example.com |
| 232 | Other | Other-1791487217629-7eqtp0sztpr@example.com |
| 233 | Owner | Owner-1791487459750-0m7qtav06rec@example.com |
| 234 | Renter | Renter-1791487459750-0m7qtav06rec@example.com |
| 235 | Other | Other-1791487459750-0m7qtav06rec@example.com |
| 236 | Owner | Owner-1791487726170-ptfdstj97v@example.com |
| 237 | Renter | Renter-1791487726170-ptfdstj97v@example.com |
| 238 | Other | Other-1791487726170-ptfdstj97v@example.com |
| 312 | DataOwner | DataOwner-1791489780838@example.com |
| 313 | Owner | Owner-1791489780838-7t6iob2nxtb@example.com |
| 314 | Renter | Renter-1791489780838-7t6iob2nxtb@example.com |
| 315 | Other | Other-1791489780838-7t6iob2nxtb@example.com |
| 316 | DataRenter | DataRenter-1791489780838@example.com |
| 317 | DataOther | DataOther-1791489780838@example.com |
| 318 | DataOwner | DataOwner-1791489910407@example.com |
| 319 | DataRenter | DataRenter-1791489910407@example.com |
| 320 | DataOther | DataOther-1791489910407@example.com |
| 321 | Owner | Owner-1791489921611-r7occlzbff@example.com |
| 322 | Renter | Renter-1791489921611-r7occlzbff@example.com |
| 323 | Other | Other-1791489921611-r7occlzbff@example.com |
| 324 | DataOwner | DataOwner-1791490003237@example.com |
| 325 | DataRenter | DataRenter-1791490003237@example.com |
| 326 | DataOther | DataOther-1791490003237@example.com |
| 327 | DataOwner | DataOwner-1791490143813@example.com |
| 328 | DataRenter | DataRenter-1791490143813@example.com |
| 329 | DataOther | DataOther-1791490143813@example.com |
| 330 | Owner | Owner-1791490149561-pb0xfw4twlb@example.com |
| 331 | Renter | Renter-1791490149561-pb0xfw4twlb@example.com |
| 332 | Other | Other-1791490149561-pb0xfw4twlb@example.com |
| 333 | PKI Owner | owner-1791490449078@example.com |
| 334 | PKI Renter | live-pki-20261009-0512@example.com |
| 335 | DataOwner | DataOwner-1791490540417@example.com |
| 336 | DataRenter | DataRenter-1791490540417@example.com |
| 337 | DataOther | DataOther-1791490540417@example.com |
| 338 | Owner | Owner-1791490547030-csclpjp98oj@example.com |
| 339 | Renter | Renter-1791490547030-csclpjp98oj@example.com |
| 340 | Other | Other-1791490547030-csclpjp98oj@example.com |
| 379 | DataOwner | DataOwner-1791530885049@example.com |
| 380 | DataRenter | DataRenter-1791530885049@example.com |
| 381 | DataOther | DataOther-1791530885049@example.com |
| 382 | Owner | Owner-1791530890691-m55a2tgg13m@example.com |
| 383 | Renter | Renter-1791530890691-m55a2tgg13m@example.com |
| 384 | Other | Other-1791530890691-m55a2tgg13m@example.com |
| 385 | DataOwner | DataOwner-1791531110552@example.com |
| 386 | DataRenter | DataRenter-1791531110552@example.com |
| 387 | DataOther | DataOther-1791531110552@example.com |
| 388 | Owner | Owner-1791531116484-0vifjk7icfuc@example.com |
| 389 | Renter | Renter-1791531116484-0vifjk7icfuc@example.com |
| 390 | Other | Other-1791531116484-0vifjk7icfuc@example.com |

계정 1·2·9는 E2E 생성 패턴과 다르므로 보존합니다. 계정 239·240·241의 auth-check/auth-smoke 패턴은 별도 인증 점검 후보지만 이 세 E2E 파일에서 생성됐다고 확인되지 않으므로 별도 승인 대상입니다.

### 승인 후 정리할 영향 범위

가장 보수적인 우선 제안은 112·151을 제외한 테스트 차량 19대를 먼저 검토하여 공개 중단 또는 소프트 삭제하는 것입니다. 실제 사용자 요청 89·145가 연결된 차량은 반드시 따로 결정합니다. 관련 61개 계정 전체를 무조건 삭제하지 않습니다. 물리 정리는 사용자·차량·대여·권한·잠금 요청·챌린지·OTA FK와 감사 actor_email/rental_id를 함께 검토해야 합니다. 보안/계약 이력 보존이 우선이면 소프트 삭제 및 테스트 계정 로그인 제한을 별도 승인 후 적용하는 쪽이 안전합니다. 현재 데이터는 삭제·수정하지 않았으며 데이터 변환 SQL도 자동 실행하지 않습니다.
- 전체 E2E 후보와 연결된 grants: 18건
- 전체 E2E 후보와 연결된 unlocks: 18건
- 전체 E2E 후보와 연결된 challenges: 2건
- 전체 E2E 후보와 연결된 ota: 8건
- 전체 E2E 후보와 연결된 audit: 201건

문자열을 화면에서 숨기는 기존 presentation.ts는 데이터 정리의 대체가 아닙니다. 이번에는 출처·관계 조사 및 반복 오염 방지를 구현했습니다. 기존 DB 데이터 정리는 범위 승인 후 별도 작업입니다.

## 변경 파일

Backend: Vehicle/Repository/Service/Response, SharingDtos/Service/Controller, Rental, OtaVerificationService, additive migration, testing/E2e* 테스트 전용 코드, application-e2e, test application, Gradle test 가드.
Frontend: PickupLocationField/Picker, KakaoMap/SDK types, ServerRegistration, OwnerVehicleCard/VehicleDeleteDialog, sharing API·DTO·신청/계약 픽업 표시, Playwright 환경 검증·테스트별 fixture/정리, Next 별도 dist, lint 제외 설정.

테스트 실행 방법·격리 보장은 `E2E_DATABASE_ISOLATION.md`를 참고하세요. 검증 결과는 `PICKUP_SHARING_VALIDATION.md`에 기록합니다.
