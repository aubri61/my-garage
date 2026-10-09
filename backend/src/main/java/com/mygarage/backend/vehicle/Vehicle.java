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

    // Nullable columns keep pre-sharing rows compatible; null means private/locked.
    private Long hourlyRate;
    @Column(length=20) private String powerType;
    @Column(length=20) private String bodyType;
    @Column(length=2000) private String description;
    private Integer minimumRentalHours;
    public Long getHourlyRate() { return hourlyRate; }
    public String getPowerType() { return powerType; }
    public String getBodyType() { return bodyType; }
    public String getDescription() { return description; }
    public int getMinimumRentalHours() { return minimumRentalHours == null ? 1 : minimumRentalHours; }
    public void configureRentalTerms(Long rate, String power, String body, String text, Integer minimum) {
        if (rate != null) { if (rate <= 0 || rate > 1000000) throw new IllegalArgumentException("시간당 가격은 1원 이상 1,000,000원 이하입니다."); hourlyRate=rate; }
        if (power != null) powerType=power;
        if (body != null) bodyType=body;
        if (text != null) description=text.isBlank() ? null : text.strip();
        if (minimum != null) { if (minimum < 1 || minimum > 24) throw new IllegalArgumentException("최소 대여 시간은 1~24시간입니다."); minimumRentalHours=minimum; }
    }
    public void clearClassification() { this.powerType=null; this.bodyType=null; }

    public void updateDetails(String maker, String name, Integer year, String plate) { manufacturer=maker.strip(); model=name.strip(); modelYear=year; licensePlate=plate.strip(); }
    private Boolean sharingEnabled;
    @Column(length = 200)
    private String pickupLocation;
    @Column(length = 200)
    private String pickupDetail;
    @Column(length = 500)
    private String pickupInstructions;
    private LocalDateTime deletedAt;
    private Double pickupLatitude;
    private Double pickupLongitude;
    @Enumerated(EnumType.STRING)
    private LockState lockState;
    public enum LockState { LOCKED, UNLOCKED }

    public boolean isSharingEnabled() { return Boolean.TRUE.equals(sharingEnabled); }
    public boolean isDeleted() { return deletedAt != null; }
    public void softDelete() { deletedAt = LocalDateTime.now(); sharingEnabled = false; }
    public void setSharingEnabled(boolean enabled) { sharingEnabled = enabled; }
    public String getPickupDetail() { return pickupDetail; }
    public String getPickupInstructions() { return pickupInstructions; }
    public void configurePickupDetails(String detail, String instructions) {
        if (detail != null) pickupDetail = detail.isBlank() ? null : detail.strip();
        if (instructions != null) pickupInstructions = instructions.isBlank() ? null : instructions.strip();
    }
    public String getPickupLocation() { return pickupLocation; }
    public Double getPickupLatitude() { return pickupLatitude; }
    public Double getPickupLongitude() { return pickupLongitude; }
    public LockState getLockState() { return lockState == null ? LockState.LOCKED : lockState; }
    public void setLockState(LockState state) { lockState = state; }
    public void configureSharing(boolean enabled, String location, Double latitude, Double longitude) {
        sharingEnabled = enabled;
        pickupLocation = location == null ? null : location.strip();
        pickupLatitude = latitude;
        pickupLongitude = longitude;
    }

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
