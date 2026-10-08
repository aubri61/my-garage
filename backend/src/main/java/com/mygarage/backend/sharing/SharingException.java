package com.mygarage.backend.sharing;

import org.springframework.http.HttpStatus;

public class SharingException extends RuntimeException {
    public final HttpStatus status;
    public final String code;
    public SharingException(HttpStatus status, String code, String message) {
        super(message); this.status = status; this.code = code;
    }
}
