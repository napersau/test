package com.vetclinic.notification.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SendEmailRequest(
        @NotBlank @Email @Size(max = 150) String to,
        @NotBlank @Size(max = 200) String subject,
        @NotBlank @Size(max = 10000) String content
) {
}
