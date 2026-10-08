package com.mygarage.backend.user;

import com.mygarage.backend.user.dto.SignupRequest;
import com.mygarage.backend.user.dto.SignupResponse;
import com.mygarage.backend.user.dto.UserResponse;
import java.security.Principal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {
  private final UserService userService;

  public UserController(UserService userService) {
    this.userService = userService;
  }

  @GetMapping("/me")
  public UserResponse me(Principal principal) {
    return userService.currentUser(principal.getName());
  }

  @PostMapping("/signup")
  public ResponseEntity<SignupResponse> signup(@Valid @RequestBody SignupRequest request) {

    Long userId = userService.signup(request);
    return ResponseEntity.status(HttpStatus.CREATED).body(new SignupResponse(userId, "회원가입 성공"));
  }
}