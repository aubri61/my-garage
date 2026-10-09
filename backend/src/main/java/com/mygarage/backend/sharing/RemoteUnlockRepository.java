package com.mygarage.backend.sharing;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface RemoteUnlockRepository extends JpaRepository<RemoteUnlockRequest, Long> {
    List<RemoteUnlockRequest> findAllByRentalIdOrderByIdDesc(Long rentalId);
}
