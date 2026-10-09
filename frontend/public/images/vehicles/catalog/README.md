# 차량 사진 넣는 폴더

아래 파일명으로 이미지를 넣고 frontend에서 `npm run assets:vehicles`를 실행한 뒤 새로고침하면 실제 차량 카드에서 사용합니다. dev 시작/build 시에도 자동 확인합니다. 차량 DB 행을 생성하지 않습니다.

표시 이름/파일명/출처/사용권한은 `frontend/features/vehicle-registration/vehicle-media.json`에서 수정합니다.
`model`, `manufacturer`, `key`는 API 호환 식별값이므로 그대로 두고 `displayName`, `imageFile`, `imageAlt`, `imageSource`, `imageLicense`를 편집하세요.

권장: WebP, 가로 1200×720(5:3), 일관된 측면 또는 앞쪽 3/4 시점. PNG/JPG도 가능하며 JSON 파일명을 실제 확장자까지 맞추세요. 직접 촬영 또는 사용 허용된 이미지를 준비하세요. 파일이 없으면 기존 아이오닉5/EV6 이미지 또는 placeholder를 표시합니다. `imageReady`는 자동 생성 여부 표시이므로 직접 수정할 필요 없습니다. 사진 파일이 준비되기 전에는 없는 이미지 URL을 요청하지 않습니다.

| 제조사 | 표시 이름 | 파일명 |
|---|---|---|
| 현대 | 아이오닉 5 | hyundai-ioniq-5.webp |
| 현대 | 아이오닉 6 | hyundai-ioniq-6.webp |
| 현대 | 코나 일렉트릭 | hyundai-kona-electric.webp |
| 현대 | 캐스퍼 일렉트릭 | hyundai-casper-electric.webp |
| 현대 | 아반떼 | hyundai-avante.webp |
| 현대 | 쏘나타 | hyundai-sonata.webp |
| 현대 | 그랜저 | hyundai-grandeur.webp |
| 현대 | 투싼 | hyundai-tucson.webp |
| 현대 | 싼타페 | hyundai-santa-fe.webp |
| 현대 | 팰리세이드 | hyundai-palisade.webp |
| 기아 | EV3 | kia-ev3.webp |
| 기아 | EV6 | kia-ev6.webp |
| 기아 | EV9 | kia-ev9.webp |
| 기아 | 니로 EV | kia-niro-ev.webp |
| 기아 | 레이 EV | kia-ray-ev.webp |
| 기아 | K5 | kia-k5.webp |
| 기아 | K8 | kia-k8.webp |
| 기아 | 스포티지 | kia-sportage.webp |
| 기아 | 쏘렌토 | kia-sorento.webp |
| 기아 | 카니발 | kia-carnival.webp |
