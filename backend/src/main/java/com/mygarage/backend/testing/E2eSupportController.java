package com.mygarage.backend.testing;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import org.springframework.context.annotation.Profile;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@RestController
@Profile("e2e")
@RequestMapping("/api/test-support")
public class E2eSupportController {
    private final E2eEnvironment environment;
    private final JdbcTemplate jdbc;
    private final String token;
    public E2eSupportController(E2eEnvironment environment, JdbcTemplate jdbc, @Value("${e2e.token}") String token) {
        if (token.length()<32) throw new IllegalStateException("E2E_TOKEN must have at least 32 characters");
        this.environment=environment; this.jdbc=jdbc; this.token=token;
    }
    private void check(String supplied) {
        if (!MessageDigest.isEqual(token.getBytes(StandardCharsets.UTF_8), supplied.getBytes(StandardCharsets.UTF_8))) throw new ResponseStatusException(FORBIDDEN);
        environment.assertIsolated();
    }
    @GetMapping("/environment") public Map<String,Object> identity(@RequestHeader("X-E2E-Token") String supplied) {
        check(supplied); return Map.of("profile","e2e","identity",environment.identity());
    }
    public record Cleanup(String runId) {}
    /** Only explicitly namespaced accounts created by this test run; never truncates tables. */
    @PostMapping("/cleanup") @Transactional
    public Map<String,Object> cleanup(@RequestHeader("X-E2E-Token") String supplied, @RequestBody Cleanup input) {
        check(supplied);
        if (input.runId()==null || !input.runId().matches("[a-f0-9]{32}(-[a-f0-9]{32})?")) throw new ResponseStatusException(BAD_REQUEST);
        String prefix="e2e-"+input.runId()+"-%";
        String users="select id from users where email like ?";
        String vehicles="select id from vehicles where owner_id in ("+users+")";
        String rentals="select id from rentals where vehicle_id in ("+vehicles+") or renter_id in ("+users+")";
        // A cross-run/manual participant means cleanup requires review, not collateral deletion.
        Integer foreign=jdbc.queryForObject("select count(*) from rentals where vehicle_id in ("+vehicles+") and renter_id not in ("+users+")",Integer.class,prefix,prefix);
        Integer foreignOwner=jdbc.queryForObject("select count(*) from rentals where renter_id in ("+users+") and vehicle_id not in ("+vehicles+")",Integer.class,prefix,prefix);
        if (foreign>0 || foreignOwner>0) throw new ResponseStatusException(CONFLICT,"Cross-run rentals prevent cleanup");
        jdbc.update("delete from remote_unlock_requests where rental_id in ("+rentals+")",prefix,prefix);
        jdbc.update("delete from digital_access_grants where rental_id in ("+rentals+")",prefix,prefix);
        jdbc.update("delete from unlock_challenges where user_id in ("+users+")",prefix);
        jdbc.update("delete from security_audit_logs where rental_id in ("+rentals+") or actor_email in (select email from users where email like ?)",prefix,prefix,prefix);
        jdbc.update("delete from rentals where id in ("+rentals+")",prefix,prefix);
        jdbc.update("delete from ota_verification_history where vehicle_id in ("+vehicles+") or executed_by_id in ("+users+")",prefix,prefix);
        jdbc.update("delete from vehicles where id in ("+vehicles+")",prefix);
        int removed=jdbc.update("delete from users where id in ("+users+")",prefix);
        return Map.of("removedAccounts",removed,"database",environment.identity().get("database"));
    }
}
