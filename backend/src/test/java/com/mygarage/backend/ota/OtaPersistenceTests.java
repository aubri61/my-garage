package com.mygarage.backend.ota;

import com.mygarage.backend.user.User;
import com.mygarage.backend.user.UserRepository;
import com.mygarage.backend.vehicle.Vehicle;
import com.mygarage.backend.vehicle.VehicleRepository;
import jakarta.persistence.EntityManager;
import jakarta.servlet.Filter;
import jakarta.servlet.http.Cookie;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Existing ddl-auto=update performs additive table creation only; all test INSERTs roll back.
@SpringBootTest
@Transactional
class OtaPersistenceTests {
    @Autowired WebApplicationContext context;
    @Autowired Filter springSecurityFilterChain;
    @Autowired UserRepository users;
    @Autowired VehicleRepository vehicles;
    @Autowired OtaVerificationRepository history;
    @Autowired EntityManager entityManager;
    @Autowired PasswordEncoder encoder;
    @Autowired ObjectMapper mapper;
    MockMvc mvc;

    @Test
    void realDatabaseSessionsHistoryIsolationAndOffModePreserveVehicle() throws Exception {
        mvc = MockMvcBuilders.webAppContextSetup(context).addFilters(springSecurityFilterChain).build();
        String suffix = UUID.randomUUID().toString();
        var alice = users.save(new User("OTA Alice", "ota-alice-" + suffix + "@example.com", encoder.encode("password123")));
        var bob = users.save(new User("OTA Bob", "ota-bob-" + suffix + "@example.com", encoder.encode("password123")));
        var alicesVehicle = vehicles.saveAndFlush(new Vehicle(alice, "Hyundai", "IONIQ 5", 2025, "123가4567"));
        var bobsVehicle = vehicles.saveAndFlush(new Vehicle(bob, "Kia", "EV6", 2025, "234나5678"));
        entityManager.refresh(alicesVehicle);
        var oldCreatedAt = alicesVehicle.getCreatedAt();
        var oldUpdatedAt = alicesVehicle.getUpdatedAt();
        long aliceId = alicesVehicle.getId();
        long bobId = bobsVehicle.getId();
        var aliceSession = login(alice.getEmail());
        var bobSession = login(bob.getEmail());
        var csrf = csrf(aliceSession);
        var first = mvc.perform(csrf.apply(post("/api/vehicles/" + aliceId + "/ota/verify").session(aliceSession))
                .contentType(MediaType.APPLICATION_JSON).content(body("TAMPERED_FILE", true)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("BLOCKED"))
                .andExpect(jsonPath("$.failureCode").value("HASH_MISMATCH")).andReturn();
        long blockedId = mapper.readTree(first.getResponse().getContentAsString()).get("historyId").asLong();
        var second = mvc.perform(csrf.apply(post("/api/vehicles/" + aliceId + "/ota/verify").session(aliceSession))
                .contentType(MediaType.APPLICATION_JSON).content(body("TAMPERED_FILE", false)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("SIMULATED_APPROVAL"))
                .andExpect(jsonPath("$.simulatedRisk.code").value("UNVERIFIED_HASH_MISMATCH")).andReturn();
        long offId = mapper.readTree(second.getResponse().getContentAsString()).get("historyId").asLong();
        var bobCsrf = csrf(bobSession);
        mvc.perform(bobCsrf.apply(post("/api/vehicles/" + bobId + "/ota/verify").session(bobSession))
                .contentType(MediaType.APPLICATION_JSON).content(body("VALID", true)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("APPROVED"));

        entityManager.flush();
        entityManager.clear();
        var records = history.findTop50ByVehicleIdAndExecutedByEmailAndVehicleOwnerEmailOrderByExecutedAtDescIdDesc(
                aliceId, alice.getEmail(), alice.getEmail());
        assertThat(records).extracting(OtaVerificationHistory::getId).containsExactly(offId, blockedId);
        assertThat(history.findTop50ByVehicleIdAndExecutedByEmailAndVehicleOwnerEmailOrderByExecutedAtDescIdDesc(
                aliceId, bob.getEmail(), bob.getEmail())).isEmpty();
        assertThat(history.findTop50ByVehicleIdAndExecutedByEmailAndVehicleOwnerEmailOrderByExecutedAtDescIdDesc(
                aliceId, alice.getEmail(), bob.getEmail())).isEmpty();
        assertThat(history.findTop50ByVehicleIdAndExecutedByEmailAndVehicleOwnerEmailOrderByExecutedAtDescIdDesc(
                aliceId, bob.getEmail(), alice.getEmail())).isEmpty();
        assertThat(history.findById(offId).orElseThrow().toResponse().status()).isEqualTo(OtaDtos.Status.SIMULATED_APPROVAL);
        var unchanged = vehicles.findById(aliceId).orElseThrow();
        assertThat(unchanged.getCreatedAt()).isEqualTo(oldCreatedAt);
        assertThat(unchanged.getUpdatedAt()).isEqualTo(oldUpdatedAt);
        assertThat(unchanged.getManufacturer()).isEqualTo("Hyundai");
        assertThat(unchanged.getModel()).isEqualTo("IONIQ 5");
        assertThat(unchanged.getLicensePlate()).isEqualTo("123가4567");
        assertThat(OtaVehicleState.from(unchanged).currentVersion()).isEqualTo("1.0.0");
        assertThat(OtaVehicleState.from(unchanged).securityVersion()).isEqualTo(10);

        mvc.perform(get("/api/vehicles/" + aliceId + "/ota/history").session(aliceSession))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value(offId));
        mvc.perform(get("/api/vehicles/" + aliceId + "/ota/history").session(bobSession))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("VEHICLE_NOT_FOUND"));
        mvc.perform(csrf.apply(post("/api/vehicles/" + bobId + "/ota/verify").session(aliceSession))
                .contentType(MediaType.APPLICATION_JSON).content(body("VALID", false)))
                .andExpect(status().isNotFound());
    }

    private MockHttpSession login(String email) throws Exception {
        var csrf = csrf(null);
        var result = mvc.perform(csrf.apply(post("/api/auth/login")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"password123\"}"))
                .andExpect(status().isOk()).andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    private Csrf csrf(MockHttpSession session) throws Exception {
        var request = get("/api/csrf");
        if (session != null) request.session(session);
        var result = mvc.perform(request).andExpect(status().isOk()).andReturn();
        var json = mapper.readTree(result.getResponse().getContentAsString());
        return new Csrf(result.getResponse().getCookie("XSRF-TOKEN"), json.get("headerName").asText(), json.get("token").asText());
    }

    private String body(String scenario, boolean protection) {
        return "{\"scenario\":\"" + scenario + "\",\"protectionEnabled\":" + protection + "}";
    }

    private record Csrf(Cookie cookie, String header, String token) {
        MockHttpServletRequestBuilder apply(MockHttpServletRequestBuilder request) {
            return request.cookie(cookie).header(header, token);
        }
    }
}
