# 대여자 탐색 화면 리디자인

## 구성

- `/renter`: 상단 내 대여 요청/계약을 유지. 좌측 검색/제조사/차종/가격/전기차/가용 여부/기간 필터, 우측 결과 수/정렬/지도/2열 차량 카드로 구성.
- 화이트 카드, 연한 회색 배경, 20px 둥근 모서리, 14–23px 본문/가격, 제한적인 블루 강조.
- 모바일: 한 열 배치, 검색 필터 접기/펼치기. 지도와 카드를 먼저 볼 수 있도록 초기 필터는 접힘.
- 차량 카드 선택과 Kakao 마커가 동일 selectedId를 공유. 상세 보기·대여 신청은 기존 RentalForm을 열고 신청 CTA는 해당 위치로 이동.
- 필터와 지도는 같은 API 응답을 사용. 기간 변경은 기존 TanStack Query 키와 서버 예약 확인을 유지. SSE/세션/백엔드 권한 변경 없음.

## 가격 계약과 한계

현재 Spring 공개 차량 DTO에는 가격 필드가 없다. 임의의 차종별 금액을 추가하지 않았다.

프론트 AvailableVehicle에는 선택적 `hourlyPriceWon?: number | null`을 정의. 정수 KRW/시간, 0 이상만 유효. API가 제공하면 시간당 요금/범위 검색/오름·내림차순 정렬에 사용하고, 없거나 유효하지 않으면 **요금 미등록**으로 표시. 전체 차량에 가격이 없으면 가격 필터와 가격 정렬 옵션을 제공하지 않음. 가격 조건 적용 시 미등록 차량 제외. 신청 POST/계약에 가격을 전달하거나 임의로 청구하지 않음.

추후 실제 요금을 활성화하려면 차량별 요금 저장, 소유자 입력·수정 API, 공개 DTO에 hourlyPriceWon 반환, 계약 시 요금 스냅샷 정책이 필요하다. 결제·보험·실제 청구는 현재 미구현.

이미지는 기존 차종별 메타데이터/사용자 업로드 파일 연결을 재사용. 없거나 파일 로딩 실패하면 차량 아이콘과 사진 준비 안내를 표시. 참고 이미지가 실제 등록 차량 사진인 것처럼 표시하지 않음.

## 이번 작업 파일

- features/sharing/components/renter-dashboard.tsx: 데이터 조회/필터/정렬/선택 연결
- components/renter-dashboard.css: 대여자 전용 반응형 스타일
- components/renter-filters.tsx: 검색과 필터 패널
- components/renter-vehicle-card.tsx: 탐색 카드/상태/요금/CTA
- components/sharing-shell.tsx: 대여자 테마 범위
- components/rental-form.tsx: 선택 차량 요금 안내
- features/sharing/types.ts, pricing.ts: 선택적 가격 타입/검증/표시
- tests/e2e/renter-redesign.spec.ts: 가격·정렬·지도 양방향 선택·신청·모바일·오류 테스트
- tests/e2e/sharing-ux.spec.ts, sharing-data-live.spec.ts: 새 카드 구조에 맞춰 검증

경로는 frontend 기준. Git commit/push/배포 및 개발 DB 변경 없음.

## 검증

- lint, TypeScript, 프로덕션 build, unit 8개 통과.
- 전체 Chrome E2E 19개 통과, 7개 건너뜀(숨긴 기존 등록 데모 6개, 실기기 PKI fixture 미설정 1개).
- 마지막 모바일 필터 접기/펼치기 반영 후 관련 UI 테스트 5개 추가 통과.
- 격리된 E2E DB에서 A/B 차량 등록·신청·계약 양측 동의·SSE·잠금 해제 확인.
- 가격/필터 테스트의 요금은 명시적인 API fixture. 실제 DB에 가격 데이터가 존재한다는 증거로 사용하지 않음.
- 별도 localhost:3000 Chrome에서 실제 Kakao SDK 마커↔카드 선택 및 1440px/390px 화면 확인. 이 시각 검증은 애플리케이션 API만 fixture로 대체하여 개발 DB에 쓰지 않음.

직접 확인: 로그인 → /renter → 기간/필터 선택 → 카드 또는 지도 마커 선택 → 상세·대여 신청. 기존 내 계약 상태는 상단에 계속 표시.
