package com.vetclinic.notification.config;

import com.vetclinic.notification.security.JwtTokenVerifier;
import com.vetclinic.notification.security.StompAuthChannelInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * In-memory STOMP broker. Client kết nối qua Gateway: ws://&lt;gateway&gt;:8080/ws
 * - /topic/role/&lt;ROLE&gt; : phát chung cho một vai trò (vd. /topic/role/RECEPTIONIST, /topic/role/ADMIN)
 * - /user/queue/notifications : kênh riêng của từng người dùng (vd. popup Khóa ưu tiên cho đúng Bác sĩ phụ trách)
 * JWT được kiểm tra trong frame CONNECT (xem StompAuthChannelInterceptor).
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final String[] allowedOriginPatterns;
    private final JwtTokenVerifier tokenVerifier;

    public WebSocketConfig(@Value("${vetclinic.websocket.allowed-origin-patterns:http://localhost:5173}") String[] allowedOriginPatterns,
                           JwtTokenVerifier tokenVerifier) {
        this.allowedOriginPatterns = allowedOriginPatterns;
        this.tokenVerifier = tokenVerifier;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOriginPatterns(allowedOriginPatterns);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Heartbeat 10s để kết nối nhàn rỗi không bị proxy / Gateway cắt và để dọn phiên chết
        registry.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[]{10_000, 10_000})
                .setTaskScheduler(websocketHeartbeatScheduler());
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new StompAuthChannelInterceptor(tokenVerifier));
    }

    @Bean
    public ThreadPoolTaskScheduler websocketHeartbeatScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("ws-heartbeat-");
        return scheduler;
    }
}
