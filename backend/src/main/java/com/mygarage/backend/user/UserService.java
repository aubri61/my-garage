package com.mygarage.backend.user;

import com.mygarage.backend.user.dto.SignupRequest;
import com.mygarage.backend.user.exception.DuplicateEmailException;

import org.springframework.stereotype.Service;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {
  private final UserRepository userRepository;

  private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();


  public UserService(UserRepository userRepository) {
    this.userRepository = userRepository;
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
