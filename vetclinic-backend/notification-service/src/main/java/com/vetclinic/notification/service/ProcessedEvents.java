package com.vetclinic.notification.service;

import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Chống làm lại việc đã xong khi RabbitMQ giao lại sự kiện (at-least-once) hoặc khi một bước sau của cùng sự kiện lỗi
 * rồi bị thử lại: mỗi (sự kiện, kênh) chỉ chạy thành công một lần. Chỉ đánh dấu SAU khi việc xong, nên lỗi thì lần thử
 * sau vẫn chạy lại. Giữ 5000 khóa gần nhất trong bộ nhớ (đủ cho cửa sổ giao lại; mất khi khởi động lại).
 */
@Component
public class ProcessedEvents {

    private static final int CAPACITY = 5000;

    private final Set<String> done = Collections.newSetFromMap(Collections.synchronizedMap(
            new LinkedHashMap<>(16, 0.75f, false) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, Boolean> eldest) {
                    return size() > CAPACITY;
                }
            }));

    public void runOnce(String key, Runnable action) {
        if (done.contains(key)) {
            return;
        }
        action.run();
        done.add(key);
    }
}
