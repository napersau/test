package com.vetclinic.notification.dto;

/** Phần của clinical-service VisitSummaryResponse mà notification cần để nhắm đúng người nhận và ghi tên thú cưng. */
public record VisitSummary(
        Long id,
        String visitCode,
        Long petId,
        String petName,
        Long ownerId,
        Long doctorId
) {
}
