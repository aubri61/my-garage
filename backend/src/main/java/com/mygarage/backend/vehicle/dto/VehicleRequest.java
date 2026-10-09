package com.mygarage.backend.vehicle.dto;

import jakarta.validation.constraints.*;
import jakarta.validation.Valid;
import com.mygarage.backend.sharing.SharingDtos.SharingRequest;

public record VehicleRequest(
        @NotBlank @Size(max = 80) String manufacturer,
        @NotBlank @Size(max = 100) String model,
        @NotNull @Min(1886) @Max(2100) Integer modelYear,
        @NotBlank @Size(max = 30) String licensePlate,
        @Valid SharingRequest sharing,
        @Min(1) @Max(1000000) Long hourlyRate,
        @Size(max=20) String powerType,
        @Size(max=20) String bodyType,
        @Size(max=2000) String description,
        @Min(1) @Max(24) Integer minimumRentalHours) {
    public VehicleRequest(String manufacturer, String model, Integer modelYear, String licensePlate, SharingRequest sharing) {
        this(manufacturer, model, modelYear, licensePlate, sharing, null, null, null, null, null);
    }
    public VehicleRequest(String manufacturer, String model, Integer modelYear, String licensePlate) {
        this(manufacturer, model, modelYear, licensePlate, null);
    }
}
