package com.mygarage.backend.vehicle.dto;

import jakarta.validation.constraints.*;
import jakarta.validation.Valid;
import com.mygarage.backend.sharing.SharingDtos.SharingRequest;

public record VehicleRequest(
        @NotBlank @Size(max = 80) String manufacturer,
        @NotBlank @Size(max = 100) String model,
        @NotNull @Min(1886) @Max(2100) Integer modelYear,
        @NotBlank @Size(max = 30) String licensePlate,
        @Valid SharingRequest sharing) {
    public VehicleRequest(String manufacturer, String model, Integer modelYear, String licensePlate) {
        this(manufacturer, model, modelYear, licensePlate, null);
    }
}
