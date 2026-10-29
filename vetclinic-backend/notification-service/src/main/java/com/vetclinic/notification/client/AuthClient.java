package com.vetclinic.notification.client;

import com.vetclinic.common.dto.ApiResponse;
import com.vetclinic.notification.dto.UserSummary;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

/** Endpoint nội bộ của auth-service (không cần header người dùng, Gateway không định tuyến ra ngoài). */
@FeignClient(name = "auth-service", path = "/internal/auth")
public interface AuthClient {

    @GetMapping("/users/{id}")
    ApiResponse<UserSummary> getUser(@PathVariable("id") Long id);
}
