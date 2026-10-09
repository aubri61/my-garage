package com.mygarage.backend.sharing;

import com.mygarage.backend.user.*;
import com.mygarage.backend.vehicle.*;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static com.mygarage.backend.sharing.SharingDtos.*;

// Real PostgreSQL repositories and transactions; only time is controlled. All test rows roll back.
@SpringBootTest
@Transactional
class SharingIntegrationTests {
    @Autowired SharingService sharing;
    @Autowired UserRepository users;
    @Autowired VehicleRepository vehicles;
    @Autowired VehicleService vehicleService;
    @Autowired RemoteUnlockRepository unlocks;
    @Autowired SecurityAuditRepository audits;
    @MockitoBean Clock clock;
    User owner, renter, stranger;
    Vehicle vehicle;
    Instant now=Instant.parse("2030-01-01T10:00:00Z");
    @BeforeEach void setup() {
        when(clock.instant()).thenReturn(now);
        String suffix=UUID.randomUUID().toString();
        owner=users.save(new User("Owner", "owner-"+suffix+"@example.com", "hash"));
        renter=users.save(new User("Renter", "renter-"+suffix+"@example.com", "hash"));
        stranger=users.save(new User("Other", "other-"+suffix+"@example.com", "hash"));
        vehicle=vehicles.saveAndFlush(new Vehicle(owner,"Hyundai","IONIQ 5",2025,"test-plate"));
        sharing.sharing(owner.getEmail(),vehicle.getId(),new SharingRequest(true,"서울 시청",37.5665,126.978));
    }
    RentalView requested(Instant start, Instant end) {
        return sharing.request(renter.getEmail(),new RentalRequest(vehicle.getId(), start, end));
    }
    RentalView active() {
        var r=requested(now,now.plusSeconds(3600));
        sharing.decide(owner.getEmail(),r.id(),true);
        sharing.consent(owner.getEmail(),r.id());
        return sharing.consent(renter.getEmail(),r.id());
    }
    @Test void completeTwoPartyFlowRevokesAccessAndLocksVehicle() {
        assertThat(sharing.available(renter.getEmail())).extracting(AvailableVehicle::id).contains(vehicle.getId());
        assertThat(sharing.available(owner.getEmail())).extracting(AvailableVehicle::id).doesNotContain(vehicle.getId());
        var r=active();
        assertThat(r.status()).isEqualTo(Rental.Status.ACTIVE);
        assertThat(r.accessGrant().active()).isTrue();
        assertThat(r.ownerConsentedAt()).isEqualTo(now);
        var pending=sharing.requestUnlock(renter.getEmail(),r.id());
        long id=pending.unlockRequests().getFirst().id();
        assertThat(sharing.decideUnlock(owner.getEmail(),id,true).lockState()).isEqualTo(Vehicle.LockState.UNLOCKED);
        // Retry the same decision: no second audit or vehicle side effect.
        long auditCount=audits.count();
        sharing.decideUnlock(owner.getEmail(),id,true);
        assertThat(audits.count()).isEqualTo(auditCount);
        var revoked=sharing.revoke(owner.getEmail(),r.id(),false);
        assertThat(revoked.accessGrant().active()).isFalse();
        assertThat(revoked.lockState()).isEqualTo(Vehicle.LockState.LOCKED);
        assertThatThrownBy(() -> sharing.requestUnlock(renter.getEmail(),r.id())).isInstanceOf(SharingException.class);
        assertThatThrownBy(() -> sharing.decideUnlock(owner.getEmail(),id,true)).isInstanceOf(SharingException.class);
        assertThat(sharing.revoke(owner.getEmail(),r.id(),true).status()).isEqualTo(Rental.Status.COMPLETED);
    }
    @Test void ownerAndRenterChecksAreIndependentOfUiMode() {
        var r=requested(now,now.plusSeconds(3600));
        assertThatThrownBy(() -> sharing.decide(renter.getEmail(),r.id(),true)).isInstanceOf(VehicleNotFoundException.class);
        assertThatThrownBy(() -> sharing.detail(stranger.getEmail(),r.id())).isInstanceOf(SharingException.class);
        assertThatThrownBy(() -> sharing.sharing(stranger.getEmail(),vehicle.getId(),new SharingRequest(false,"elsewhere",0.0,0.0))).isInstanceOf(VehicleNotFoundException.class);
        assertThatThrownBy(() -> sharing.request(owner.getEmail(),new RentalRequest(vehicle.getId(),now,now.plusSeconds(3600)))).isInstanceOf(SharingException.class);
    }
    @Test void overlapsDuplicateRequestsAndInvalidTransitionsAreRejected() {
        var first=requested(now,now.plusSeconds(3600));
        assertThatThrownBy(() -> requested(now,now.plusSeconds(1200))).isInstanceOf(SharingException.class);
        var competitor=sharing.request(stranger.getEmail(),new RentalRequest(vehicle.getId(),now,now.plusSeconds(1800)));
        sharing.decide(owner.getEmail(),first.id(),true);
        assertThatThrownBy(() -> sharing.decide(owner.getEmail(),competitor.id(),true))
                .isInstanceOf(SharingException.class).hasMessageContaining("겹칩니다");
        assertThatThrownBy(() -> sharing.decide(owner.getEmail(),first.id(),false)).isInstanceOf(SharingException.class);
        // Adjacent periods do not overlap.
        assertThat(requested(now.plusSeconds(3600),now.plusSeconds(7200)).status()).isEqualTo(Rental.Status.REQUESTED);
    }
    @Test void futureAndExpiredGrantsCannotControlAndPendingRequestExpires() {
        var r=requested(now.plusSeconds(600),now.plusSeconds(3600));
        sharing.decide(owner.getEmail(),r.id(),true);
        sharing.consent(owner.getEmail(),r.id());
        var confirmed=sharing.consent(renter.getEmail(),r.id());
        assertThat(confirmed.status()).isEqualTo(Rental.Status.CONFIRMED);
        assertThat(confirmed.accessGrant().active()).isFalse();
        assertThatThrownBy(() -> sharing.requestUnlock(renter.getEmail(),r.id())).isInstanceOf(SharingException.class);
        when(clock.instant()).thenReturn(now.plusSeconds(601));
        var pending=sharing.requestUnlock(renter.getEmail(),r.id());
        assertThat(pending.status()).isEqualTo(Rental.Status.ACTIVE);
        when(clock.instant()).thenReturn(now.plusSeconds(3600));
        var completed=sharing.detail(renter.getEmail(),r.id());
        assertThat(completed.status()).isEqualTo(Rental.Status.COMPLETED);
        assertThat(completed.unlockRequests().getFirst().status()).isEqualTo(RemoteUnlockRequest.Status.EXPIRED);
        assertThatThrownBy(() -> sharing.decideUnlock(owner.getEmail(),pending.unlockRequests().getFirst().id(),true)).isInstanceOf(SharingException.class);
    }
    @Test void oneConsentCannotActivateAndRevocationCancelsPendingRequest() {
        var r=requested(now,now.plusSeconds(3600));
        assertThatThrownBy(() -> sharing.consent(renter.getEmail(),r.id())).isInstanceOf(SharingException.class);
        sharing.decide(owner.getEmail(),r.id(),true);
        assertThat(sharing.consent(owner.getEmail(),r.id()).accessGrant()).isNull();
        sharing.consent(renter.getEmail(),r.id());
        var pending=sharing.requestUnlock(renter.getEmail(),r.id());
        assertThatThrownBy(() -> sharing.requestUnlock(renter.getEmail(),r.id())).isInstanceOf(SharingException.class);
        assertThat(sharing.revoke(owner.getEmail(),r.id(),false).unlockRequests().getFirst().status()).isEqualTo(RemoteUnlockRequest.Status.CANCELLED);
        assertThatThrownBy(() -> sharing.decideUnlock(stranger.getEmail(),pending.unlockRequests().getFirst().id(),true)).isInstanceOf(VehicleNotFoundException.class);
    }
    @Test void pickupTermsKeepTheirSnapshotWhenOwnerChangesPublicLocation() {
        var r=requested(now,now.plusSeconds(3600));
        sharing.sharing(owner.getEmail(),vehicle.getId(),new SharingRequest(true,"다른 픽업 장소",37.0,127.0));
        assertThat(sharing.detail(renter.getEmail(),r.id()).pickupLocation()).isEqualTo("서울 시청");
        assertThat(sharing.detail(renter.getEmail(),r.id()).terms()).isEqualTo(r.terms());
    }
    @Test void existingVehiclesRemainPrivateAndRequestPeriodIsValidated() {
        var old=vehicles.saveAndFlush(new Vehicle(owner,"Kia","EV6",2024,"legacy-test"));
        assertThat(old.isSharingEnabled()).isFalse();
        assertThat(old.getLockState()).isEqualTo(Vehicle.LockState.LOCKED);
        assertThatThrownBy(() -> sharing.request(renter.getEmail(),new RentalRequest(old.getId(),now,now.plusSeconds(60)))).isInstanceOf(SharingException.class);
        assertThatThrownBy(() -> requested(now,now)).isInstanceOf(SharingException.class);
        assertThatThrownBy(() -> requested(now.minusSeconds(61),now.plusSeconds(60))).isInstanceOf(SharingException.class);
        assertThatThrownBy(() -> requested(now,now.plusSeconds(31L*86400))).isInstanceOf(SharingException.class);
    }
    @Test void registeredPublicAndPrivateVehiclesUseRealRepositoriesAndOwnerFilters() {
        var shared=vehicleService.register(owner.getEmail(), new com.mygarage.backend.vehicle.dto.VehicleRequest(
                "기아", "EV6", 2026, "db-test-public", new SharingRequest(true,"성수 픽업",37.54,127.05)));
        var hidden=vehicleService.register(owner.getEmail(), new com.mygarage.backend.vehicle.dto.VehicleRequest("현대","IONIQ 5",2025,"db-test-private"));
        assertThat(vehicles.findById(shared.id()).orElseThrow().getPickupLocation()).isEqualTo("성수 픽업");
        assertThat(vehicleService.list(owner.getEmail())).extracting(com.mygarage.backend.vehicle.dto.VehicleResponse::id).contains(shared.id(),hidden.id());
        assertThat(vehicleService.list(renter.getEmail())).extracting(com.mygarage.backend.vehicle.dto.VehicleResponse::id).doesNotContain(shared.id(),hidden.id());
        assertThat(sharing.available(renter.getEmail())).extracting(AvailableVehicle::id).contains(shared.id()).doesNotContain(hidden.id());
        assertThat(sharing.available(owner.getEmail())).extracting(AvailableVehicle::id).doesNotContain(shared.id());
        assertThatThrownBy(() -> sharing.publicDetail(renter.getEmail(),hidden.id())).isInstanceOf(VehicleNotFoundException.class);
        assertThatThrownBy(() -> sharing.publicDetail(owner.getEmail(),shared.id())).isInstanceOf(VehicleNotFoundException.class);
        assertThat(sharing.publicDetail(renter.getEmail(),shared.id()).pickupLocation()).isEqualTo("성수 픽업");
    }
    @Test void availabilityReflectsReservationsAndOwnPendingRequestsWithoutDisclosingParticipants() {
        var r=requested(now,now.plusSeconds(3600));
        assertThat(sharing.available(renter.getEmail(),now,now.plusSeconds(600))).filteredOn(v -> v.id().equals(vehicle.getId())).extracting(AvailableVehicle::available).containsExactly(false);
        assertThat(sharing.available(stranger.getEmail(),now,now.plusSeconds(600))).filteredOn(v -> v.id().equals(vehicle.getId())).extracting(AvailableVehicle::available).containsExactly(true);
        sharing.decide(owner.getEmail(),r.id(),true);
        assertThat(sharing.available(stranger.getEmail(),now,now.plusSeconds(600))).filteredOn(v -> v.id().equals(vehicle.getId())).extracting(AvailableVehicle::available).containsExactly(false);
        assertThat(sharing.available(stranger.getEmail(),now.plusSeconds(3600),now.plusSeconds(7200))).filteredOn(v -> v.id().equals(vehicle.getId())).extracting(AvailableVehicle::available).containsExactly(true);
        assertThatThrownBy(() -> sharing.available(renter.getEmail(),now,null)).isInstanceOf(SharingException.class);
        assertThatThrownBy(() -> sharing.available(renter.getEmail(),now,now)).isInstanceOf(SharingException.class);
    }

}
