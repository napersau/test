package com.vetclinic.notification.service;

import com.vetclinic.common.security.RoleCode;
import com.vetclinic.notification.config.NotificationProperties;
import com.vetclinic.notification.model.NotificationMessage;
import com.vetclinic.notification.model.NotificationType;
import com.vetclinic.notification.model.Severity;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NotificationHistoryTest {

    private static final String SECRET = "0123456789abcdef0123456789abcdef-test-secret";

    private static NotificationMessage message(String title, long second) {
        return new NotificationMessage(java.util.UUID.randomUUID(), NotificationType.LOW_STOCK, Severity.INFO, title, "",
                Map.of(), Instant.parse("2026-10-30T02:00:00Z").plusSeconds(second));
    }

    private static NotificationHistory history(int capacity) {
        return new NotificationHistory(new NotificationProperties(SECRET, "a@b", capacity, "Asia/Ho_Chi_Minh"));
    }

    @Test
    void recent_mergesPersonalAndRoleMessagesNewestFirst() {
        NotificationHistory history = history(10);
        history.addForUser(7L, message("riêng 1", 1));
        history.addForRole(RoleCode.RECEPTIONIST, message("chung 2", 2));
        history.addForUser(7L, message("riêng 3", 3));

        assertThat(history.recent(7L, RoleCode.RECEPTIONIST, 10)).extracting(NotificationMessage::title)
                .containsExactly("riêng 3", "chung 2", "riêng 1");
    }

    @Test
    void recent_doesNotLeakOtherUsersOrOtherRoles() {
        NotificationHistory history = history(10);
        history.addForUser(8L, message("của người khác", 1));
        history.addForRole(RoleCode.ADMIN, message("của admin", 2));

        assertThat(history.recent(7L, RoleCode.RECEPTIONIST, 10)).isEmpty();
    }

    @Test
    void recent_isBoundedPerBucketAndHonoursTheLimit() {
        NotificationHistory history = history(3);
        for (int i = 1; i <= 5; i++) {
            history.addForUser(7L, message("m" + i, i));
        }

        assertThat(history.recent(7L, RoleCode.ADMIN, 100)).extracting(NotificationMessage::title)
                .containsExactly("m5", "m4", "m3");   // cũ nhất bị loại
        assertThat(history.recent(7L, RoleCode.ADMIN, 2)).hasSize(2);
        assertThat(history.recent(7L, RoleCode.ADMIN, 0)).isEmpty();
    }

    @Test
    void processedEvents_runsAnActionOnlyOnceAfterItSucceeded() {
        ProcessedEvents processed = new ProcessedEvents();
        AtomicInteger runs = new AtomicInteger();

        processed.runOnce("k", runs::incrementAndGet);
        processed.runOnce("k", runs::incrementAndGet);
        processed.runOnce("other", runs::incrementAndGet);

        assertThat(runs.get()).isEqualTo(2);
    }

    @Test
    void processedEvents_aFailedActionIsNotRemembered_soTheRetryRunsAgain() {
        ProcessedEvents processed = new ProcessedEvents();
        AtomicInteger runs = new AtomicInteger();

        assertThatThrownBy(() -> processed.runOnce("k", () -> {
            runs.incrementAndGet();
            throw new IllegalStateException("smtp down");
        })).isInstanceOf(IllegalStateException.class);
        processed.runOnce("k", runs::incrementAndGet);

        assertThat(runs.get()).isEqualTo(2);
    }
}
