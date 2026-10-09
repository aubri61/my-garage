// Input suggestions only. Vehicle records always come from the authenticated API.
export const vehicleCatalog: Record<string, readonly string[]> = {
  현대: ["IONIQ 5", "IONIQ 6", "코나", "아반떼", "쏘나타", "그랜저", "투싼", "싼타페"],
  기아: ["EV3", "EV6", "EV9", "니로", "K5", "K8", "스포티지", "쏘렌토"],
  제네시스: ["G70", "G80", "G90", "GV60", "GV70", "GV80"],
  테슬라: ["Model 3", "Model Y", "Model S", "Model X"],
  BMW: ["3 Series", "5 Series", "i4", "i5", "iX", "X3", "X5"],
  벤츠: ["C-Class", "E-Class", "S-Class", "EQA", "EQB", "EQE", "EQS"],
  아우디: ["A4", "A6", "Q4 e-tron", "Q6 e-tron", "Q5", "Q7"],
  볼보: ["EX30", "EX40", "XC60", "XC90", "S60", "S90"],
};
export const pickupPresets = [
  { label: "서울 시청 공영주차장", latitude: 37.5665, longitude: 126.978 },
  { label: "서울 성수 공유 주차장", latitude: 37.5445, longitude: 127.0557 },
  { label: "서울 여의도 공유 주차장", latitude: 37.5219, longitude: 126.9245 },
];
