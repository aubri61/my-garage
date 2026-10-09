# 차량 사진 준비와 검색 UI (2026-10-09)

## 사진·표시 이름 데이터

현대 10종 + 기아 10종 총 20종의 메타데이터를 준비했습니다.

- 편집 파일: `frontend/features/vehicle-registration/vehicle-media.json`
- 사진 저장 폴더: `frontend/public/images/vehicles/catalog/`
- 20종별 권장 파일명 표: 사진 폴더의 `README.md`
- 표시 이름: `displayName`에 원하는 한국어 이름 입력.
- 사진 이름: `imageFile`에 실제 파일명 입력(확장자 포함). 기본값은 차종별 영문 이름으로 준비되어 있음.
- 사진 설명: `imageAlt`.
- 출처/사용 권한 메모: `imageSource`, `imageLicense`.
- `key`, `manufacturer`, `model`은 기존 API와 호환되는 값이므로 유지.
- `imageReady`는 파일 존재·비어 있지 않음을 확인한 자동 값. 직접 편집하지 않음.

추천 규격은 가로 1200×720, WebP, 측면 또는 앞쪽 3/4 시점입니다. PNG/JPG도 지원합니다. 제조사·차종별 1장부터 준비하면 됩니다. 직접 촬영한 사진이나 사용이 허용된 사진을 넣으세요.

예: `frontend/public/images/vehicles/catalog/hyundai-ioniq-5.webp` 파일을 넣고 다음을 실행합니다.

```sh
cd frontend
npm run assets:vehicles
```

페이지를 새로고침하면 반영됩니다. `npm run dev`와 `npm run build`도 시작 전에 사진을 자동 확인합니다. 파일이 없는 경우 기존 아이오닉5/EV6 이미지를 활용하거나 사진 준비 중 placeholder를 사용합니다. 파일 확장자를 바꾸면 JSON도 실제 파일명과 맞춰주세요.

이 데이터는 사진·표시 메타데이터입니다. 실제 공유 차량 재고, 소유자, 픽업 위치, 예약 여부는 Spring API에서 조회하며 목업 차량을 개발 DB에 생성하지 않습니다. 차종별 연료/차체/연식 메타데이터는 기존 catalog.ts에 유지합니다.

## 선택 메뉴

등록 화면 제조사·차종·연식과 대여자 필터는 LargeSelect를 공유합니다. OS 기본 메뉴 대신 16px 글자·48px 항목 높이, 최대 336px 스크롤 목록을 사용합니다. 클릭, 방향키, Home/End, Enter/Space, Escape, 바깥 클릭을 지원합니다. 기존 제조사 종속 차종과 required 검증은 유지합니다.

## 주소 검색 기술

Kakao Maps JavaScript SDK의 Services 라이브러리를 사용합니다.

1. Geocoder.addressSearch: 주소 검색, 최대 20개 요청.
2. Places.keywordSearch: 장소명 검색. 공식 제한이 페이지당 15개이므로 page 1·2를 각각 요청.
3. Promise.allSettled로 세 요청을 합침. 일부 실패하더라도 성공한 결과를 사용.
4. 주소·장소명 기준 중복 제거, 유효 좌표 검사 후 최대 20개만 표시. 실제 결과가 적으면 있는 결과만 보여줌.
5. 450ms debounce와 이전 검색 응답 무시를 유지.
6. 검색 결과를 input 아래 같은 테두리 영역에 붙이고 높이 420px 안에서 스크롤.
7. 선택 시 주소·좌표·마커 동기화. 지도 클릭/드래그는 coord2Address 역지오코딩.

대여자 목록의 검색창은 위 장소 검색과 별개로 **실제 API가 반환한 차량 이름·픽업 주소를 필터링**합니다. 임의의 20개 차량을 만들지 않습니다.

공식 문서: https://apis.map.kakao.com/web/documentation/#services_Places_keywordSearch

## 숨긴 UI

로그인 데모 버튼, 등록 화면 소유권/인증서 데모, 등록 완료 후 OTA 링크, 소유자 보안 검증 섹션, 위도·경도 직접 입력을 일반 화면에서 숨겼습니다. 구현과 기존 API/보안 로직·직접 경로는 보존합니다. 모의 계약·실제 차량 제어 범위를 알리는 필수 안내는 유지합니다.

## 이번 변경 검증

- frontend unit: 8개 통과. lint, TypeScript 검사, 프로덕션 build 통과.
- Chrome Playwright: 17개 통과, 7개 건너뜀. 숨긴 기존 데모 등록 진입 테스트 6개와 PKI 실기기 fixture 미설정 테스트 1개는 통과로 계산하지 않음.
- 격리된 E2E DB에서 실제 차량 등록, A/B 계약 동의, SSE, 잠금 해제 회귀 확인. 이 시나리오의 Kakao SDK는 fixture이며 애플리케이션 API·DB·SSE는 실제 서버 사용.
- localhost:3000 별도 실제 Kakao SDK 검색: 강남 검색 결과 20개, 연결된 검색 영역, 420px 스크롤, 드롭다운 16px/약 51px, 방향키 선택 확인. 이 확인에서는 애플리케이션 API만 fixture로 대체해 개발 DB에 쓰지 않음.
- 확인 경로: /vehicles/register, /renter, /owner, /login. /demo와 /garage 직접 경로는 보존.
