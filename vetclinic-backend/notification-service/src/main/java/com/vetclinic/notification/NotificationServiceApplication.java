package com.vetclinic.notification;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.cloud.openfeign.EnableFeignClients;

@ConfigurationPropertiesScan
@EnableFeignClients(basePackages = "com.vetclinic.notification.client")
@SpringBootApplication(scanBasePackages = "com.vetclinic")
public class NotificationServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(NotificationServiceApplication.class, args);
    }
}
