package com.mygarage.backend.vehicle;

import com.mygarage.backend.user.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "vehicles", indexes = @Index(name = "idx_vehicles_owner", columnList = "owner_id"))
public class Vehicle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false, length = 80)
    private String manufacturer;
    @Column(nullable = false, length = 100)
    private String model;
    @Column(nullable = false)
    private Integer modelYear;
    @Column(nullable = false, length = 30)
    private String licensePlate;
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    protected Vehicle() {}

    public Vehicle(User owner, String manufacturer, String model, Integer modelYear, String licensePlate) {
        this.owner = owner;
        this.manufacturer = manufacturer.strip();
        this.model = model.strip();
        this.modelYear = modelYear;
        this.licensePlate = licensePlate.strip();
    }

    public Long getId() { return id; }
    public User getOwner() { return owner; }
    public String getManufacturer() { return manufacturer; }
    public String getModel() { return model; }
    public Integer getModelYear() { return modelYear; }
    public String getLicensePlate() { return licensePlate; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    @PrePersist
    protected void onCreate() {
        createdAt = updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
