package com.vetclinic.notification.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
public class NotificationConfig {

    /** Mọi mốc thời gian của thông báo đi qua Clock này (JVM chạy UTC; múi giờ phòng khám chỉ dùng khi hiển thị). */
    @Bean
    public Clock notificationClock(NotificationProperties properties) {
        return Clock.system(properties.zoneId());
    }
}
