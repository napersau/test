package com.vetclinic.notification.service;

import com.vetclinic.common.security.RoleCode;
import com.vetclinic.notification.model.NotificationMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * Đẩy thông báo qua WebSocket và ghi vào lịch sử. Hai loại đích:
 * - người dùng: /user/queue/notifications (chỉ phiên của người đó; Principal của phiên là userId)
 * - vai trò:    /topic/role/&lt;ROLE&gt; (mọi phiên đang đăng ký kênh của vai trò đó)
 * Không có người nghe thì thông báo vẫn nằm trong lịch sử cho lần kết nối sau.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationDispatcher {

    public static final String USER_DESTINATION = "/queue/notifications";
    public static final String ROLE_DESTINATION_PREFIX = "/topic/role/";

    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationHistory history;

    public void toUser(Long userId, NotificationMessage message) {
        history.addForUser(userId, message);
        messagingTemplate.convertAndSendToUser(String.valueOf(userId), USER_DESTINATION, message);
        log.debug("Thông báo {} -> người dùng {}", message.type(), userId);
    }

    public void toRole(RoleCode role, NotificationMessage message) {
        history.addForRole(role, message);
        messagingTemplate.convertAndSend(ROLE_DESTINATION_PREFIX + role.name(), message);
        log.debug("Thông báo {} -> vai trò {}", message.type(), role);
    }
}
