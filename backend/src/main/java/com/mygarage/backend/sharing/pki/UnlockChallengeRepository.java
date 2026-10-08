package com.mygarage.backend.sharing.pki;
import org.springframework.data.jpa.repository.JpaRepository;
public interface UnlockChallengeRepository extends JpaRepository<UnlockChallenge, Long> {
    java.util.Optional<UnlockChallenge> findFirstByRentalIdAndUsedAtIsNullAndExpiresAtAfterOrderByIdDesc(Long rentalId, java.time.Instant now);
}
