package com.mygarage.backend.user.exception;

public class DuplicateEmailException extends RuntimeException {

  public DuplicateEmailException(String message) {
    super(message);
  }
}
