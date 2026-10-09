package com.mygarage.backend.sharing;

import com.mygarage.backend.user.User;
import com.mygarage.backend.vehicle.Vehicle;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="rentals", indexes={@Index(name="idx_rental_vehicle_period", columnList="vehicle_id,startsAt,endsAt"),
        @Index(name="idx_rental_renter", columnList="renter_id")})
public class Rental {
    public enum Status { REQUESTED, REJECTED, CONTRACT_PENDING, CONFIRMED, ACTIVE, COMPLETED, CANCELLED }
    public static final String TERMS_VERSION = "simulation-v1";
    public static final String TERMS = "학습용 차량 공유 시뮬레이션입니다. 표시된 픽업 위치와 대여 기간에 동의합니다. 원격 해제는 소유자 승인 후 가상 상태만 변경하며 소유자는 권한을 회수할 수 있습니다. 결제·보험·면허 검증·법적 전자서명·실제 차량 제어는 제공하지 않습니다.";
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="vehicle_id") Vehicle vehicle;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="renter_id") User renter;
    @Column(length=200) String pickupLocation;
    @Column(length=200) String pickupDetail;
    @Column(length=500) String pickupInstructions;
    @Column(nullable=false) Instant startsAt;
    @Column(nullable=false) Instant endsAt;
    @Enumerated(EnumType.STRING) @Column(nullable=false) Status status = Status.REQUESTED;
    @Column(nullable=false) String termsVersion = TERMS_VERSION;
    @Column(nullable=false, length=2000) String terms = TERMS;
    Instant ownerConsentedAt;
    Instant renterConsentedAt;
    public Long getId() { return id; }
    public Vehicle getVehicle() { return vehicle; }
    public User getRenter() { return renter; }
    public String getPickupLocation() { return pickupLocation == null ? vehicle.getPickupLocation() : pickupLocation; }
    public String getPickupDetail() { return pickupDetail; }
    public String getPickupInstructions() { return pickupInstructions; }
    public Instant getStartsAt() { return startsAt; }
    public Instant getEndsAt() { return endsAt; }
    public Status getStatus() { return status; }
    public void setStatus(Status value) { status=value; }
    public String getTermsVersion() { return termsVersion; }
    public String getTerms() { return terms; }
    public Instant getOwnerConsentedAt() { return ownerConsentedAt; }
    public Instant getRenterConsentedAt() { return renterConsentedAt; }
    public void consentOwner(Instant value) { ownerConsentedAt=value; }
    public void consentRenter(Instant value) { renterConsentedAt=value; }
    protected Rental() {}
    public Rental(Vehicle vehicle, User renter, Instant startsAt, Instant endsAt) {
        this.vehicle=vehicle; this.renter=renter; this.pickupLocation=vehicle.getPickupLocation(); this.pickupDetail=vehicle.getPickupDetail(); this.pickupInstructions=vehicle.getPickupInstructions(); this.startsAt=startsAt; this.endsAt=endsAt;
    }
}
