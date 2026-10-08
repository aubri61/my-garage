package com.mygarage.backend.ota;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.HexFormat;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

@Service
public class OtaCryptoService {
    public static final String TRUSTED_KEY_ID = "simulation-publisher-v1";
    private final PublicKey publisherKey;

    public OtaCryptoService() {
        try {
            publisherKey = KeyFactory.getInstance("Ed25519").generatePublic(new X509EncodedKeySpec(
                    readFixture("publisher-public.x509.base64")));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("시뮬레이션 신뢰 키 로드 실패", exception);
        }
    }

    public String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("SHA-256 지원이 필요합니다.", exception);
        }
    }

    public boolean isTrusted(String keyId) {
        return TRUSTED_KEY_ID.equals(keyId);
    }

    public boolean verify(OtaPackage.Metadata metadata, byte[] signatureBytes) {
        // Key ID selects only a pinned server key; the package supplies no public key.
        if (!isTrusted(metadata.signerKeyId())) return false;
        try {
            var signature = Signature.getInstance("Ed25519");
            signature.initVerify(publisherKey);
            signature.update(metadata.signingBytes());
            return signature.verify(signatureBytes);
        } catch (GeneralSecurityException exception) {
            return false;
        }
    }

    static byte[] readFixture(String file) {
        try (var input = new ClassPathResource("ota/simulation/keys/" + file).getInputStream()) {
            return Base64.getDecoder().decode(new String(input.readAllBytes(), StandardCharsets.US_ASCII).strip());
        } catch (IOException | IllegalArgumentException exception) {
            throw new IllegalStateException("시뮬레이션 fixture 로드 실패", exception);
        }
    }
}
