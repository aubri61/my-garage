package com.mygarage.backend.user;

import com.mygarage.backend.user.dto.SignupRequest;
import com.mygarage.backend.user.dto.UserResponse;
import org.springframework.security.authentication.BadCredentialsException;
import com.mygarage.backend.user.exception.DuplicateEmailException;

import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
  private final UserRepository userRepository;

  private final PasswordEncoder passwordEncoder;

  public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
    this.userRepository = userRepository;
    this.passwordEncoder = passwordEncoder;
  }

  @Transactional(readOnly = true)
  public UserResponse currentUser(String email) {
    User user = userRepository.findByEmail(email)
        .orElseThrow(() -> new BadCredentialsException("사용자를 찾을 수 없습니다."));
    return new UserResponse(user.getId(), user.getName(), user.getEmail());
  }

  @Transactional
  public Long signup(SignupRequest request) {

    //이미 가입된 이메일인지 확인
    if (userRepository.existsByEmail(request.email())) {
      throw new DuplicateEmailException("이미 가입된 이메일입니다.");
    }

    //평문 비밀번호를 bcrypt 해시화
    String passwordHash = passwordEncoder.encode(request.password());

    //User 생성
    User user = new User(request.name(), request.email(), passwordHash);

    // DB에 저장 하고 생성된 User의 id 반환
    User savedUser = userRepository.save(user);
    return savedUser.getId();
  }
}
