package com.mygarage.backend.sharing;

import com.mygarage.backend.vehicle.dto.VehicleResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.security.Principal;
import java.time.Clock;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import static com.mygarage.backend.sharing.SharingDtos.*;

@RestController
public class SharingController {
    private final SharingService service;
    private final NotificationService notifications;
    private final com.mygarage.backend.sharing.pki.PkiVerifier pki;
    public SharingController(SharingService service, NotificationService notifications, com.mygarage.backend.sharing.pki.PkiVerifier pki) { this.service=service; this.notifications=notifications; this.pki=pki; }
    @GetMapping("/api/vehicles/available") public List<AvailableVehicle> available(Principal p,
            @RequestParam(required=false) java.time.Instant startsAt, @RequestParam(required=false) java.time.Instant endsAt) {
        return service.available(p.getName(), startsAt, endsAt);
    }
    @GetMapping("/api/vehicles/available/{id}") public AvailableVehicle publicDetail(Principal p, @PathVariable Long id) { return service.publicDetail(p.getName(), id); }
    @PutMapping("/api/vehicles/{id}/sharing") public VehicleResponse sharing(Principal p, @PathVariable Long id, @Valid @RequestBody SharingRequest body) { return service.sharing(p.getName(), id, body); }
    @PostMapping("/api/vehicles/{id}/lock") public VehicleResponse lock(Principal p, @PathVariable Long id) { return service.lock(p.getName(), id); }
    @PostMapping("/api/rentals") @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    public RentalView request(Principal p, @Valid @RequestBody RentalRequest body) { return service.request(p.getName(), body); }
    @GetMapping("/api/rentals") public List<RentalView> list(Principal p) { return service.list(p.getName()); }
    @GetMapping("/api/rentals/{id}") public RentalView detail(Principal p, @PathVariable Long id) { return service.detail(p.getName(), id); }
    @PostMapping("/api/rentals/{id}/approve") public RentalView approve(Principal p, @PathVariable Long id) { return service.decide(p.getName(), id, true); }
    @PostMapping("/api/rentals/{id}/reject") public RentalView reject(Principal p, @PathVariable Long id) { return service.decide(p.getName(), id, false); }
    @PostMapping("/api/rentals/{id}/consents") public RentalView consent(Principal p, @PathVariable Long id) { return service.consent(p.getName(), id); }
    @GetMapping("/api/rentals/{id}/access-grant") public GrantView grant(Principal p, @PathVariable Long id) { return service.detail(p.getName(), id).accessGrant(); }
    @PostMapping("/api/rentals/{id}/access-grant/revoke") public RentalView revoke(Principal p, @PathVariable Long id) { return service.revoke(p.getName(), id, false); }
    @PostMapping("/api/rentals/{id}/complete") public RentalView complete(Principal p, @PathVariable Long id) { return service.revoke(p.getName(), id, true); }
    @PostMapping("/api/rentals/{id}/unlock-challenges") public SharingService.ChallengeView challenge(Principal p, @PathVariable Long id) { return service.challenge(p.getName(),id); }
    @PostMapping("/api/rentals/{id}/unlock-requests") public RentalView unlock(Principal p, @PathVariable Long id,
            @Valid @RequestBody(required=false) com.mygarage.backend.sharing.pki.PkiVerifier.Proof proof) { return service.requestUnlock(p.getName(), id, proof); }
    @GetMapping("/api/sharing/security") public java.util.Map<String,Boolean> security() { return java.util.Map.of("pkiRequired", pki.required()); }
    @PostMapping("/api/unlock-requests/{id}/approve") public RentalView approveUnlock(Principal p, @PathVariable Long id) { return service.decideUnlock(p.getName(), id, true); }
    @PostMapping("/api/unlock-requests/{id}/reject") public RentalView rejectUnlock(Principal p, @PathVariable Long id) { return service.decideUnlock(p.getName(), id, false); }
    @GetMapping(value="/api/notifications/stream", produces=MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(Principal p, HttpSession session, jakarta.servlet.http.HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-cache, no-transform");
        response.setHeader("X-Accel-Buffering", "no");
        return notifications.subscribe(p.getName(), session);
    }
    @Configuration static class TimeConfiguration { @Bean Clock sharingClock() { return Clock.systemUTC(); } }
}
