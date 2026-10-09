package com.mygarage.backend.sharing;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RentalRepository extends JpaRepository<Rental, Long> {
    List<Rental> findAllByVehicleId(Long vehicleId);
    @Query("select distinct r.vehicle.id from Rental r where r.startsAt < :end and r.endsAt > :start and (r.status in :reserved or (r.status = :requested and r.renter.email = :email))")
    List<Long> unavailableVehicles(@Param("email") String email, @Param("start") java.time.Instant start,
            @Param("end") java.time.Instant end, @Param("reserved") java.util.Set<Rental.Status> reserved,
            @Param("requested") Rental.Status requested);
    @Query("select r from Rental r where r.renter.email = :email or r.vehicle.owner.email = :email order by r.id desc")
    List<Rental> findForParticipant(@Param("email") String email);
}
