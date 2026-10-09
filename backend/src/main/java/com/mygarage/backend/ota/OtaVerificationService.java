package com.mygarage.backend.ota;

import com.mygarage.backend.vehicle.Vehicle;
import com.mygarage.backend.vehicle.VehicleNotFoundException;
import com.mygarage.backend.vehicle.VehicleRepository;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static com.mygarage.backend.ota.OtaDtos.*;

@Service
public class OtaVerificationService {
    private final OtaCryptoService crypto;
    private final OtaScenarioService scenarios;
    private final VehicleRepository vehicles;
    private final OtaVerificationRepository history;

    public OtaVerificationService(OtaCryptoService crypto, OtaScenarioService scenarios,
            VehicleRepository vehicles, OtaVerificationRepository history) {
        this.crypto = crypto;
        this.scenarios = scenarios;
        this.vehicles = vehicles;
        this.history = history;
    }

    @Transactional
    public VerifyResponse simulate(String email, Long vehicleId, VerifyRequest request) {
        Vehicle vehicle = ownedVehicle(email, vehicleId);
        if (vehicle.isDeleted()) throw new VehicleNotFoundException();
        var state = OtaVehicleState.from(vehicle);
        // The engine has no bypass flag. OFF exists only in this fixture comparison orchestration.
        var result = verify(scenarios.create(request.scenario(), state), state);
        boolean protection = request.protectionEnabled();
        var status = protection ? result.status() : Status.SIMULATED_APPROVAL;
        String failureCode = protection ? result.failureCode() : null;
        var record = history.save(new OtaVerificationHistory(vehicle, vehicle.getOwner(), request.scenario(),
                protection, status, failureCode));
        var risk = protection ? null : new SimulatedRisk(
                result.failureCode() == null ? "VERIFICATION_BYPASSED" : "UNVERIFIED_" + result.failureCode(),
                "검증 생략 시 이 테스트 패키지를 가상 승인할 위험입니다. " + result.message()
                        + " 실제 설치·침해·차량 상태 변경은 발생하지 않습니다.");
        return new VerifyResponse(record.getId(), status, request.scenario(), protection, failureCode,
                protection ? result.checks() : notRunChecks(),
                protection ? result.message() : "교육용 가상 승인 비교입니다. 실제 업데이트 승인이나 설치가 아닙니다.",
                risk, state, record.getExecutedAt());
    }

    @Transactional(readOnly = true)
    public List<HistoryResponse> history(String email, Long vehicleId) {
        ownedVehicle(email, vehicleId);
        return history.findTop50ByVehicleIdAndExecutedByEmailAndVehicleOwnerEmailOrderByExecutedAtDescIdDesc(
                vehicleId, email, email).stream().map(OtaVerificationHistory::toResponse).toList();
    }

    private Vehicle ownedVehicle(String email, Long vehicleId) {
        return vehicles.findByIdAndOwnerEmail(vehicleId, email).orElseThrow(VehicleNotFoundException::new);
    }

    public VerificationResult verify(OtaPackage update, OtaVehicleState state) {
        var checks = new ArrayList<>(notRunChecks());
        if (!validFormat(update)) return fail(checks, CheckName.PACKAGE_FORMAT, "INVALID_PACKAGE", "패키지 형식이 유효하지 않습니다.");
        pass(checks, CheckName.PACKAGE_FORMAT);
        var metadata = update.metadata();
        if (!crypto.isTrusted(metadata.signerKeyId())) return fail(checks, CheckName.TRUSTED_SIGNER,
                "UNTRUSTED_SIGNER", "신뢰되지 않은 서명자입니다.");
        pass(checks, CheckName.TRUSTED_SIGNER);
        if (!crypto.verify(metadata, Base64.getDecoder().decode(update.signature()))) return fail(checks,
                CheckName.SIGNATURE, "SIGNATURE_INVALID", "신뢰된 공개키로 전자서명을 검증할 수 없습니다.");
        pass(checks, CheckName.SIGNATURE);
        if (!MessageDigest.isEqual(HexFormat.of().parseHex(metadata.fileHash()),
                HexFormat.of().parseHex(crypto.sha256(update.fileBytes())))) return fail(checks,
                CheckName.FILE_INTEGRITY, "HASH_MISMATCH", "업데이트 파일의 무결성 검증에 실패했습니다.");
        pass(checks, CheckName.FILE_INTEGRITY);
        if (!metadata.manufacturer().equals(state.manufacturer()) || !metadata.model().equals(state.model())
                || !metadata.hardwareId().equals(state.hardwareId())) return fail(checks, CheckName.COMPATIBILITY,
                "INCOMPATIBLE_VEHICLE", "제조사·차종 또는 하드웨어가 호환되지 않습니다.");
        pass(checks, CheckName.COMPATIBILITY);
        if (!metadata.component().equals(state.component()) || compareVersions(metadata.version(), state.currentVersion()) <= 0)
            return fail(checks, CheckName.VERSION_POLICY, "VERSION_POLICY_REJECTED", "구성 요소 또는 소프트웨어 버전 정책을 만족하지 않습니다.");
        pass(checks, CheckName.VERSION_POLICY);
        if (metadata.securityVersion() < state.securityVersion()) return fail(checks, CheckName.ROLLBACK,
                "ROLLBACK_DETECTED", "현재 보안 버전보다 낮은 업데이트를 차단했습니다.");
        pass(checks, CheckName.ROLLBACK);
        return new VerificationResult(Status.APPROVED, null, List.copyOf(checks), "모든 검증을 통과했습니다. 실제 설치는 수행하지 않습니다.");
    }

    private boolean validFormat(OtaPackage update) {
        if (update == null || update.metadata() == null || update.fileBytes() == null
                || update.fileBytes().length == 0 || update.fileBytes().length > 1_048_576) return false;
        var metadata = update.metadata();
        for (String field : new String[] {metadata.updateId(), metadata.manufacturer(), metadata.model(),
                metadata.hardwareId(), metadata.component(), metadata.signerKeyId()}) {
            if (field == null || field.isBlank() || field.length() > 128) return false;
        }
        if (metadata.version() == null || !metadata.version().matches("(0|[1-9][0-9]{0,5})\\.(0|[1-9][0-9]{0,5})\\.(0|[1-9][0-9]{0,5})")
                || metadata.securityVersion() < 0 || metadata.fileHash() == null
                || !metadata.fileHash().matches("[0-9a-f]{64}") || update.signature() == null || update.signature().length() != 88) return false;
        try {
            byte[] signature = Base64.getDecoder().decode(update.signature());
            return signature.length == 64 && Base64.getEncoder().encodeToString(signature).equals(update.signature());
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private int compareVersions(String proposed, String current) {
        int[] left = Arrays.stream(proposed.split("\\.")).mapToInt(Integer::parseInt).toArray();
        int[] right = Arrays.stream(current.split("\\.")).mapToInt(Integer::parseInt).toArray();
        for (int i = 0; i < 3; i++) {
            int comparison = Integer.compare(left[i], right[i]);
            if (comparison != 0) return comparison;
        }
        return 0;
    }

    private static List<Check> notRunChecks() {
        return Arrays.stream(CheckName.values()).map(name -> new Check(name, CheckStatus.NOT_RUN)).toList();
    }
    private static void pass(List<Check> checks, CheckName name) {
        checks.set(name.ordinal(), new Check(name, CheckStatus.PASSED));
    }
    private static VerificationResult fail(List<Check> checks, CheckName name, String code, String message) {
        checks.set(name.ordinal(), new Check(name, CheckStatus.FAILED));
        return new VerificationResult(Status.BLOCKED, code, List.copyOf(checks), message);
    }
}
