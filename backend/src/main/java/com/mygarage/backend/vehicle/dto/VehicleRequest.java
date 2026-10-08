package com.mygarage.backend.vehicle.dto;

import jakarta.validation.constraints.*;

public record VehicleRequest(
        @NotBlank @Size(max = 80) String manufacturer,
        @NotBlank @Size(max = 100) String model,
        @NotNull @Min(1886) @Max(2100) Integer modelYear,
        @NotBlank @Size(max = 30) String licensePlate) {}
