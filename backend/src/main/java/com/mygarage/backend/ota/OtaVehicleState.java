package com.mygarage.backend.ota;

import com.mygarage.backend.vehicle.Vehicle;

// Server-owned educational baseline, never persisted or changed by a verification run.
public record OtaVehicleState(String manufacturer, String model, String hardwareId,
        String component, String currentVersion, long securityVersion) {
    public static OtaVehicleState from(Vehicle vehicle) {
        return new OtaVehicleState(vehicle.getManufacturer(), vehicle.getModel(),
                "SIM-HW-" + vehicle.getModelYear(), "INFOTAINMENT", "1.0.0", 10);
    }
}
