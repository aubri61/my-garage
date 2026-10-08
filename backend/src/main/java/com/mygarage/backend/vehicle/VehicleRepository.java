package com.mygarage.backend.vehicle;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    List<Vehicle> findAllByOwnerEmailOrderByCreatedAtDescIdDesc(String email);
    Optional<Vehicle> findByIdAndOwnerEmail(Long id, String email);
}
