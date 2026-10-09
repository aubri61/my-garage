# 데이터 모델과 상태 전이

| 엔티티 | 주요 필드/관계 |
| --- | --- |
| User | 기존 이메일/BCrypt/시각 유지; 고정 OWNER/RENTER 역할 없음 |
| Vehicle | owner, 기존 차량 필드, sharingEnabled, pickupLocation/Latitude/Longitude, lockState |
| Rental | vehicle, renter, pickupLocation snapshot, startsAt/endsAt, status, termsVersion/terms snapshot, owner/renterConsentedAt |
| DigitalAccessGrant | unique rental, startsAt/endsAt, revokedAt, REQUEST_UNLOCK operation |
| RemoteUnlockRequest | rental, status, requestedAt/processedAt, 선택적 certificate/signature/device/challenge evidence |
| UnlockChallenge | rentalId/userId/vehicleId, 256비트 nonce, expiresAt, usedAt |
| SecurityAuditLog | actorEmail, action, rentalId, occurredAt |
| OTA history | 기존 검증 모델 및 repository 유지 |

grant의 사용자/차량/계약은 rental 관계로 정규화한다. 별도 중복 FK는 만들지 않는다. 계약 동의는 대여당 양측 한 번씩만 가능하므로 Rental의 두 시각에 기록한다. 해당 사용자 신원은 owner/renter FK로 연결한다. 신규 대여의 픽업 위치는 신청 시 snapshot으로 고정하여 공유 위치 변경으로 계약 내용이 바뀌지 않게 한다. 이전 null snapshot 행은 기존 위치를 fallback한다. API로 임의 사용자나 계약 snapshot을 덮어쓸 수 없다.

Vehicle의 신규 nullable 필드는 기존 행과 호환된다. null 공유 상태는 false, null 잠금 상태는 LOCKED로 해석한다. 공개 DTO에는 번호판·소유자 이메일·User 엔티티를 포함하지 않는다.

## Rental

```text
REQUESTED ── reject ──> REJECTED
REQUESTED ── approve ──> CONTRACT_PENDING
CONTRACT_PENDING ── 양측 동의 ──> CONFIRMED
CONFIRMED ── 시작 시각 도래 ──> ACTIVE
CONTRACT_PENDING / CONFIRMED / ACTIVE ── 종료 시각 도래 ──> COMPLETED
CONFIRMED / ACTIVE ── 소유자 종료 ──> COMPLETED
```

APPROVED는 별도 지속 상태로 사용하지 않는다. 승인 결과가 CONTRACT_PENDING이다. CANCELLED는 타입에 예약되어 있으나 현재 취소 API는 없다. 시작은 inclusive, 종료는 exclusive이며 인접 예약은 겹치지 않는다. 상태 확정은 서버 조회/작업에서 수행한다.

## 접근·원격 상태

grant 활성은 양측 동의 + ACTIVE + `[startsAt, endsAt)` + revokedAt 없음이다. 회수는 되돌릴 수 없으며 대여 상태를 즉시 COMPLETED로 바꾸지 않는다. 소유자가 종료할 수 있다.

`PENDING → APPROVED | REJECTED | EXPIRED | CANCELLED`. 같은 승인/거절을 재요청하면 부작용 없이 현재 결과를 반환한다. 회수/종료는 PENDING을 CANCELLED로, 기간 만료는 EXPIRED로 바꾼다. 유효기간이 지난 권한으로 이전 요청을 승인할 수 없다.

가상 차량은 LOCKED/UNLOCKED이다. 승인된 유효 원격 요청만 UNLOCKED를 설정한다. 소유자 잠금·회수·종료는 LOCKED를 설정한다. 과거 대여의 지연된 만료 처리로 현재 다른 ACTIVE 대여 차량을 다시 잠그지 않는다.

PKI challenge는 2분 유효하며 유효 미사용 challenge를 재사용하고, 원격 요청 생성 시 한 번 소비한다. challenge는 승인 대기 시간을 제한하지 않는다. 승인 시 인증서·서명·현재 grant를 재검증한다.
