package com.vetclinic.notification.model;

/** Loại thông báo để frontend chọn biểu tượng / hành vi (popup, chuông, huy hiệu Khóa ưu tiên...). */
public enum NotificationType {
    APPOINTMENT_CREATED,
    APPOINTMENT_UPDATED,
    VISIT_CHECKED_IN,
    PRIORITY_CALLBACK,
    PAYMENT_PENDING,
    VISIT_COMPLETED,
    LOW_STOCK
}
