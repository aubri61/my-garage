package com.mygarage.backend.ota;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;

public final class OtaDtos {
    private OtaDtos() {}

    public record VerifyRequest(@NotNull OtaScenario scenario, @NotNull Boolean protectionEnabled) {}
    public record ScenarioResponse(OtaScenario scenario, String description) {}
    public enum Status { APPROVED, BLOCKED, SIMULATED_APPROVAL }
    public enum CheckName { PACKAGE_FORMAT, TRUSTED_SIGNER, SIGNATURE, FILE_INTEGRITY, COMPATIBILITY, VERSION_POLICY, ROLLBACK }
    public enum CheckStatus { PASSED, FAILED, NOT_RUN }
    public record Check(CheckName name, CheckStatus status) {}
    public record SimulatedRisk(String code, String description) {}
    public record VerificationResult(Status status, String failureCode, List<Check> checks, String message) {}
    public record VerifyResponse(Long historyId, Status status, OtaScenario scenario, boolean protectionEnabled,
            String failureCode, List<Check> checks, String message, SimulatedRisk simulatedRisk,
            OtaVehicleState simulationState, Instant executedAt) {}
    public record HistoryResponse(Long id, Long vehicleId, OtaScenario scenario, boolean protectionEnabled,
            Status status, String failureCode, Instant executedAt) {}
}
