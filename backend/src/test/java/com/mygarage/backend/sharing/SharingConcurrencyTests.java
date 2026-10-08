package com.mygarage.backend.sharing;

import com.mygarage.backend.user.*;
import com.mygarage.backend.vehicle.*;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import static org.assertj.core.api.Assertions.*;
import static com.mygarage.backend.sharing.SharingDtos.*;

@SpringBootTest
class SharingConcurrencyTests {
    @Autowired SharingService sharing;
    @Autowired UserRepository users;
    @Autowired VehicleRepository vehicles;
    @Autowired RentalRepository rentals;
    @Autowired EntityManager entities;
    @Autowired PlatformTransactionManager transactions;
    record Fixture(String owner, List<String> emails, Long vehicle, Long first, Long second) {}
    @Test void competingApprovalsCommitAtMostOneReservation() throws Exception {
        var tx=new TransactionTemplate(transactions);
        Fixture fixture=tx.execute(status -> {
            String suffix=UUID.randomUUID().toString();
            var a=users.save(new User("Concurrency Owner", "race-a-"+suffix+"@example.com","hash"));
            var b=users.save(new User("Concurrency Renter", "race-b-"+suffix+"@example.com","hash"));
            var c=users.save(new User("Concurrency Renter", "race-c-"+suffix+"@example.com","hash"));
            var v=vehicles.saveAndFlush(new Vehicle(a,"Test","Concurrent",2025,"race-test"));
            sharing.sharing(a.getEmail(),v.getId(),new SharingRequest(true,"동시 승인 테스트",37.5,127.0));
            Instant start=Instant.now().plusSeconds(60), end=start.plusSeconds(3600);
            var first=sharing.request(b.getEmail(),new RentalRequest(v.getId(),start,end));
            var second=sharing.request(c.getEmail(),new RentalRequest(v.getId(),start,end));
            return new Fixture(a.getEmail(),List.of(a.getEmail(),b.getEmail(),c.getEmail()),v.getId(),first.id(),second.id());
        });
        var ready=new CountDownLatch(2);
        var start=new CountDownLatch(1);
        var pool=Executors.newFixedThreadPool(2);
        try {
            Callable<Boolean> first=() -> approve(fixture.owner(),fixture.first(),ready,start);
            Callable<Boolean> second=() -> approve(fixture.owner(),fixture.second(),ready,start);
            var one=pool.submit(first); var two=pool.submit(second);
            assertThat(ready.await(5,TimeUnit.SECONDS)).isTrue(); start.countDown();
            assertThat(List.of(one.get(10,TimeUnit.SECONDS),two.get(10,TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(true,false);
            tx.executeWithoutResult(status -> assertThat(rentals.findAllByVehicleId(fixture.vehicle()))
                    .filteredOn(r -> r.getStatus() == Rental.Status.CONTRACT_PENDING).hasSize(1));
        } finally {
            start.countDown(); pool.shutdownNow(); pool.awaitTermination(10,TimeUnit.SECONDS);
            // Remove only rows created by this test's unique IDs/emails, never existing data.
            tx.executeWithoutResult(status -> {
                entities.createQuery("delete from SecurityAuditLog a where a.actorEmail in :emails").setParameter("emails",fixture.emails()).executeUpdate();
                entities.createQuery("delete from Rental r where r.vehicle.id = :id").setParameter("id",fixture.vehicle()).executeUpdate();
                vehicles.deleteById(fixture.vehicle()); vehicles.flush();
                entities.createQuery("delete from User u where u.email in :emails").setParameter("emails",fixture.emails()).executeUpdate();
            });
        }
    }
    private boolean approve(String owner, Long rental, CountDownLatch ready, CountDownLatch start) throws Exception {
        ready.countDown(); start.await();
        try { sharing.decide(owner,rental,true); return true; }
        catch (SharingException e) { assertThat(e.code).isEqualTo("RENTAL_CONFLICT"); return false; }
    }
}
