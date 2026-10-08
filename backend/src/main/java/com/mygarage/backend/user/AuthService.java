package com.mygarage.backend.user;

import com.mygarage.backend.user.dto.LoginRequest;
import com.mygarage.backend.user.dto.LoginResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final SessionAuthenticationStrategy sessionStrategy;
    private final SecurityContextRepository contextRepository;

    public AuthService(AuthenticationManager authenticationManager, UserService userService,
            SessionAuthenticationStrategy sessionStrategy, SecurityContextRepository contextRepository) {
        this.authenticationManager = authenticationManager;
        this.userService = userService;
        this.sessionStrategy = sessionStrategy;
        this.contextRepository = contextRepository;
    }

    public LoginResponse login(LoginRequest request, HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        var authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(request.email(), request.password()));
        var user = userService.currentUser(authentication.getName());
        sessionStrategy.onAuthentication(authentication, httpRequest, httpResponse);
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, httpRequest, httpResponse);
        return new LoginResponse(user.id(), user.email(), "로그인 성공");
    }
}
