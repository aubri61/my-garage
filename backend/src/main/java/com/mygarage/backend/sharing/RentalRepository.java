package com.mygarage.backend.sharing;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RentalRepository extends JpaRepository<Rental, Long> {
    List<Rental> findAllByVehicleId(Long vehicleId);
    @Query("select r from Rental r where r.renter.email = :email or r.vehicle.owner.email = :email order by r.id desc")
    List<Rental> findForParticipant(@Param("email") String email);
}
