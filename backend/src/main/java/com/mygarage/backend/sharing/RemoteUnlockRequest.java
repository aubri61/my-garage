package com.mygarage.backend.sharing;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name="remote_unlock_requests", indexes=@Index(name="idx_unlock_rental", columnList="rental_id"))
public class RemoteUnlockRequest {
    public enum Status { PENDING, APPROVED, REJECTED, EXPIRED, CANCELLED }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="rental_id") Rental rental;
    @Enumerated(EnumType.STRING) @Column(nullable=false) Status status=Status.PENDING;
    @Column(nullable=false) Instant requestedAt=Instant.now();
    Instant processedAt;
    Long challengeId;
    @Column(length=12000) String certificatePem;
    @Column(length=2000) String signatureBase64;
    @Column(length=80) String deviceId;
    public void setProof(com.mygarage.backend.sharing.pki.PkiVerifier.Proof proof) {
        if (proof == null) return;
        challengeId=proof.challengeId(); certificatePem=proof.certificatePem();
        signatureBase64=proof.signatureBase64(); deviceId=proof.deviceId();
    }
    public com.mygarage.backend.sharing.pki.PkiVerifier.Proof proof() {
        return challengeId == null ? null : new com.mygarage.backend.sharing.pki.PkiVerifier.Proof(challengeId,certificatePem,signatureBase64,deviceId);
    }
    public Long getId() { return id; }
    public Rental getRental() { return rental; }
    public Status getStatus() { return status; }
    public Instant getRequestedAt() { return requestedAt; }
    public Long getChallengeId() { return challengeId; }
    public void process(Status value, Instant now) { status=value; processedAt=now; }
    protected RemoteUnlockRequest() {}
    public RemoteUnlockRequest(Rental rental) { this.rental=rental; }
}
