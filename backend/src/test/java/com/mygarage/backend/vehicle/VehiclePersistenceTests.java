package com.mygarage.backend.vehicle;

import com.mygarage.backend.user.User;
import com.mygarage.backend.user.UserRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;

import static org.assertj.core.api.Assertions.assertThat;

// Uses the configured PostgreSQL database. No DDL or cleanup/delete SQL; inserts roll back.
@org.springframework.context.annotation.Import(com.mygarage.backend.testing.E2eDatabaseGuard.class)
@DataJpaTest(properties = "spring.jpa.hibernate.ddl-auto=validate")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class VehiclePersistenceTests {
    @Autowired UserRepository users;
    @Autowired VehicleRepository vehicles;

    @Test
    void queriesScopeVehiclesToTheirOwnerAndPersistTimestamps() {
        String suffix = UUID.randomUUID().toString();
        var alice = users.save(new User("Alice", "alice-" + suffix + "@example.com", "unused-test-hash"));
        var bob = users.save(new User("Bob", "bob-" + suffix + "@example.com", "unused-test-hash"));
        var alicesVehicle = vehicles.saveAndFlush(new Vehicle(alice, "Hyundai", "IONIQ 5", 2025, "123가4567"));
        var bobsVehicle = vehicles.saveAndFlush(new Vehicle(bob, "Kia", "EV6", 2025, "234나5678"));

        assertThat(vehicles.findAllByOwnerEmailOrderByCreatedAtDescIdDesc(alice.getEmail()))
                .extracting(Vehicle::getId).containsExactly(alicesVehicle.getId());
        assertThat(vehicles.findByIdAndOwnerEmail(bobsVehicle.getId(), alice.getEmail())).isEmpty();
        assertThat(vehicles.findByIdAndOwnerEmail(bobsVehicle.getId(), bob.getEmail())).isPresent();
        assertThat(alicesVehicle.getCreatedAt()).isNotNull();
        assertThat(alicesVehicle.getUpdatedAt()).isEqualTo(alicesVehicle.getCreatedAt());
    }
}
