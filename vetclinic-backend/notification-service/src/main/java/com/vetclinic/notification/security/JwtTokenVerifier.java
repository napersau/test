package com.vetclinic.notification.security;

import com.vetclinic.common.security.RoleCode;
import com.vetclinic.notification.config.NotificationProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

/**
 * Kiểm tra Access Token do auth-service ký (HS256) cho kết nối STOMP. Trình duyệt không gắn được header Authorization
 * cho WebSocket nên Gateway cho /ws/** đi qua và token được kiểm tra ở đây, trong frame CONNECT.
 * Claim: userId (chuỗi) và role (mã vai trò thô), giống Gateway.
 */
@Slf4j
@Component
public class JwtTokenVerifier {

    public record AuthenticatedUser(Long userId, RoleCode role) {
    }

    private final SecretKey signingKey;

    public JwtTokenVerifier(NotificationProperties properties) {
        this.signingKey = Keys.hmacShaKeyFor(properties.jwtSecret().getBytes(StandardCharsets.UTF_8));
    }

    public Optional<AuthenticatedUser> verify(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload();
            Long userId = Long.valueOf(String.valueOf(claims.get("userId")));
            RoleCode role = RoleCode.valueOf(String.valueOf(claims.get("role")));
            return Optional.of(new AuthenticatedUser(userId, role));
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("JWT của kết nối STOMP không hợp lệ: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
