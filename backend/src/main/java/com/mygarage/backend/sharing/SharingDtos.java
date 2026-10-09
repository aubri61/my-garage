package com.mygarage.backend.sharing;

import com.mygarage.backend.vehicle.Vehicle;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class SharingDtos {
    private SharingDtos() {}
    public record SharingRequest(@NotNull Boolean enabled, @NotBlank @Size(max=200) String pickupLocation,
            @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude) {}
    // Public listing never exposes a plate, email, or owner entity.
    public record AvailableVehicle(Long id, String manufacturer, String model, Integer modelYear,
            String pickupLocation, Double latitude, Double longitude, Boolean available, String ownerName) {
        public static AvailableVehicle from(Vehicle v) { return from(v, null); }
        public static AvailableVehicle from(Vehicle v, Boolean available) {
            return new AvailableVehicle(v.getId(), v.getManufacturer(), v.getModel(), v.getModelYear(),
                    v.getPickupLocation(), v.getPickupLatitude(), v.getPickupLongitude(), available, v.getOwner().getName());
        }
    }
    public record RentalRequest(@NotNull Long vehicleId, @NotNull Instant startsAt, @NotNull Instant endsAt) {}
    public record GrantView(boolean active, Instant startsAt, Instant endsAt, Instant revokedAt, String allowedOperation) {}
    public record UnlockView(Long id, RemoteUnlockRequest.Status status, Instant requestedAt, boolean pkiVerified) {}
    public record RentalView(Long id, Long vehicleId, String vehicleModel, Long ownerId, Long renterId,
            String pickupLocation, Instant startsAt, Instant endsAt, Rental.Status status,
            String termsVersion, String terms, Instant ownerConsentedAt, Instant renterConsentedAt,
            GrantView accessGrant, Vehicle.LockState lockState, List<UnlockView> unlockRequests, String ownerName, String renterName) {}
}
