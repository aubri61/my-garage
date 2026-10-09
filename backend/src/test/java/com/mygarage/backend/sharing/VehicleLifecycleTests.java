package com.mygarage.backend.sharing;

import com.mygarage.backend.user.*;
import com.mygarage.backend.vehicle.*;
import com.mygarage.backend.ota.*;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static com.mygarage.backend.sharing.SharingDtos.*;

@SpringBootTest @Transactional
class VehicleLifecycleTests {
    @Autowired SharingService sharing;
    @Autowired VehicleService vehicleService;
    @Autowired VehicleRepository vehicles;
    @Autowired UserRepository users;
    @Autowired OtaVerificationService ota;
    @MockitoBean Clock clock;
    User owner, renter;
    Vehicle vehicle;
    Instant now=Instant.parse("2030-01-01T10:00:00Z");
    @BeforeEach void setup() {
        when(clock.instant()).thenReturn(now);
        String id=UUID.randomUUID().toString();
        owner=users.save(new User("소유자","owner-"+id+"@example.com","hash"));
        renter=users.save(new User("대여자","renter-"+id+"@example.com","hash"));
        vehicle=vehicles.saveAndFlush(new Vehicle(owner,"현대","IONIQ 5",2026,"123가4567"));
        vehicle.configureRentalTerms(12000L,null,null,null,1);
        sharing.sharing(owner.getEmail(),vehicle.getId(),new SharingRequest(true,"서울 중구 세종대로 110",37.5665,126.978,"지하 2층 B구역","3번 출입구 앞"));
    }
    @Test void pickupDetailsPersistAndContractKeepsSnapshot() {
        vehicles.flush();
        var saved=vehicleService.detail(owner.getEmail(),vehicle.getId());
        assertThat(saved.pickupDetail()).isEqualTo("지하 2층 B구역");
        assertThat(saved.pickupInstructions()).isEqualTo("3번 출입구 앞");
        var rental=sharing.request(renter.getEmail(),new RentalRequest(vehicle.getId(),now,now.plusSeconds(3600)));
        sharing.sharing(owner.getEmail(),vehicle.getId(),new SharingRequest(true,"다른 주소",37.5,127.0,"변경","변경 안내"));
        assertThat(sharing.detail(renter.getEmail(),rental.id()).pickupDetail()).isEqualTo("지하 2층 B구역");
        assertThat(sharing.detail(renter.getEmail(),rental.id()).pickupLocation()).isEqualTo("서울 중구 세종대로 110");
    }
    @Test void oldSharingPayloadRetainsOptionalDetailsAndEmptyTextClearsThem() {
        sharing.sharing(owner.getEmail(),vehicle.getId(),new SharingRequest(false,"서울 시청",37.5665,126.978));
        assertThat(vehicleService.detail(owner.getEmail(),vehicle.getId()).pickupDetail()).isEqualTo("지하 2층 B구역");
        sharing.sharing(owner.getEmail(),vehicle.getId(),new SharingRequest(false,"서울 시청",37.5665,126.978,"",""));
        assertThat(vehicleService.detail(owner.getEmail(),vehicle.getId()).pickupDetail()).isNull();
    }
    @Test void pauseOnlyPreventsNewRequestsAndExistingContractCanBeCompleted() {
        var rental=sharing.request(renter.getEmail(),new RentalRequest(vehicle.getId(),now,now.plusSeconds(3600)));
        sharing.sharingState(owner.getEmail(),vehicle.getId(),false);
        assertThat(vehicleService.list(owner.getEmail())).extracting(v -> v.id()).contains(vehicle.getId());
        assertThat(sharing.available(renter.getEmail())).extracting(AvailableVehicle::id).doesNotContain(vehicle.getId());
        assertThatThrownBy(() -> sharing.request(renter.getEmail(),new RentalRequest(vehicle.getId(),now,now.plusSeconds(7200)))).isInstanceOf(SharingException.class);
        sharing.decide(owner.getEmail(),rental.id(),true);
        sharing.consent(owner.getEmail(),rental.id());
        assertThat(sharing.consent(renter.getEmail(),rental.id()).status()).isEqualTo(Rental.Status.ACTIVE);
        sharing.sharingState(owner.getEmail(),vehicle.getId(),true);
        assertThat(sharing.available(renter.getEmail())).extracting(AvailableVehicle::id).contains(vehicle.getId());
    }
    @Test void deletionIsOwnerOnlyAndBlocksPendingFutureAndActiveRentals() {
        assertThatThrownBy(() -> sharing.deleteVehicle(renter.getEmail(),vehicle.getId())).isInstanceOf(VehicleNotFoundException.class);
        var rental=sharing.request(renter.getEmail(),new RentalRequest(vehicle.getId(),now.plusSeconds(60),now.plusSeconds(3660)));
        assertThatThrownBy(() -> sharing.deleteVehicle(owner.getEmail(),vehicle.getId())).hasMessageContaining("삭제할 수 없습니다");
        sharing.decide(owner.getEmail(),rental.id(),true);
        sharing.consent(owner.getEmail(),rental.id()); sharing.consent(renter.getEmail(),rental.id());
        assertThatThrownBy(() -> sharing.deleteVehicle(owner.getEmail(),vehicle.getId())).hasMessageContaining("삭제할 수 없습니다");
        when(clock.instant()).thenReturn(now.plusSeconds(60)); sharing.detail(renter.getEmail(),rental.id());
        assertThatThrownBy(() -> sharing.deleteVehicle(owner.getEmail(),vehicle.getId())).hasMessageContaining("삭제할 수 없습니다");
    }
    @Test void softDeleteHidesCurrentListsButPreservesRentalAndOtaHistory() {
        ota.simulate(owner.getEmail(),vehicle.getId(),new OtaDtos.VerifyRequest(OtaScenario.VALID,true));
        var rental=sharing.request(renter.getEmail(),new RentalRequest(vehicle.getId(),now,now.plusSeconds(3600)));
        sharing.decide(owner.getEmail(),rental.id(),true); sharing.consent(owner.getEmail(),rental.id()); sharing.consent(renter.getEmail(),rental.id());
        sharing.revoke(owner.getEmail(),rental.id(),true);
        sharing.deleteVehicle(owner.getEmail(),vehicle.getId()); vehicles.flush();
        assertThat(vehicles.findById(vehicle.getId()).orElseThrow().isDeleted()).isTrue();
        assertThat(vehicleService.list(owner.getEmail())).extracting(v -> v.id()).doesNotContain(vehicle.getId());
        assertThat(sharing.available(renter.getEmail())).extracting(AvailableVehicle::id).doesNotContain(vehicle.getId());
        assertThatThrownBy(() -> vehicleService.detail(owner.getEmail(),vehicle.getId())).isInstanceOf(VehicleNotFoundException.class);
        assertThatThrownBy(() -> sharing.publicDetail(renter.getEmail(),vehicle.getId())).isInstanceOf(VehicleNotFoundException.class);
        assertThatThrownBy(() -> sharing.sharingState(owner.getEmail(),vehicle.getId(),true)).isInstanceOf(VehicleNotFoundException.class);
        assertThat(sharing.detail(renter.getEmail(),rental.id()).status()).isEqualTo(Rental.Status.COMPLETED);
        assertThat(ota.history(owner.getEmail(),vehicle.getId())).hasSize(1);
    }
}
