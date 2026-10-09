package com.mygarage.backend.sharing.pki;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="unlock_challenges")
public class UnlockChallenge {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false) private Long rentalId;
    @Column(nullable=false) private Long userId;
    @Column(nullable=false) private Long vehicleId;
    @Column(nullable=false, unique=true) private String nonce;
    @Column(nullable=false) private Instant expiresAt;
    private Instant usedAt;
    protected UnlockChallenge() {}
    public UnlockChallenge(Long rentalId, Long userId, Long vehicleId, String nonce, Instant expiresAt) {
        this.rentalId=rentalId; this.userId=userId; this.vehicleId=vehicleId; this.nonce=nonce; this.expiresAt=expiresAt;
    }
    public Long getId() { return id; }
    public Long getRentalId() { return rentalId; }
    public Long getUserId() { return userId; }
    public Long getVehicleId() { return vehicleId; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getUsedAt() { return usedAt; }
    public void consume(Instant now) { usedAt=now; }
    public String payload() {
        return "my-garage:unlock:v1\n"+rentalId+"\n"+userId+"\n"+vehicleId+"\n"+nonce+"\n"+expiresAt;
    }
}
