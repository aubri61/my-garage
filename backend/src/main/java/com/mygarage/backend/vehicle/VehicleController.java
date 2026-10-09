package com.mygarage.backend.vehicle;

import com.mygarage.backend.vehicle.dto.VehicleRequest;
import com.mygarage.backend.vehicle.dto.VehicleResponse;
import jakarta.validation.Valid;
import java.net.URI;
import java.security.Principal;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/vehicles")
public class VehicleController {
    private final VehicleService vehicleService;

    public VehicleController(VehicleService vehicleService) {
        this.vehicleService = vehicleService;
    }

    @PostMapping
    public ResponseEntity<VehicleResponse> register(Principal principal, @Valid @RequestBody VehicleRequest request) {
        var vehicle = vehicleService.register(principal.getName(), request);
        return ResponseEntity.created(URI.create("/api/vehicles/" + vehicle.id())).body(vehicle);
    }

    @PutMapping("/{id}")
    public VehicleResponse update(Principal principal, @PathVariable Long id, @Valid @RequestBody VehicleRequest request) { return vehicleService.update(principal.getName(),id,request); }

    @GetMapping
    public List<VehicleResponse> list(Principal principal) {
        return vehicleService.list(principal.getName());
    }

    @GetMapping("/{id}")
    public VehicleResponse detail(Principal principal, @PathVariable Long id) {
        return vehicleService.detail(principal.getName(), id);
    }
}
