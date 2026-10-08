package com.mygarage.backend.user.dto;

public record LoginResponse(
    Long id,
    String email,
    String message
) {}