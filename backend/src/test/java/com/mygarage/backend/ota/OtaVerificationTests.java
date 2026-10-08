package com.mygarage.backend.ota;

import java.security.KeyFactory;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static com.mygarage.backend.ota.OtaDtos.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class OtaVerificationTests {
    final OtaVehicleState state = new OtaVehicleState("Hyundai", "IONIQ 5", "SIM-HW-2025", "INFOTAINMENT", "1.0.0", 10);
    OtaCryptoService crypto;
    OtaScenarioService scenarios;
    OtaVerificationService verification;

    @BeforeEach
    void setup() {
        crypto = new OtaCryptoService();
        scenarios = new OtaScenarioService(crypto);
        verification = new OtaVerificationService(crypto, scenarios,
                mock(com.mygarage.backend.vehicle.VehicleRepository.class), mock(OtaVerificationRepository.class));
    }

    @Test void validPackageIsApproved() {
        var result = run(OtaScenario.VALID);
        assertThat(result.status()).isEqualTo(Status.APPROVED);
        assertThat(result.failureCode()).isNull();
        assertThat(result.checks()).allMatch(check -> check.status() == CheckStatus.PASSED);
    }

    @Test void tamperedFileFailsActualHashComparisonAfterValidSignature() {
        var update = scenarios.create(OtaScenario.TAMPERED_FILE, state);
        assertThat(crypto.sha256(update.fileBytes())).isNotEqualTo(update.metadata().fileHash());
        var result = verification.verify(update, state);
        assertFailure(result, "HASH_MISMATCH", CheckName.FILE_INTEGRITY);
        assertThat(result.checks().get(CheckName.SIGNATURE.ordinal()).status()).isEqualTo(CheckStatus.PASSED);
    }

    @Test void attackerKnowingTrustedKeyIdStillFailsCryptographicSignature() {
        var forged = scenarios.create(OtaScenario.FAKE_PUBLISHER, state);
        assertThat(forged.metadata().signerKeyId()).isEqualTo(OtaCryptoService.TRUSTED_KEY_ID);
        assertFailure(verification.verify(forged, state), "SIGNATURE_INVALID", CheckName.SIGNATURE);
    }

    @Test void unknownKeyIdIsNeverTrusted() {
        var valid = scenarios.create(OtaScenario.VALID, state);
        var m = valid.metadata();
        var unknown = metadata(m, m.updateId(), m.manufacturer(), m.model(), m.hardwareId(), m.component(),
                m.version(), m.securityVersion(), m.fileHash(), "attacker-key");
        assertFailure(verification.verify(new OtaPackage(unknown, valid.signature(), valid.fileBytes()), state),
                "UNTRUSTED_SIGNER", CheckName.TRUSTED_SIGNER);
    }

    @Test void tamperedMetadataFailsSignature() {
        assertFailure(run(OtaScenario.TAMPERED_METADATA), "SIGNATURE_INVALID", CheckName.SIGNATURE);
    }

    @Test void rollbackCounterIsRejectedEvenWithHigherSoftwareVersion() {
        assertFailure(run(OtaScenario.ROLLBACK), "ROLLBACK_DETECTED", CheckName.ROLLBACK);
    }

    @Test void signedOtherVehicleIsIncompatible() {
        assertFailure(run(OtaScenario.INCOMPATIBLE_VEHICLE), "INCOMPATIBLE_VEHICLE", CheckName.COMPATIBILITY);
    }

    @Test void malformedPackageFailsWithoutThrowing() {
        assertFailure(run(OtaScenario.INVALID_PACKAGE), "INVALID_PACKAGE", CheckName.PACKAGE_FORMAT);
        var valid = scenarios.create(OtaScenario.VALID, state);
        for (OtaPackage update : new OtaPackage[] {null, new OtaPackage(null, null, null),
                new OtaPackage(valid.metadata(), valid.signature(), null),
                new OtaPackage(valid.metadata(), valid.signature(), new byte[0]),
                new OtaPackage(valid.metadata(), valid.signature(), new byte[1_048_577]),
                new OtaPackage(valid.metadata(), null, valid.fileBytes())}) {
            assertFailure(verification.verify(update, state), "INVALID_PACKAGE", CheckName.PACKAGE_FORMAT);
        }
    }

    @Test void everyMetadataFieldIsAuthenticated() {
        var valid = scenarios.create(OtaScenario.VALID, state);
        var m = valid.metadata();
        var variants = new ArrayList<OtaPackage.Metadata>();
        variants.add(metadata(m, "changed-id", m.manufacturer(), m.model(), m.hardwareId(), m.component(), m.version(), m.securityVersion(), m.fileHash(), m.signerKeyId()));
        variants.add(metadata(m, m.updateId(), "Other", m.model(), m.hardwareId(), m.component(), m.version(), m.securityVersion(), m.fileHash(), m.signerKeyId()));
        variants.add(metadata(m, m.updateId(), m.manufacturer(), "Other", m.hardwareId(), m.component(), m.version(), m.securityVersion(), m.fileHash(), m.signerKeyId()));
        variants.add(metadata(m, m.updateId(), m.manufacturer(), m.model(), "Other", m.component(), m.version(), m.securityVersion(), m.fileHash(), m.signerKeyId()));
        variants.add(metadata(m, m.updateId(), m.manufacturer(), m.model(), m.hardwareId(), "Other", m.version(), m.securityVersion(), m.fileHash(), m.signerKeyId()));
        variants.add(metadata(m, m.updateId(), m.manufacturer(), m.model(), m.hardwareId(), m.component(), "9.0.0", m.securityVersion(), m.fileHash(), m.signerKeyId()));
        variants.add(metadata(m, m.updateId(), m.manufacturer(), m.model(), m.hardwareId(), m.component(), m.version(), 999, m.fileHash(), m.signerKeyId()));
        variants.add(metadata(m, m.updateId(), m.manufacturer(), m.model(), m.hardwareId(), m.component(), m.version(), m.securityVersion(), "0".repeat(64), m.signerKeyId()));
        for (var changed : variants) {
            assertFailure(verification.verify(new OtaPackage(changed, valid.signature(), valid.fileBytes()), state),
                    "SIGNATURE_INVALID", CheckName.SIGNATURE);
        }
        // Moving string boundaries must not produce the same signed bytes.
        var a = metadata(m, "a", "bc", m.model(), m.hardwareId(), m.component(), m.version(), m.securityVersion(), m.fileHash(), m.signerKeyId());
        var b = metadata(m, "ab", "c", m.model(), m.hardwareId(), m.component(), m.version(), m.securityVersion(), m.fileHash(), m.signerKeyId());
        assertThat(a.signingBytes()).isNotEqualTo(b.signingBytes());
    }

    @Test void signedHardwareAndComponentPoliciesAreEnforced() throws Exception {
        var valid = scenarios.create(OtaScenario.VALID, state);
        var m = valid.metadata();
        var wrongHardware = metadata(m, m.updateId(), m.manufacturer(), m.model(), "SIM-HW-OTHER", m.component(),
                m.version(), m.securityVersion(), m.fileHash(), m.signerKeyId());
        assertFailure(verification.verify(signed(wrongHardware, valid.fileBytes()), state), "INCOMPATIBLE_VEHICLE", CheckName.COMPATIBILITY);
        var wrongComponent = metadata(m, m.updateId(), m.manufacturer(), m.model(), m.hardwareId(), "BRAKES",
                m.version(), m.securityVersion(), m.fileHash(), m.signerKeyId());
        assertFailure(verification.verify(signed(wrongComponent, valid.fileBytes()), state), "VERSION_POLICY_REJECTED", CheckName.VERSION_POLICY);
    }

    @Test void versionComparisonIsNumericAndRequiresAnIncrease() throws Exception {
        var valid = scenarios.create(OtaScenario.VALID, state);
        var m = valid.metadata();
        for (String version : List.of("0.9.0", "1.0.0")) {
            var old = metadata(m, m.updateId(), m.manufacturer(), m.model(), m.hardwareId(), m.component(),
                    version, 11, m.fileHash(), m.signerKeyId());
            assertFailure(verification.verify(signed(old, valid.fileBytes()), state), "VERSION_POLICY_REJECTED", CheckName.VERSION_POLICY);
        }
        var numericState = new OtaVehicleState(state.manufacturer(), state.model(), state.hardwareId(), state.component(), "1.9.0", 10);
        var newer = metadata(m, m.updateId(), m.manufacturer(), m.model(), m.hardwareId(), m.component(),
                "1.10.0", 10, m.fileHash(), m.signerKeyId());
        assertThat(verification.verify(signed(newer, valid.fileBytes()), numericState).status()).isEqualTo(Status.APPROVED);
    }

    @Test void fixturesAreReproducibleAndDefensivelyCopyFileBytes() {
        var first = scenarios.create(OtaScenario.VALID, state);
        var second = scenarios.create(OtaScenario.VALID, state);
        assertThat(first.signature()).isEqualTo(second.signature());
        assertThat(first.metadata()).isEqualTo(second.metadata());
        byte[] bytes = first.fileBytes();
        bytes[0] ^= 1;
        assertThat(verification.verify(first, state).status()).isEqualTo(Status.APPROVED);
    }

    private VerificationResult run(OtaScenario scenario) {
        return verification.verify(scenarios.create(scenario, state), state);
    }

    private void assertFailure(VerificationResult result, String code, CheckName failed) {
        assertThat(result.status()).isEqualTo(Status.BLOCKED);
        assertThat(result.failureCode()).isEqualTo(code);
        assertThat(result.checks().get(failed.ordinal()).status()).isEqualTo(CheckStatus.FAILED);
        assertThat(result.checks().subList(failed.ordinal() + 1, result.checks().size()))
                .allMatch(check -> check.status() == CheckStatus.NOT_RUN);
    }

    private OtaPackage signed(OtaPackage.Metadata metadata, byte[] file) throws Exception {
        var key = KeyFactory.getInstance("Ed25519").generatePrivate(new PKCS8EncodedKeySpec(
                OtaCryptoService.readFixture("publisher-private.pk8.base64")));
        var signature = Signature.getInstance("Ed25519");
        signature.initSign(key);
        signature.update(metadata.signingBytes());
        return new OtaPackage(metadata, Base64.getEncoder().encodeToString(signature.sign()), file);
    }

    private OtaPackage.Metadata metadata(OtaPackage.Metadata original, String id, String manufacturer,
            String model, String hardware, String component, String version, long counter, String hash, String keyId) {
        return new OtaPackage.Metadata(id, manufacturer, model, hardware, component, version, counter, hash, keyId);
    }
}
