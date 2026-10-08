package com.mygarage.backend.security;

import com.mygarage.backend.global.config.SecurityConfig;
import com.mygarage.backend.global.controller.CsrfController;
import com.mygarage.backend.user.*;
import com.mygarage.backend.vehicle.*;
import com.mygarage.backend.ota.*;
import jakarta.servlet.Filter;
import jakarta.servlet.http.Cookie;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Real security filter chain, authentication provider, BCrypt and services; only persistence is mocked.
@WebMvcTest(controllers = {AuthController.class, UserController.class, CsrfController.class, VehicleController.class, OtaController.class})
@Import({SecurityConfig.class, CustomUserDetailsService.class, AuthService.class, UserService.class, VehicleService.class, OtaCryptoService.class, OtaScenarioService.class, OtaVerificationService.class})
class SessionVehicleApiTests {
    @Autowired WebApplicationContext context;
    @Autowired Filter springSecurityFilterChain;
    @Autowired PasswordEncoder encoder;
    @Autowired ObjectMapper mapper;
    @MockitoBean UserRepository users;
    @MockitoBean VehicleRepository vehicles;
    @MockitoBean OtaVerificationRepository otaHistory;
    MockMvc mvc;
    User alice;
    User bob;

    @BeforeEach
    void setup() {
        mvc = MockMvcBuilders.webAppContextSetup(context).addFilters(springSecurityFilterChain).build();
        alice = user(1L, "alice@example.com");
        bob = user(2L, "bob@example.com");
        when(users.findByEmail(alice.getEmail())).thenReturn(Optional.of(alice));
        when(users.findByEmail(bob.getEmail())).thenReturn(Optional.of(bob));
    }

    @Test
    void loginRotatesSessionAndPersistsAuthenticationWithoutExposingPassword() throws Exception {
        var session = new MockHttpSession();
        String oldId = session.getId();
        var csrf = csrf(session);
        var result = mvc.perform(csrf.apply(post("/api/auth/login").session(session))
                .contentType(MediaType.APPLICATION_JSON).content(loginBody(alice.getEmail(), "password123")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist()).andReturn();
        assertThat(session.getId()).isNotEqualTo(oldId);
        assertThat(session.getAttribute("SPRING_SECURITY_CONTEXT")).isNotNull();
        assertThat(result.getResponse().getCookies()).anySatisfy(cookie -> {
            assertThat(cookie.getName()).isEqualTo("XSRF-TOKEN");
            assertThat(cookie.getMaxAge()).isZero();
        });
        mvc.perform(get("/api/users/me").session(session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(alice.getEmail()))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void wrongPasswordAndUnknownEmailReturnSame401Json() throws Exception {
        for (String email : List.of(alice.getEmail(), "unknown@example.com")) {
            var csrf = csrf(null);
            var result = mvc.perform(csrf.apply(post("/api/auth/login"))
                    .contentType(MediaType.APPLICATION_JSON).content(loginBody(email, "wrongpassword")))
                    .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                    .andReturn();
            assertThat(result.getRequest().getSession(false)).isNull();
        }
    }

    @Test
    void logoutInvalidatesSessionAndClearsCookies() throws Exception {
        var session = login(alice.getEmail());
        var csrf = csrf(session);
        var result = mvc.perform(csrf.apply(post("/api/auth/logout").session(session)))
                .andExpect(status().isNoContent()).andReturn();
        assertThat(session.isInvalid()).isTrue();
        assertThat(result.getResponse().getCookie("JSESSIONID").getMaxAge()).isZero();
        mvc.perform(get("/api/users/me")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void unauthenticatedReadApisReturn401Json() throws Exception {
        for (String path : List.of("/api/users/me", "/api/vehicles", "/api/vehicles/1")) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        }
    }

    @Test
    void missingAndInvalidCsrfRejectStateChanges() throws Exception {
        for (String path : List.of("/api/auth/login", "/api/users/signup")) {
            mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }
        var session = login(alice.getEmail());
        for (String path : List.of("/api/vehicles", "/api/auth/logout")) {
            mvc.perform(post(path).session(session).contentType(MediaType.APPLICATION_JSON).content(vehicleBody()))
                    .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        }
        var csrf = csrf(session);
        mvc.perform(post("/api/vehicles").session(session).cookie(csrf.cookie())
                .header(csrf.header(), "invalid").contentType(MediaType.APPLICATION_JSON).content(vehicleBody()))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/users/me").session(session)).andExpect(status().isOk());
        verifyNoInteractions(vehicles);
    }

    @Test
    void registerIgnoresSuppliedUserIdAndListsOnlyCurrentOwner() throws Exception {
        var session = login(alice.getEmail());
        var csrf = csrf(session);
        when(vehicles.save(any(Vehicle.class))).thenAnswer(invocation -> {
            Vehicle vehicle = invocation.getArgument(0);
            assertThat(ReflectionTestUtils.getField(vehicle, "owner")).isSameAs(alice);
            ReflectionTestUtils.setField(vehicle, "id", 10L);
            ReflectionTestUtils.invokeMethod(vehicle, "onCreate");
            return vehicle;
        });
        mvc.perform(csrf.apply(post("/api/vehicles").session(session)).contentType(MediaType.APPLICATION_JSON)
                .content(vehicleBody().replace("}", ",\"userId\":2}")))
                .andExpect(status().isCreated()).andExpect(header().string("Location", "/api/vehicles/10"))
                .andExpect(jsonPath("$.id").value(10)).andExpect(jsonPath("$.owner").doesNotExist())
                .andExpect(jsonPath("$.createdAt").isNotEmpty());
        when(vehicles.findAllByOwnerEmailOrderByCreatedAtDescIdDesc(alice.getEmail()))
                .thenReturn(List.of(vehicle(10L, alice)));
        mvc.perform(get("/api/vehicles").session(session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].id").value(10));
        verify(vehicles).findAllByOwnerEmailOrderByCreatedAtDescIdDesc(alice.getEmail());
    }

    @Test
    void otherOwnersVehicleAndMissingVehicleBothReturn404() throws Exception {
        when(vehicles.findByIdAndOwnerEmail(20L, bob.getEmail())).thenReturn(Optional.of(vehicle(20L, bob)));
        var aliceSession = login(alice.getEmail());
        for (long id : List.of(20L, 999L)) {
            mvc.perform(get("/api/vehicles/" + id).session(aliceSession)).andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.code").value("VEHICLE_NOT_FOUND"));
        }
        verify(vehicles).findByIdAndOwnerEmail(20L, alice.getEmail());
        mvc.perform(get("/api/vehicles/20").session(login(bob.getEmail())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(20));
        verify(vehicles, never()).findById(anyLong());
    }

    @Test
    void emptyListAndInvalidVehicleInput() throws Exception {
        var session = login(alice.getEmail());
        mvc.perform(get("/api/vehicles").session(session)).andExpect(status().isOk())
                .andExpect(content().json("[]"));
        var csrf = csrf(session);
        mvc.perform(csrf.apply(post("/api/vehicles").session(session)).contentType(MediaType.APPLICATION_JSON)
                .content("{\"manufacturer\":\" \",\"model\":\"\",\"modelYear\":1800,\"licensePlate\":\"\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        verify(vehicles, never()).save(any());
    }

    @Test
    void signupStillUsesCsrfAndBcrypt() throws Exception {
        var csrf = csrf(null);
        when(users.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            assertThat(encoder.matches("password123", user.getPasswordHash())).isTrue();
            ReflectionTestUtils.setField(user, "id", 3L);
            return user;
        });
        mvc.perform(csrf.apply(post("/api/users/signup")).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"New User\",\"email\":\"new@example.com\",\"password\":\"password123\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.userId").value(3));
    }

    @Test
    void otaRequiresAuthenticationAndCsrf() throws Exception {
        for (String path : List.of("/api/ota/scenarios", "/api/vehicles/10/ota/history")) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        }
        var anonymousCsrf = csrf(null);
        mvc.perform(anonymousCsrf.apply(post("/api/vehicles/10/ota/verify"))
                .contentType(MediaType.APPLICATION_JSON).content(otaBody("VALID", true)))
                .andExpect(status().isUnauthorized());
        var session = login(alice.getEmail());
        mvc.perform(get("/api/ota/scenarios").session(session)).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(7));
        mvc.perform(post("/api/vehicles/10/ota/verify").session(session)
                .contentType(MediaType.APPLICATION_JSON).content(otaBody("VALID", true)))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        verifyNoInteractions(otaHistory);
    }

    @Test
    void otaCannotVerifyOrReadAnotherOwnersVehicle() throws Exception {
        var session = login(alice.getEmail());
        var csrf = csrf(session);
        mvc.perform(csrf.apply(post("/api/vehicles/20/ota/verify").session(session))
                .contentType(MediaType.APPLICATION_JSON).content(otaBody("VALID", true)))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("VEHICLE_NOT_FOUND"));
        mvc.perform(get("/api/vehicles/20/ota/history").session(session))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("VEHICLE_NOT_FOUND"));
        verifyNoInteractions(otaHistory);
    }

    @Test
    void otaAllScenariosUseEngineAndOffModeNeverMutatesVehicle() throws Exception {
        var owned = vehicle(10L, alice);
        when(vehicles.findByIdAndOwnerEmail(10L, alice.getEmail())).thenReturn(Optional.of(owned));
        when(otaHistory.save(any(OtaVerificationHistory.class))).thenAnswer(invocation -> {
            OtaVerificationHistory record = invocation.getArgument(0);
            assertThat(ReflectionTestUtils.getField(record, "executedBy")).isSameAs(alice);
            assertThat(ReflectionTestUtils.getField(record, "vehicle")).isSameAs(owned);
            ReflectionTestUtils.setField(record, "id", 100L);
            return record;
        });
        var snapshot = new Object[] {owned.getId(), owned.getOwner(), owned.getManufacturer(), owned.getModel(),
                owned.getModelYear(), owned.getLicensePlate(), owned.getCreatedAt(), owned.getUpdatedAt()};
        var session = login(alice.getEmail());
        var csrf = csrf(session);
        for (var scenario : OtaScenario.values()) {
            mvc.perform(csrf.apply(post("/api/vehicles/10/ota/verify").session(session))
                    .contentType(MediaType.APPLICATION_JSON).content(otaBody(scenario.name(), true)))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.status")
                            .value(scenario == OtaScenario.VALID ? "APPROVED" : "BLOCKED"))
                    .andExpect(jsonPath("$.historyId").value(100))
                    .andExpect(jsonPath("$.simulatedRisk").isEmpty());
            mvc.perform(csrf.apply(post("/api/vehicles/10/ota/verify").session(session))
                    .contentType(MediaType.APPLICATION_JSON).content(otaBody(scenario.name(), false)))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("SIMULATED_APPROVAL"))
                    .andExpect(jsonPath("$.failureCode").isEmpty())
                    .andExpect(jsonPath("$.simulatedRisk.code").isNotEmpty())
                    .andExpect(jsonPath("$.checks[0].status").value("NOT_RUN"));
        }
        assertThat(new Object[] {owned.getId(), owned.getOwner(), owned.getManufacturer(), owned.getModel(),
                owned.getModelYear(), owned.getLicensePlate(), owned.getCreatedAt(), owned.getUpdatedAt()})
                .containsExactly(snapshot);
        verify(vehicles, never()).save(any());
        verify(users, never()).save(any());
        verify(otaHistory, times(14)).save(any());
    }

    @Test
    void otaHistoryFiltersVehicleAndActorAndOwner() throws Exception {
        var owned = vehicle(10L, alice);
        when(vehicles.findByIdAndOwnerEmail(10L, alice.getEmail())).thenReturn(Optional.of(owned));
        var record = new OtaVerificationHistory(owned, alice, OtaScenario.VALID, true, OtaDtos.Status.APPROVED, null);
        ReflectionTestUtils.setField(record, "id", 100L);
        when(otaHistory.findTop50ByVehicleIdAndExecutedByEmailAndVehicleOwnerEmailOrderByExecutedAtDescIdDesc(
                10L, alice.getEmail(), alice.getEmail())).thenReturn(List.of(record));
        mvc.perform(get("/api/vehicles/10/ota/history").session(login(alice.getEmail())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(100)).andExpect(jsonPath("$[0].vehicleId").value(10))
                .andExpect(jsonPath("$[0].fileBytes").doesNotExist())
                .andExpect(jsonPath("$[0].executedBy").doesNotExist());
        verify(otaHistory).findTop50ByVehicleIdAndExecutedByEmailAndVehicleOwnerEmailOrderByExecutedAtDescIdDesc(
                10L, alice.getEmail(), alice.getEmail());
    }

    @Test
    void malformedOtaRequestsReturn400Json() throws Exception {
        var session = login(alice.getEmail());
        var csrf = csrf(session);
        for (String body : List.of("{}", "{\"scenario\":\"VALID\"}",
                "{\"scenario\":\"UNKNOWN\",\"protectionEnabled\":true}",
                "{\"scenario\":null,\"protectionEnabled\":true}")) {
            mvc.perform(csrf.apply(post("/api/vehicles/10/ota/verify").session(session))
                    .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_REQUEST"));
        }
        verifyNoInteractions(otaHistory);
    }

    private String otaBody(String scenario, boolean protection) {
        return "{\"scenario\":\"" + scenario + "\",\"protectionEnabled\":" + protection + "}";
    }

    private User user(long id, String email) {
        var user = new User("Test User", email, encoder.encode("password123"));
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    private Vehicle vehicle(long id, User owner) {
        var vehicle = new Vehicle(owner, "Hyundai", "IONIQ 5", 2025, "123가4567");
        ReflectionTestUtils.setField(vehicle, "id", id);
        return vehicle;
    }

    private MockHttpSession login(String email) throws Exception {
        var csrf = csrf(null);
        MvcResult result = mvc.perform(csrf.apply(post("/api/auth/login"))
                .contentType(MediaType.APPLICATION_JSON).content(loginBody(email, "password123")))
                .andExpect(status().isOk()).andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    private Csrf csrf(MockHttpSession session) throws Exception {
        var request = get("/api/csrf");
        if (session != null) request.session(session);
        var result = mvc.perform(request).andExpect(status().isOk()).andReturn();
        var body = mapper.readTree(result.getResponse().getContentAsString());
        return new Csrf(result.getResponse().getCookie("XSRF-TOKEN"),
                body.get("headerName").asText(), body.get("token").asText());
    }

    private String loginBody(String email, String password) {
        return "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}";
    }

    private String vehicleBody() {
        return "{\"manufacturer\":\"Hyundai\",\"model\":\"IONIQ 5\",\"modelYear\":2025,\"licensePlate\":\"123가4567\"}";
    }

    private record Csrf(Cookie cookie, String header, String token) {
        MockHttpServletRequestBuilder apply(MockHttpServletRequestBuilder request) {
            return request.cookie(cookie).header(header, token);
        }
    }
}
