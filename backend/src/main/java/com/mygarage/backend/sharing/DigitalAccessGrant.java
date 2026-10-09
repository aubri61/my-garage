package com.mygarage.backend.sharing;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="digital_access_grants")
public class DigitalAccessGrant {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
    @OneToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="rental_id", unique=true) Rental rental;
    @Column(nullable=false) Instant startsAt;
    @Column(nullable=false) Instant endsAt;
    Instant revokedAt;
    @Column(nullable=false) String allowedOperation = "REQUEST_UNLOCK";
    public Instant getStartsAt() { return startsAt; }
    public Instant getEndsAt() { return endsAt; }
    public Instant getRevokedAt() { return revokedAt; }
    public String getAllowedOperation() { return allowedOperation; }
    public void revoke(Instant value) { revokedAt=value; }
    protected DigitalAccessGrant() {}
    public DigitalAccessGrant(Rental rental) { this.rental=rental; startsAt=rental.getStartsAt(); endsAt=rental.getEndsAt(); }
    public boolean active(Instant now) {
        return revokedAt == null && !now.isBefore(startsAt) && now.isBefore(endsAt)
                && rental.getStatus() == Rental.Status.ACTIVE;
    }
}
