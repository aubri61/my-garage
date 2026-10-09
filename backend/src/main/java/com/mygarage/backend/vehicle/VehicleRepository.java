package com.mygarage.backend.vehicle;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select v from Vehicle v where v.id = :id")
    Optional<Vehicle> lockById(@org.springframework.data.repository.query.Param("id") Long id);
    List<Vehicle> findAllBySharingEnabledTrueOrderByIdDesc();
    @org.springframework.data.jpa.repository.Query("select v from Vehicle v where v.sharingEnabled = true and v.owner.email <> :email order by v.id desc")
    List<Vehicle> findPublicForRenter(@org.springframework.data.repository.query.Param("email") String email);
    List<Vehicle> findAllByOwnerEmailOrderByCreatedAtDescIdDesc(String email);
    Optional<Vehicle> findByIdAndOwnerEmail(Long id, String email);
}
