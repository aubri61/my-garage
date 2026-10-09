package com.mygarage.backend.sharing.pki;

import com.mygarage.backend.sharing.*;
import com.mygarage.backend.user.*;
import com.mygarage.backend.vehicle.*;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static com.mygarage.backend.sharing.SharingDtos.*;

@SpringBootTest(properties="sharing.pki.required=true")
@Transactional
class PkiSharingIntegrationTests {
    static final String EMAIL="pki-renter-"+UUID.randomUUID()+"@example.com";
    static Path fixture;
    static {
        try {
            fixture=Files.createTempDirectory("my-garage-test-pki-");
            var process=new ProcessBuilder("sh","../scripts/create-test-device.sh",fixture.toString(),EMAIL,"browser-device").redirectErrorStream(true).start();
            String output=new String(process.getInputStream().readAllBytes());
            if (process.waitFor() != 0) throw new IllegalStateException(output);
        } catch (Exception e) { throw new ExceptionInInitializerError(e); }
    }
    @DynamicPropertySource static void pkiConfig(DynamicPropertyRegistry registry) {
        registry.add("sharing.pki.trusted-ca",() -> fixture.resolve("ca.pem").toUri().toString());
    }
    @Autowired SharingService sharing;
    @Autowired UserRepository users;
    @Autowired VehicleRepository vehicles;
    @MockitoBean Clock clock;
    String owner;
    RentalView rental;
    Instant now;
    @BeforeEach void setup() {
        now=Instant.now().plusSeconds(2); when(clock.instant()).thenReturn(now);
        owner="pki-owner-"+UUID.randomUUID()+"@example.com";
        var a=users.save(new User("Owner",owner,"hash"));
        users.save(new User("Renter",EMAIL,"hash"));
        var v=vehicles.saveAndFlush(new Vehicle(a,"Hyundai","PKI Test",2025,"pki-test"));
        v.configureRentalTerms(12000L,null,null,null,1);
        sharing.sharing(owner,v.getId(),new SharingRequest(true,"테스트 픽업",37.5,127.0));
        rental=sharing.request(EMAIL,new RentalRequest(v.getId(),now,now.plusSeconds(3600)));
        sharing.decide(owner,rental.id(),true); sharing.consent(owner,rental.id()); sharing.consent(EMAIL,rental.id());
    }
    PkiVerifier.Proof proof(SharingService.ChallengeView c) throws Exception {
        var p=PkiVerifierTests.sign(Files.readString(fixture.resolve("browser-device-cert.pem")),c.payload(),
                PkiVerifierTests.readKey(fixture.resolve("browser-device-key.pem")),"browser-device");
        return new PkiVerifier.Proof(c.id(),p.certificatePem(),p.signatureBase64(),p.deviceId());
    }
    @Test void requiredPkiSignedRequestApprovalReplayAndRevocation() throws Exception {
        assertThatThrownBy(() -> sharing.requestUnlock(EMAIL,rental.id())).isInstanceOf(SharingException.class).hasMessageContaining("서명");
        var challenge=sharing.challenge(EMAIL,rental.id()); var proof=proof(challenge);
        var signed=sharing.requestUnlock(EMAIL,rental.id(),proof);
        assertThat(signed.unlockRequests().getFirst().pkiVerified()).isTrue();
        var unlocked=sharing.decideUnlock(owner,signed.unlockRequests().getFirst().id(),true);
        assertThat(unlocked.lockState()).isEqualTo(Vehicle.LockState.UNLOCKED);
        assertThatThrownBy(() -> sharing.requestUnlock(EMAIL,rental.id(),proof)).isInstanceOf(SharingException.class).hasMessageContaining("챌린지");
        var next=proof(sharing.challenge(EMAIL,rental.id()));
        var pending=sharing.requestUnlock(EMAIL,rental.id(),next);
        sharing.revoke(owner,rental.id(),false);
        assertThatThrownBy(() -> sharing.decideUnlock(owner,pending.unlockRequests().getFirst().id(),true)).isInstanceOf(SharingException.class).hasMessageContaining("회수");
        assertThatThrownBy(() -> sharing.requestUnlock(EMAIL,rental.id(),next)).isInstanceOf(SharingException.class);
    }
    @Test void expiredChallengeCannotBeUsedEvenWithValidSignature() throws Exception {
        var c=sharing.challenge(EMAIL,rental.id()); var p=proof(c);
        when(clock.instant()).thenReturn(now.plusSeconds(121));
        assertThatThrownBy(() -> sharing.requestUnlock(EMAIL,rental.id(),p)).isInstanceOf(SharingException.class).hasMessageContaining("챌린지");
    }
    @AfterAll static void removeOnlyTemporaryFixtureFiles() throws Exception {
        try (var files=Files.walk(fixture)) { for (Path p : files.sorted(Comparator.reverseOrder()).toList()) Files.delete(p); }
    }
}
