package com.mygarage.backend.global.exception;

import com.mygarage.backend.user.exception.DuplicateEmailException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
  
  @ExceptionHandler(DuplicateEmailException.class)
  public ResponseEntity<String> handleDuplicateEmail(DuplicateEmailException e) {

    return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
  }

}
