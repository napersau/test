package com.vetclinic.notification.service;

import com.vetclinic.common.security.RoleCode;
import com.vetclinic.notification.config.NotificationProperties;
import com.vetclinic.notification.model.NotificationMessage;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Comparator;
import java.util.Deque;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;

/**
 * Lịch sử gần nhất trong BỘ NHỚ (notification-service không có CSDL): để client vừa đăng nhập hoặc vừa kết nối lại lấy
 * được các thông báo đã lỡ qua GET /api/v1/notifications. Mất khi service khởi động lại; chỉ đúng với một instance.
 */
@Component
public class NotificationHistory {

    private final int capacity;
    private final Map<String, Deque<NotificationMessage>> buckets = new ConcurrentHashMap<>();

    public NotificationHistory(NotificationProperties properties) {
        this.capacity = properties.historySize();
    }

    public void addForUser(Long userId, NotificationMessage message) {
        add("user:" + userId, message);
    }

    public void addForRole(RoleCode role, NotificationMessage message) {
        add("role:" + role.name(), message);
    }

    /** Thông báo riêng của người dùng cộng thông báo chung của vai trò, mới nhất trước. */
    public List<NotificationMessage> recent(Long userId, RoleCode role, int limit) {
        return Stream.concat(snapshot("user:" + userId).stream(), snapshot("role:" + role.name()).stream())
                .sorted(Comparator.comparing(NotificationMessage::createdAt).reversed())
                .limit(Math.max(limit, 0))
                .toList();
    }

    private void add(String key, NotificationMessage message) {
        Deque<NotificationMessage> bucket = buckets.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (bucket) {
            bucket.addFirst(message);
            while (bucket.size() > capacity) {
                bucket.removeLast();
            }
        }
    }

    private List<NotificationMessage> snapshot(String key) {
        Deque<NotificationMessage> bucket = buckets.get(key);
        if (bucket == null) {
            return List.of();
        }
        synchronized (bucket) {
            return List.copyOf(bucket);
        }
    }
}
