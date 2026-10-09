package com.mygarage.backend.vehicle.dto;

import com.mygarage.backend.vehicle.Vehicle;
import java.time.LocalDateTime;

public record VehicleResponse(Long id, String manufacturer, String model, Integer modelYear,
        String licensePlate, LocalDateTime createdAt, LocalDateTime updatedAt, boolean sharingEnabled, String pickupLocation, Double pickupLatitude, Double pickupLongitude, Vehicle.LockState lockState, String pickupDetail, String pickupInstructions, Long hourlyRate, String powerType, String bodyType, String description, int minimumRentalHours) {
    public static VehicleResponse from(Vehicle vehicle) {
        return new VehicleResponse(vehicle.getId(), vehicle.getManufacturer(), vehicle.getModel(),
                vehicle.getModelYear(), vehicle.getLicensePlate(), vehicle.getCreatedAt(), vehicle.getUpdatedAt(), vehicle.isSharingEnabled(), vehicle.getPickupLocation(), vehicle.getPickupLatitude(), vehicle.getPickupLongitude(), vehicle.getLockState(), vehicle.getPickupDetail(), vehicle.getPickupInstructions(), vehicle.getHourlyRate(), vehicle.getPowerType(), vehicle.getBodyType(), vehicle.getDescription(), vehicle.getMinimumRentalHours());
    }
}
