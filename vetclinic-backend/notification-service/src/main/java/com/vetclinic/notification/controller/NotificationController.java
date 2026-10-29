package com.vetclinic.notification.controller;

import com.vetclinic.common.dto.ApiResponse;
import com.vetclinic.common.exception.AppException;
import com.vetclinic.common.exception.ErrorCode;
import com.vetclinic.common.security.SecurityUtils;
import com.vetclinic.notification.dto.SendEmailRequest;
import com.vetclinic.notification.model.NotificationMessage;
import com.vetclinic.notification.service.EmailService;
import com.vetclinic.notification.service.NotificationHistory;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private static final int MAX_LIMIT = 100;

    private final NotificationHistory history;
    private final EmailService emailService;

    /**
     * Thông báo gần nhất của người đăng nhập (riêng + chung của vai trò), mới nhất trước. Dùng khi vừa đăng nhập hoặc
     * kết nối lại WebSocket để lấy các thông báo đã lỡ. Lưu trong bộ nhớ nên mất khi service khởi động lại.
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<NotificationMessage>>> recent(@RequestParam(defaultValue = "30") int limit) {
        Long userId = SecurityUtils.getCurrentUserId();
        var role = SecurityUtils.getCurrentRole().orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));
        return ResponseEntity.ok(ApiResponse.success(history.recent(userId, role, Math.min(Math.max(limit, 1), MAX_LIMIT))));
    }

    /** Quản trị viên gửi thư thủ công (vd. thông báo đến chủ nuôi). */
    @PostMapping("/send-email")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> sendEmail(@Valid @RequestBody SendEmailRequest request) {
        emailService.send(request.to().trim(), request.subject().trim(), request.content());
        return ResponseEntity.ok(ApiResponse.success("Đã gửi email", null));
    }
}
