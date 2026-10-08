package com.mygarage.backend.global.exception;

import com.mygarage.backend.global.dto.ErrorResponse;
import com.mygarage.backend.user.exception.DuplicateEmailException;
import org.springframework.web.bind.MethodArgumentNotValidException;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

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
