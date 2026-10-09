package com.mygarage.backend.sharing.pki;

import com.mygarage.backend.sharing.SharingException;
import java.nio.file.*;
import java.security.*;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Instant;
import java.util.Base64;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.FileSystemResource;
import static org.assertj.core.api.Assertions.*;

class PkiVerifierTests {
    @TempDir static Path temporary;
    static Path trusted;
    static Path untrusted;
    static String certificate;
    static PrivateKey key;
    @BeforeAll static void generateFixtures() throws Exception {
        trusted=temporary.resolve("trusted"); untrusted=temporary.resolve("untrusted");
        fixtures(trusted); fixtures(untrusted);
        certificate=Files.readString(trusted.resolve("test-device-cert.pem"));
        key=readKey(trusted.resolve("test-device-key.pem"));
    }
    static void fixtures(Path path) throws Exception {
        var process=new ProcessBuilder("sh","../scripts/create-test-device.sh",path.toString(),"pki@example.com","test-device").redirectErrorStream(true).start();
        String output=new String(process.getInputStream().readAllBytes());
        if (process.waitFor() != 0) throw new IllegalStateException(output);
    }
    static PrivateKey readKey(Path path) throws Exception {
        String encoded=Files.readString(path).replaceAll("-----[^-]+-----|\\s","");
        return KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(Base64.getDecoder().decode(encoded)));
    }
    static PkiVerifier.Proof sign(String certificate, String payload, PrivateKey privateKey, String device) throws Exception {
        var signature=Signature.getInstance("SHA256withRSA"); signature.initSign(privateKey); signature.update(payload.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        return new PkiVerifier.Proof(1L,certificate,Base64.getEncoder().encodeToString(signature.sign()),device);
    }
    UnlockChallenge challenge() { return new UnlockChallenge(1L,2L,3L,"random-nonce",Instant.now().plusSeconds(120)); }
    PkiVerifier verifier() { return new PkiVerifier(new FileSystemResource(trusted.resolve("ca.pem")),true); }
    @Test void trustedCertificateAndSignedRequestPass() throws Exception {
        var c=challenge(); verifier().verify(sign(certificate,c.payload(),key,"test-device"),c,"pki@example.com",Instant.now());
    }
    @Test void untrustedCaAndTamperedSignatureFail() throws Exception {
        var c=challenge();
        String wrong=Files.readString(untrusted.resolve("test-device-cert.pem"));
        var proof=sign(wrong,c.payload(),readKey(untrusted.resolve("test-device-key.pem")),"test-device");
        assertThatThrownBy(() -> verifier().verify(proof,c,"pki@example.com",Instant.now())).isInstanceOf(SharingException.class);
        var tampered=sign(certificate,c.payload()+"tampered",key,"test-device");
        assertThatThrownBy(() -> verifier().verify(tampered,c,"pki@example.com",Instant.now())).isInstanceOf(SharingException.class).hasMessageContaining("서명");
    }
    @Test void expiredCertificateAndWrongUserOrDeviceFail() throws Exception {
        var c=challenge(); var proof=sign(certificate,c.payload(),key,"test-device");
        assertThatThrownBy(() -> verifier().verify(proof,c,"pki@example.com",Instant.now().plusSeconds(400L*86400))).isInstanceOf(SharingException.class).hasMessageContaining("만료");
        assertThatThrownBy(() -> verifier().verify(proof,c,"other@example.com",Instant.now())).isInstanceOf(SharingException.class).hasMessageContaining("사용자");
        var wrongDevice=sign(certificate,c.payload(),key,"other-device");
        assertThatThrownBy(() -> verifier().verify(wrongDevice,c,"pki@example.com",Instant.now())).isInstanceOf(SharingException.class).hasMessageContaining("기기");
    }
    @Test void certificateWithoutRequiredPurposeIsRejected() throws Exception {
        var invalid=temporary.resolve("no-purpose.pem");
        var process=new ProcessBuilder("openssl","x509","-in",trusted.resolve("test-device-cert.pem").toString(),
                "-CA",trusted.resolve("ca.pem").toString(),"-CAkey",trusted.resolve("ca-key.pem").toString(),
                "-CAcreateserial","-out",invalid.toString(),"-days","365","-clrext").redirectErrorStream(true).start();
        String output=new String(process.getInputStream().readAllBytes());
        assertThat(process.waitFor()).as(output).isZero();
        var c=challenge(); var proof=sign(Files.readString(invalid),c.payload(),key,"test-device");
        assertThatThrownBy(() -> verifier().verify(proof,c,"pki@example.com",Instant.now())).isInstanceOf(SharingException.class).hasMessageContaining("용도");
    }
    @Test void differentVehicleChallengeAndMalformedOrUnconfiguredCertificateFail() throws Exception {
        var c=challenge(); var proof=sign(certificate,c.payload(),key,"test-device");
        var different=new UnlockChallenge(1L,2L,99L,"random-nonce",c.getExpiresAt());
        assertThatThrownBy(() -> verifier().verify(proof,different,"pki@example.com",Instant.now())).isInstanceOf(SharingException.class);
        var bad=new PkiVerifier.Proof(1L,"not a certificate","invalid","test-device");
        assertThatThrownBy(() -> verifier().verify(bad,c,"pki@example.com",Instant.now())).isInstanceOf(SharingException.class);
        assertThatThrownBy(() -> new PkiVerifier(new FileSystemResource(temporary.resolve("missing.pem")),true).verify(proof,c,"pki@example.com",Instant.now())).isInstanceOf(SharingException.class).hasMessageContaining("설정");
    }
}
