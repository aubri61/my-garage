package com.mygarage.backend.global.dto;

public record ErrorResponse(
  String code,
  String message
) {
  
}
