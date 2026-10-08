package com.mygarage.backend.ota;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OtaVerificationRepository extends JpaRepository<OtaVerificationHistory, Long> {
    List<OtaVerificationHistory> findTop50ByVehicleIdAndExecutedByEmailAndVehicleOwnerEmailOrderByExecutedAtDescIdDesc(
            Long vehicleId, String executedByEmail, String ownerEmail);
}
