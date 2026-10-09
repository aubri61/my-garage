package com.mygarage.backend.sharing;
import jakarta.persistence.*;
import java.time.Instant;
@Entity
@Table(name="security_audit_logs")
public class SecurityAuditLog {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) Long id;
    @Column(nullable=false) String actorEmail;
    @Column(nullable=false) String action;
    Long rentalId;
    @Column(nullable=false) Instant occurredAt=Instant.now();
    protected SecurityAuditLog() {}
    public SecurityAuditLog(String actor, String action, Long rentalId) { actorEmail=actor; this.action=action; this.rentalId=rentalId; }
}
