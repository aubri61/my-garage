package com.mygarage.backend.ota;

import com.mygarage.backend.user.User;
import com.mygarage.backend.vehicle.Vehicle;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "ota_verification_history", indexes =
        @Index(name = "idx_ota_history_vehicle_time", columnList = "vehicle_id,executed_at,id"))
public class OtaVerificationHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicle_id", nullable = false, updatable = false)
    private Vehicle vehicle;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "executed_by_id", nullable = false, updatable = false)
    private User executedBy;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 40)
    private OtaScenario scenario;
    @Column(nullable = false, updatable = false)
    private boolean protectionEnabled;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 30)
    private OtaDtos.Status status;
    @Column(updatable = false, length = 40)
    private String failureCode;
    @Column(nullable = false, updatable = false)
    private Instant executedAt;

    protected OtaVerificationHistory() {}

    public OtaVerificationHistory(Vehicle vehicle, User executedBy, OtaScenario scenario,
            boolean protectionEnabled, OtaDtos.Status status, String failureCode) {
        this.vehicle = vehicle;
        this.executedBy = executedBy;
        this.scenario = scenario;
        this.protectionEnabled = protectionEnabled;
        this.status = status;
        this.failureCode = failureCode;
        this.executedAt = Instant.now();
    }

    public Long getId() { return id; }
    public Instant getExecutedAt() { return executedAt; }
    public OtaDtos.HistoryResponse toResponse() {
        return new OtaDtos.HistoryResponse(id, vehicle.getId(), scenario, protectionEnabled, status, failureCode, executedAt);
    }
}
