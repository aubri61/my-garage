package com.mygarage.backend.sharing;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
public interface DigitalAccessGrantRepository extends JpaRepository<DigitalAccessGrant, Long> {
    Optional<DigitalAccessGrant> findByRentalId(Long rentalId);
}
