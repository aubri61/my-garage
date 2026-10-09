package com.mygarage.backend.sharing;

import com.mygarage.backend.vehicle.Vehicle;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;

public final class SharingDtos {
    private SharingDtos() {}
    public record SharingRequest(@NotNull Boolean enabled, @NotBlank @Size(max=200) String pickupLocation,
            @NotNull @DecimalMin("-90") @DecimalMax("90") Double latitude,
            @NotNull @DecimalMin("-180") @DecimalMax("180") Double longitude, @Size(max=200) String pickupDetail, @Size(max=500) String pickupInstructions) {
        public SharingRequest(Boolean enabled, String pickupLocation, Double latitude, Double longitude) {
            this(enabled, pickupLocation, latitude, longitude, null, null);
        }
    }
    public record SharingStateRequest(@NotNull Boolean enabled) {}
    // Public listing never exposes a plate, email, or owner entity.
    public record AvailableVehicle(Long id, String manufacturer, String model, Integer modelYear,
            String pickupLocation, Double latitude, Double longitude, Boolean available, String ownerName, String pickupDetail, String pickupInstructions, Long hourlyRate, String powerType, String bodyType, String description, int minimumRentalHours) {
        public static AvailableVehicle from(Vehicle v) { return from(v, null); }
        public static AvailableVehicle from(Vehicle v, Boolean available) {
            return new AvailableVehicle(v.getId(), v.getManufacturer(), v.getModel(), v.getModelYear(),
                    v.getPickupLocation(), v.getPickupLatitude(), v.getPickupLongitude(), available, v.getOwner().getName(), v.getPickupDetail(), v.getPickupInstructions(), v.getHourlyRate(), v.getPowerType(), v.getBodyType(), v.getDescription(), v.getMinimumRentalHours());
        }
    }
    public record PriceQuote(Long vehicleId, Long hourlyRate, int billedHours, Long estimatedTotal, String calculation) {}
    public record RentalRequest(@NotNull Long vehicleId, @NotNull Instant startsAt, @NotNull Instant endsAt) {}
    public record GrantView(boolean active, Instant startsAt, Instant endsAt, Instant revokedAt, String allowedOperation) {}
    public record UnlockView(Long id, RemoteUnlockRequest.Status status, Instant requestedAt, boolean pkiVerified) {}
    public record RentalView(Long id, Long vehicleId, String vehicleModel, Long ownerId, Long renterId,
            String pickupLocation, Instant startsAt, Instant endsAt, Rental.Status status,
            String termsVersion, String terms, Instant ownerConsentedAt, Instant renterConsentedAt,
            GrantView accessGrant, Vehicle.LockState lockState, List<UnlockView> unlockRequests, String ownerName, String renterName, String pickupDetail, String pickupInstructions, Long hourlyRate, Long estimatedTotal, Integer billedHours) {}
}
