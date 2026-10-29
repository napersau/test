package com.vetclinic.notification.dto;

/** Phần của auth-service UserSummaryResponse mà notification cần (tên và email để gửi thư). */
public record UserSummary(
        Long id,
        String fullName,
        String email,
        String roomNumber
) {
}
