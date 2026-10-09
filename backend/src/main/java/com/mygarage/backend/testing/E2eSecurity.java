package com.mygarage.backend.testing;
import org.springframework.context.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
@Configuration @Profile("e2e")
public class E2eSecurity {
    // Only this test-profile surface uses the run token. Normal session/CSRF chains are unchanged.
    @Bean @Order(1) SecurityFilterChain e2eChain(HttpSecurity http) throws Exception {
        return http.securityMatcher("/api/test-support/**").csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll()).build();
    }
}
