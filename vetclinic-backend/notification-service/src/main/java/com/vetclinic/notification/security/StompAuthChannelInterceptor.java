package com.vetclinic.notification.security;

import com.vetclinic.common.security.RoleCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.Authentication;

import java.util.List;

/**
 * Cổng bảo mật của kênh STOMP (clientInboundChannel):
 * - CONNECT: bắt buộc có JWT hợp lệ (header Authorization: Bearer ... hoặc header token); gắn người dùng vào phiên.
 * - SUBSCRIBE: chỉ được nghe kênh riêng /user/queue/notifications và kênh của đúng vai trò mình /topic/role/<ROLE>.
 * - SEND: cấm hoàn toàn. Client chỉ nhận; thông báo chỉ do server phát từ sự kiện RabbitMQ.
 * Lỗi ném MessagingException thì Spring gửi frame ERROR và đóng kết nối.
 */
@Slf4j
@RequiredArgsConstructor
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    public static final String USER_QUEUE = "/user/queue/notifications";
    public static final String ROLE_TOPIC_PREFIX = "/topic/role/";

    private final JwtTokenVerifier tokenVerifier;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;   // heartbeat
        }
        StompCommand command = accessor.getCommand();
        switch (command) {
            case CONNECT, STOMP -> authenticate(accessor);
            case SUBSCRIBE -> authorizeSubscription(accessor);
            case SEND -> throw new MessagingException("Không được gửi dữ liệu lên kênh thông báo");
            default -> requireUser(accessor);   // UNSUBSCRIBE, DISCONNECT, ACK... chỉ dành cho phiên đã xác thực
        }
        return message;
    }

    private void authenticate(StompHeaderAccessor accessor) {
        String token = extractToken(accessor);
        JwtTokenVerifier.AuthenticatedUser user = token == null ? null : tokenVerifier.verify(token).orElse(null);
        if (user == null) {
            throw new MessagingException("Chưa đăng nhập hoặc token đã hết hạn");
        }
        accessor.setUser(new UsernamePasswordAuthenticationToken(String.valueOf(user.userId()), null,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.role().name()))));
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        Authentication user = requireUser(accessor);
        String destination = accessor.getDestination();
        if (USER_QUEUE.equals(destination)) {
            return;
        }
        if (destination != null && destination.startsWith(ROLE_TOPIC_PREFIX)
                && user.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_" + roleOf(destination)))) {
            return;
        }
        log.warn("Người dùng {} bị từ chối đăng ký kênh {}", user.getName(), destination);
        throw new MessagingException("Không có quyền đăng ký kênh này");
    }

    private static String roleOf(String destination) {
        String role = destination.substring(ROLE_TOPIC_PREFIX.length());
        try {
            return RoleCode.valueOf(role).name();
        } catch (IllegalArgumentException e) {
            return "?";   // không khớp quyền nào
        }
    }

    private static Authentication requireUser(StompHeaderAccessor accessor) {
        if (accessor.getUser() instanceof Authentication authentication) {
            return authentication;
        }
        throw new MessagingException("Chưa đăng nhập");
    }

    private static String extractToken(StompHeaderAccessor accessor) {
        String header = accessor.getFirstNativeHeader("Authorization");
        if (header != null && header.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return header.substring(7).trim();
        }
        String token = accessor.getFirstNativeHeader("token");
        return token == null || token.isBlank() ? null : token.trim();
    }
}
