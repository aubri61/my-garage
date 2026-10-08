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

    public VehicleService(VehicleRepository vehicleRepository, UserRepository userRepository) {
        this.vehicleRepository = vehicleRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public VehicleResponse register(String email, VehicleRequest request) {
        var owner = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("사용자를 찾을 수 없습니다."));
        var vehicle = new Vehicle(owner, request.manufacturer(), request.model(),
                request.modelYear(), request.licensePlate());
        return VehicleResponse.from(vehicleRepository.save(vehicle));
    }

    public List<VehicleResponse> list(String email) {
        return vehicleRepository.findAllByOwnerEmailOrderByCreatedAtDescIdDesc(email).stream()
                .map(VehicleResponse::from).toList();
    }

    public VehicleResponse detail(String email, Long id) {
        return VehicleResponse.from(vehicleRepository.findByIdAndOwnerEmail(id, email)
                .orElseThrow(VehicleNotFoundException::new));
    }
}
