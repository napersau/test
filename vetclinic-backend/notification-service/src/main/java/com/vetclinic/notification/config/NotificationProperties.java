package com.vetclinic.notification.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.nio.charset.StandardCharsets;
import java.time.ZoneId;

/**
 * @param jwtSecret   khóa HMAC-SHA256 dùng chung với auth-service và Gateway (JWT_SECRET, tối thiểu 32 byte)
 * @param mailFrom    địa chỉ người gửi email
 * @param historySize số thông báo gần nhất giữ trong bộ nhớ cho mỗi người dùng / vai trò
 * @param zone        múi giờ hiển thị thời gian trong email
 */
@ConfigurationProperties(prefix = "vetclinic.notification")
public record NotificationProperties(
        String jwtSecret,
        @DefaultValue("no-reply@vetclinic.local") String mailFrom,
        @DefaultValue("50") int historySize,
        @DefaultValue("Asia/Ho_Chi_Minh") String zone
) {

    public NotificationProperties {
        if (jwtSecret == null || jwtSecret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("vetclinic.notification.jwt-secret (JWT_SECRET) phải dài tối thiểu 32 byte");
        }
        if (historySize < 1) {
            throw new IllegalStateException("vetclinic.notification.history-size phải >= 1");
        }
        ZoneId.of(zone); // sai múi giờ thì dừng ngay lúc khởi động
    }

    public ZoneId zoneId() {
        return ZoneId.of(zone);
    }
}
