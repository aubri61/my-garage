package com.mygarage.backend.vehicle;

import com.mygarage.backend.user.UserRepository;
import com.mygarage.backend.vehicle.dto.VehicleRequest;
import com.mygarage.backend.vehicle.dto.VehicleResponse;
import java.util.List;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class VehicleService {
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    private final org.springframework.context.ApplicationEventPublisher events;

    public VehicleService(VehicleRepository vehicleRepository, UserRepository userRepository, org.springframework.context.ApplicationEventPublisher events) {
        this.vehicleRepository = vehicleRepository;
        this.userRepository = userRepository;
        this.events = events;
    }

    @Transactional
    public VehicleResponse register(String email, VehicleRequest request) {
        var owner = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("사용자를 찾을 수 없습니다."));
        var vehicle = new Vehicle(owner, request.manufacturer(), request.model(),
                request.modelYear(), request.licensePlate());
        if (request.sharing() != null) {
            var sharing = request.sharing();
            vehicle.configureSharing(sharing.enabled(), sharing.pickupLocation(), sharing.latitude(), sharing.longitude());
            vehicle.configurePickupDetails(sharing.pickupDetail(), sharing.pickupInstructions());
        }
        vehicleRepository.save(vehicle);
        events.publishEvent(new com.mygarage.backend.sharing.NotificationService.VehicleChange(email));
        if (vehicle.isSharingEnabled()) events.publishEvent(new com.mygarage.backend.sharing.NotificationService.InventoryChange());
        return VehicleResponse.from(vehicle);
    }

    public List<VehicleResponse> list(String email) {
        return vehicleRepository.findAllByOwnerEmailOrderByCreatedAtDescIdDesc(email).stream()
                .map(VehicleResponse::from).toList();
    }

    public VehicleResponse detail(String email, Long id) {
        return VehicleResponse.from(vehicleRepository.findByIdAndOwnerEmail(id, email).filter(v -> !v.isDeleted())
                .orElseThrow(VehicleNotFoundException::new));
    }
}
