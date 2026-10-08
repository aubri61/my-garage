package com.mygarage.backend.user;

import com.mygarage.backend.user.dto.LoginRequest;
import com.mygarage.backend.user.dto.LoginResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthenticationManager authenticationManager;
  private final UserRepository userRepository;

  private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();

  public AuthController(
      AuthenticationManager authenticationManager,
      UserRepository userRepository) {
    this.authenticationManager = authenticationManager;
    this.userRepository = userRepository;
  }

  @PostMapping("/login")
  public ResponseEntity<LoginResponse> login(
      @Valid @RequestBody LoginRequest request,
      HttpServletRequest httpRequest,
      HttpServletResponse httpResponse) {
    // 1. 이메일과 비밀번호로 인증 요청
    Authentication authentication = authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(
            request.email(),
            request.password()));

    // 2. 인증 성공 정보를 SecurityContext에 저장
    SecurityContext context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(authentication);
    SecurityContextHolder.setContext(context);

    // 3. SecurityContext를 HTTP 세션에 저장
    httpRequest.getSession();
    httpRequest.changeSessionId();

    securityContextRepository.saveContext(
        context,
        httpRequest,
        httpResponse);

    // 4. 응답에 필요한 사용자 정보 조회
    User user = userRepository.findByEmail(request.email())
        .orElseThrow();

    return ResponseEntity.ok(
        new LoginResponse(
            user.getId(),
            user.getEmail(),
            "로그인 성공"));
  }
}