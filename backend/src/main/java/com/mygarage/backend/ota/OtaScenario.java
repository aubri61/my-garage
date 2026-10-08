package com.mygarage.backend.ota;

public enum OtaScenario {
    VALID("정상 배포 패키지"),
    TAMPERED_FILE("서명 후 파일 바이트 변조"),
    FAKE_PUBLISHER("신뢰된 키 ID를 사칭하는 공격자 서명"),
    ROLLBACK("정상 서명된 낮은 보안 버전"),
    INCOMPATIBLE_VEHICLE("정상 서명된 다른 차종 패키지"),
    TAMPERED_METADATA("서명 후 업데이트 버전 변조"),
    INVALID_PACKAGE("잘못된 전자서명 형식");

    private final String description;
    OtaScenario(String description) { this.description = description; }
    public String getDescription() { return description; }
}
