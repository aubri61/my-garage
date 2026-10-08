package com.mygarage.backend.ota;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.PKCS8EncodedKeySpec;
import java.util.Base64;
import org.springframework.stereotype.Service;

@Service
public class OtaScenarioService {
    private final OtaCryptoService crypto;
    private final PrivateKey publisherKey;
    private final PrivateKey attackerKey;

    public OtaScenarioService(OtaCryptoService crypto) {
        this.crypto = crypto;
        try {
            var factory = KeyFactory.getInstance("Ed25519");
            publisherKey = factory.generatePrivate(new PKCS8EncodedKeySpec(
                    OtaCryptoService.readFixture("publisher-private.pk8.base64")));
            attackerKey = factory.generatePrivate(new PKCS8EncodedKeySpec(
                    OtaCryptoService.readFixture("attacker-private.pk8.base64")));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("시뮬레이션 전용 키 로드 실패", exception);
        }
    }

    public OtaPackage create(OtaScenario scenario, OtaVehicleState state) {
        byte[] file = "MY_GARAGE_SIMULATION_ONLY:INFOTAINMENT:1.1.0".getBytes(StandardCharsets.UTF_8);
        String model = scenario == OtaScenario.INCOMPATIBLE_VEHICLE ? state.model() + "-OTHER" : state.model();
        long counter = scenario == OtaScenario.ROLLBACK ? state.securityVersion() - 1 : state.securityVersion() + 1;
        // Rollback deliberately has a higher marketing version to isolate the security counter check.
        var metadata = new OtaPackage.Metadata("simulation-" + scenario.name(), state.manufacturer(), model,
                state.hardwareId(), state.component(), "1.1.0", counter, crypto.sha256(file),
                OtaCryptoService.TRUSTED_KEY_ID);
        String signature = sign(metadata, scenario == OtaScenario.FAKE_PUBLISHER ? attackerKey : publisherKey);
        if (scenario == OtaScenario.TAMPERED_FILE) file[0] ^= 1;
        if (scenario == OtaScenario.TAMPERED_METADATA) {
            metadata = new OtaPackage.Metadata(metadata.updateId(), metadata.manufacturer(), metadata.model(),
                    metadata.hardwareId(), metadata.component(), "9.9.9", metadata.securityVersion(),
                    metadata.fileHash(), metadata.signerKeyId());
        }
        if (scenario == OtaScenario.INVALID_PACKAGE) signature = "not-valid-base64!";
        return new OtaPackage(metadata, signature, file);
    }

    private String sign(OtaPackage.Metadata metadata, PrivateKey key) {
        try {
            var signature = Signature.getInstance("Ed25519");
            signature.initSign(key);
            signature.update(metadata.signingBytes());
            return Base64.getEncoder().encodeToString(signature.sign());
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("시뮬레이션 패키지 서명 실패", exception);
        }
    }
}
