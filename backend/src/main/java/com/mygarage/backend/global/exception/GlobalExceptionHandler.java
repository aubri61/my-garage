package com.mygarage.backend.global.exception;

import com.mygarage.backend.global.dto.ErrorResponse;
import com.mygarage.backend.user.exception.DuplicateEmailException;
import com.mygarage.backend.vehicle.VehicleNotFoundException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(AuthenticationException.class)
  public ResponseEntity<ErrorResponse> handleAuthentication() {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
        .body(new ErrorResponse("UNAUTHORIZED", "이메일 또는 비밀번호를 확인해주세요."));
  }

  @ExceptionHandler(VehicleNotFoundException.class)
  public ResponseEntity<ErrorResponse> handleVehicleNotFound() {
    return ResponseEntity.status(HttpStatus.NOT_FOUND)
        .body(new ErrorResponse("VEHICLE_NOT_FOUND", "차량을 찾을 수 없습니다."));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ErrorResponse> handleUnreadableRequest() {
    return ResponseEntity.badRequest().body(new ErrorResponse("INVALID_REQUEST", "입력값을 확인해주세요."));
  }

  @ExceptionHandler(DuplicateEmailException.class)
  public ResponseEntity<ErrorResponse> handleDuplicateEmail(DuplicateEmailException e) {

    return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse("DUPLICATE_EMAIL", e.getMessage()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ErrorResponse> handleMethodArgumentNotValid(
      MethodArgumentNotValidException e) {
    return ResponseEntity
        .status(HttpStatus.BAD_REQUEST)
        .body(new ErrorResponse(
            "INVALID_REQUEST",
            "입력값을 확인해주세요."));
  }

}
