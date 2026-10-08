package com.mygarage.backend.ota;

import jakarta.validation.Valid;
import java.security.Principal;
import java.util.Arrays;
import java.util.List;
import org.springframework.web.bind.annotation.*;

import static com.mygarage.backend.ota.OtaDtos.*;

@RestController
public class OtaController {
    private final OtaVerificationService verification;

    public OtaController(OtaVerificationService verification) {
        this.verification = verification;
    }

    @GetMapping("/api/ota/scenarios")
    public List<ScenarioResponse> scenarios() {
        return Arrays.stream(OtaScenario.values())
                .map(scenario -> new ScenarioResponse(scenario, scenario.getDescription())).toList();
    }

    @PostMapping("/api/vehicles/{vehicleId}/ota/verify")
    public VerifyResponse verify(Principal principal, @PathVariable Long vehicleId,
            @Valid @RequestBody VerifyRequest request) {
        return verification.simulate(principal.getName(), vehicleId, request);
    }

    @GetMapping("/api/vehicles/{vehicleId}/ota/history")
    public List<HistoryResponse> history(Principal principal, @PathVariable Long vehicleId) {
        return verification.history(principal.getName(), vehicleId);
    }
}
