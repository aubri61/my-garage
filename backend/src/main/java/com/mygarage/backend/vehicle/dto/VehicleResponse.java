package com.mygarage.backend.vehicle.dto;

import com.mygarage.backend.vehicle.Vehicle;
import java.time.LocalDateTime;

public record VehicleResponse(Long id, String manufacturer, String model, Integer modelYear,
        String licensePlate, LocalDateTime createdAt, LocalDateTime updatedAt) {
    public static VehicleResponse from(Vehicle vehicle) {
        return new VehicleResponse(vehicle.getId(), vehicle.getManufacturer(), vehicle.getModel(),
                vehicle.getModelYear(), vehicle.getLicensePlate(), vehicle.getCreatedAt(), vehicle.getUpdatedAt());
    }
}
