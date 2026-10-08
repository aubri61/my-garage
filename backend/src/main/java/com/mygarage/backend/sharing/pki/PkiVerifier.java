package com.mygarage.backend.sharing.pki;

import com.mygarage.backend.sharing.SharingException;
import jakarta.validation.constraints.*;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.security.Signature;
import java.security.cert.*;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import static org.springframework.http.HttpStatus.*;

@Service
public class PkiVerifier {
    public record Proof(@NotNull Long challengeId, @NotBlank @Size(max=12000) String certificatePem,
            @NotBlank @Size(max=2000) String signatureBase64, @NotBlank @Size(max=80) String deviceId) {}
    private final Resource trustedCa;
    private final boolean required;
    public PkiVerifier(@Value("${sharing.pki.trusted-ca:classpath:sharing/no-ca.pem}") Resource trustedCa,
            @Value("${sharing.pki.required:false}") boolean required) {
        this.trustedCa=trustedCa; this.required=required;
    }
    public boolean required() { return required; }
    public void verify(Proof proof, UnlockChallenge challenge, String email, Instant now) {
        if (!trustedCa.exists()) throw failure("PKI_NOT_CONFIGURED", "테스트 CA가 설정되지 않았습니다.");
        try {
            var factory=CertificateFactory.getInstance("X.509");
            X509Certificate ca;
            try (var input=trustedCa.getInputStream()) { ca=(X509Certificate) factory.generateCertificate(input); }
            var certificates=factory.generateCertificates(new ByteArrayInputStream(proof.certificatePem().getBytes(StandardCharsets.US_ASCII)));
            if (certificates.size() != 1) throw failure("INVALID_CERTIFICATE", "단일 기기 인증서를 제공해주세요.");
            var leaf=(X509Certificate) certificates.iterator().next();
            ca.checkValidity(Date.from(now));
            leaf.checkValidity(Date.from(now));
            if (ca.getBasicConstraints() < 0 || ca.getKeyUsage() == null || !ca.getKeyUsage()[5] || leaf.getBasicConstraints() >= 0)
                throw failure("CERTIFICATE_PURPOSE", "CA와 기기 인증서 용도를 확인해주세요.");
            var usage=leaf.getKeyUsage();
            var eku=leaf.getExtendedKeyUsage();
            if (usage == null || !usage[0] || eku == null || !eku.contains("1.3.6.1.5.5.7.3.2"))
                throw failure("CERTIFICATE_PURPOSE", "digitalSignature 및 clientAuth 용도가 필요합니다.");
            if (!"RSA".equals(leaf.getPublicKey().getAlgorithm()) ||
                    ((java.security.interfaces.RSAPublicKey)leaf.getPublicKey()).getModulus().bitLength() < 2048)
                throw failure("CERTIFICATE_KEY", "RSA 2048비트 이상 기기 키가 필요합니다.");
            var parameters=new PKIXParameters(Set.of(new TrustAnchor(ca,null)));
            parameters.setDate(Date.from(now));
            // Offline teaching fixture: no CRL/OCSP. DB grant revocation is still mandatory.
            parameters.setRevocationEnabled(false);
            CertPathValidator.getInstance("PKIX").validate(factory.generateCertPath(List.of(leaf)),parameters);
            var sans=leaf.getSubjectAlternativeNames();
            if (sans == null || !hasSan(sans,1,email) || !hasSan(sans,6,"urn:my-garage:device:"+proof.deviceId()))
                throw failure("CERTIFICATE_IDENTITY", "인증서 사용자·기기가 현재 접근 요청과 일치하지 않습니다.");
            var signature=Signature.getInstance("SHA256withRSA");
            signature.initVerify(leaf.getPublicKey());
            signature.update(challenge.payload().getBytes(StandardCharsets.UTF_8));
            if (!signature.verify(Base64.getDecoder().decode(proof.signatureBase64())))
                throw failure("INVALID_SIGNATURE", "개인키 보유 증명 또는 요청 서명 검증에 실패했습니다.");
        } catch (SharingException e) { throw e; }
        catch (CertificateExpiredException | CertificateNotYetValidException e) { throw failure("CERTIFICATE_PERIOD", "인증서가 만료되었거나 아직 유효하지 않습니다."); }
        catch (Exception e) { throw failure("PKI_VERIFICATION_FAILED", "인증서 신뢰 경로 또는 서명 형식 검증에 실패했습니다."); }
    }
    private boolean hasSan(Collection<List<?>> sans, int type, String value) {
        return sans.stream().anyMatch(san -> Integer.valueOf(type).equals(san.get(0)) && value.equals(san.get(1)));
    }
    private SharingException failure(String code, String message) { return new SharingException(FORBIDDEN,code,message); }
}
