package com.vetclinic.notification.event;

import com.vetclinic.common.event.AppointmentCreatedEvent;
import com.vetclinic.common.event.DoctorPriorityCallbackEvent;
import com.vetclinic.common.event.LowStockEvent;
import com.vetclinic.common.event.PaymentAndDispenseCompletedEvent;
import com.vetclinic.common.event.VisitCheckedInEvent;
import com.vetclinic.common.event.VisitClosedToPaymentEvent;
import com.vetclinic.common.exception.AppException;
import com.vetclinic.common.exception.ErrorCode;
import com.vetclinic.common.security.RoleCode;
import com.vetclinic.notification.config.NotificationProperties;
import com.vetclinic.notification.dto.UserSummary;
import com.vetclinic.notification.dto.VisitSummary;
import com.vetclinic.notification.model.NotificationMessage;
import com.vetclinic.notification.model.NotificationType;
import com.vetclinic.notification.model.Severity;
import com.vetclinic.notification.service.EmailService;
import com.vetclinic.notification.service.NotificationDispatcher;
import com.vetclinic.notification.service.PeopleLookup;
import com.vetclinic.notification.service.ProcessedEvents;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationEventListenerTest {

    private static final Instant NOW = Instant.parse("2026-10-30T02:00:00Z");
    private static final long OWNER = 5L;
    private static final long DOCTOR = 21L;

    @Mock
    private NotificationDispatcher dispatcher;
    @Mock
    private EmailService emailService;
    @Mock
    private PeopleLookup people;

    private NotificationEventListener listener;

    @BeforeEach
    void setUp() {
        NotificationProperties properties = new NotificationProperties("0123456789abcdef0123456789abcdef-test-secret",
                "no-reply@vetclinic.local", 50, "Asia/Ho_Chi_Minh");
        listener = new NotificationEventListener(dispatcher, emailService, people, new ProcessedEvents(), properties,
                Clock.fixed(NOW, ZoneId.of("Asia/Ho_Chi_Minh")));
    }

    private static VisitSummary visit() {
        return new VisitSummary(7L, "VIS-2026-7", 11L, "Lu", OWNER, DOCTOR);
    }

    private static AppointmentCreatedEvent appointment(String status) {
        return new AppointmentCreatedEvent(UUID.randomUUID(), NOW, OWNER, 3L, "APT-20261030-00003", OWNER, 11L,
                LocalDate.of(2026, 10, 31), LocalTime.of(9, 30), status);
    }

    private NotificationMessage captureRole(RoleCode role) {
        ArgumentCaptor<NotificationMessage> captor = ArgumentCaptor.forClass(NotificationMessage.class);
        verify(dispatcher).toRole(eq(role), captor.capture());
        return captor.getValue();
    }

    private NotificationMessage captureUser(long userId) {
        ArgumentCaptor<NotificationMessage> captor = ArgumentCaptor.forClass(NotificationMessage.class);
        verify(dispatcher).toUser(eq(userId), captor.capture());
        return captor.getValue();
    }

    // ================================================================== appointment.created

    @Test
    void appointmentCreated_pendingNotifiesReceptionAndOwnerAndEmailsTheOwner() {
        when(people.requireUser(OWNER)).thenReturn(new UserSummary(OWNER, "Nguyễn Văn A", "a@example.com", null));

        listener.onAppointmentCreated(appointment("PENDING"));

        NotificationMessage forReception = captureRole(RoleCode.RECEPTIONIST);
        assertThat(forReception.type()).isEqualTo(NotificationType.APPOINTMENT_CREATED);
        assertThat(forReception.body()).contains("APT-20261030-00003", "09:30 ngày 31/10/2026");
        assertThat(forReception.data()).containsEntry("appointmentId", 3L);
        assertThat(captureUser(OWNER).title()).isEqualTo("Đã ghi nhận lịch hẹn");

        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(emailService).send(eq("a@example.com"), contains("APT-20261030-00003"), body.capture());
        assertThat(body.getValue()).contains("Nguyễn Văn A", "09:30 ngày 31/10/2026", "chờ phòng khám xác nhận");
    }

    @Test
    void appointmentCreated_confirmedBookingByReceptionDoesNotPingReception() {
        when(people.requireUser(OWNER)).thenReturn(new UserSummary(OWNER, "Nguyễn Văn A", "a@example.com", null));

        listener.onAppointmentCreated(appointment("CONFIRMED"));

        verify(dispatcher, never()).toRole(any(), any());   // lễ tân tự đặt thì không cần báo lại cho lễ tân
        assertThat(captureUser(OWNER).title()).isEqualTo("Lịch hẹn đã được xác nhận");
        verify(emailService).send(eq("a@example.com"), anyString(), contains("Đã xác nhận"));
    }

    private static com.vetclinic.common.event.AppointmentStatusChangedEvent statusChanged(String status, boolean rescheduled, String reason) {
        return new com.vetclinic.common.event.AppointmentStatusChangedEvent(UUID.randomUUID(), NOW, 5L, 3L, "APT-20261030-00003", OWNER, 11L,
                LocalDate.of(2026, 10, 31), LocalTime.of(9, 30), status, rescheduled, reason);
    }

    @Test
    void appointmentStatusChanged_confirmedTellsTheOwnerInAppAndByEmail() {
        when(people.requireUser(OWNER)).thenReturn(new UserSummary(OWNER, "Nguyễn Văn A", "a@example.com", null));

        listener.onAppointmentStatusChanged(statusChanged("CONFIRMED", false, null));

        NotificationMessage message = captureUser(OWNER);
        assertThat(message.type()).isEqualTo(NotificationType.APPOINTMENT_UPDATED);
        assertThat(message.title()).isEqualTo("Lịch hẹn đã được xác nhận");
        assertThat(message.body()).contains("APT-20261030-00003", "09:30 ngày 31/10/2026");
        verify(emailService).send(eq("a@example.com"), contains("APT-20261030-00003"), contains("Nguyễn Văn A"));
    }

    @Test
    void appointmentStatusChanged_rejectionCarriesTheReasonAsAWarning() {
        when(people.requireUser(OWNER)).thenReturn(new UserSummary(OWNER, "Khách", "a@example.com", null));

        listener.onAppointmentStatusChanged(statusChanged("CANCELLED", false, "Phòng khám bảo trì thiết bị"));

        NotificationMessage message = captureUser(OWNER);
        assertThat(message.severity()).isEqualTo(Severity.WARNING);
        assertThat(message.body()).contains("đã bị hủy", "Phòng khám bảo trì thiết bị");
    }

    @Test
    void appointmentStatusChanged_rescheduleAndRedeliveryAreHandledOnce() {
        when(people.requireUser(OWNER)).thenReturn(new UserSummary(OWNER, "Khách", "  ", null));
        var event = statusChanged("CONFIRMED", true, "Bác sĩ đi công tác");

        listener.onAppointmentStatusChanged(event);
        listener.onAppointmentStatusChanged(event);   // RabbitMQ giao lại

        NotificationMessage message = captureUser(OWNER);   // verify(times(1)) ngầm định: không trùng
        assertThat(message.title()).isEqualTo("Phòng khám đã dời giờ hẹn");
        assertThat(message.body()).contains("Bác sĩ đi công tác");
        verifyNoInteractions(emailService);   // không có email thì chỉ thông báo trong ứng dụng
    }

    @Test
    void appointmentCreated_ownerWithoutEmailStillGetsTheInAppNotification() {
        when(people.requireUser(OWNER)).thenReturn(new UserSummary(OWNER, "Khách", "  ", null));

        listener.onAppointmentCreated(appointment("PENDING"));

        verify(dispatcher).toUser(eq(OWNER), any());
        verifyNoInteractions(emailService);
    }

    @Test
    void appointmentCreated_redeliveredEventDoesNotNotifyTwice() {
        when(people.requireUser(OWNER)).thenReturn(new UserSummary(OWNER, "Khách", "a@example.com", null));
        AppointmentCreatedEvent event = appointment("PENDING");

        listener.onAppointmentCreated(event);
        listener.onAppointmentCreated(event);

        verify(dispatcher, times(1)).toUser(eq(OWNER), any());
        verify(dispatcher, times(1)).toRole(eq(RoleCode.RECEPTIONIST), any());
        verify(emailService, times(1)).send(anyString(), anyString(), anyString());
    }

    @Test
    void appointmentCreated_smtpFailureIsRethrownForRetry_andTheRetryOnlyRedoesTheEmail() {
        when(people.requireUser(OWNER)).thenReturn(new UserSummary(OWNER, "Khách", "a@example.com", null));
        doThrow(new AppException(ErrorCode.SERVICE_UNAVAILABLE)).doNothing().when(emailService).send(anyString(), anyString(), anyString());
        AppointmentCreatedEvent event = appointment("PENDING");

        assertThatThrownBy(() -> listener.onAppointmentCreated(event)).isInstanceOf(AppException.class);
        listener.onAppointmentCreated(event);   // lần giao lại của RabbitMQ

        verify(dispatcher, times(1)).toUser(eq(OWNER), any());   // thông báo trong ứng dụng không bị lặp
        verify(emailService, times(2)).send(anyString(), anyString(), anyString());
    }

    // ================================================================== visit.checked_in

    @Test
    void checkedIn_emergencyAlertsReceptionAndDoctorsAndTellsTheOwner() {
        when(people.findVisit(7L)).thenReturn(Optional.of(visit()));

        listener.onVisitCheckedIn(new VisitCheckedInEvent(UUID.randomUUID(), NOW, 9L, 7L, "VIS-2026-7", 11L, null, true));

        NotificationMessage forReception = captureRole(RoleCode.RECEPTIONIST);
        assertThat(forReception.severity()).isEqualTo(Severity.CRITICAL);
        assertThat(forReception.body()).contains("VIS-2026-7", "Lu");
        verify(dispatcher).toRole(eq(RoleCode.VETERINARIAN), any());
        assertThat(captureUser(OWNER).title()).isEqualTo("Đã tiếp nhận thú cưng");
    }

    @Test
    void checkedIn_normalVisitOnlyGoesToReception() {
        when(people.findVisit(7L)).thenReturn(Optional.of(visit()));

        listener.onVisitCheckedIn(new VisitCheckedInEvent(UUID.randomUUID(), NOW, 9L, 7L, "VIS-2026-7", 11L, 3L, false));

        assertThat(captureRole(RoleCode.RECEPTIONIST).severity()).isEqualTo(Severity.INFO);
        verify(dispatcher, never()).toRole(eq(RoleCode.VETERINARIAN), any());
    }

    @Test
    void checkedIn_clinicalDownStillNotifiesReceptionWithoutPetName() {
        when(people.findVisit(7L)).thenReturn(Optional.empty());

        listener.onVisitCheckedIn(new VisitCheckedInEvent(UUID.randomUUID(), NOW, 9L, 7L, "VIS-2026-7", 11L, null, false));

        assertThat(captureRole(RoleCode.RECEPTIONIST).body()).contains("VIS-2026-7", "thú cưng");
        verify(dispatcher, never()).toUser(anyLong(), any());   // không biết chủ nuôi thì không báo chủ nuôi
    }

    // ================================================================== doctor.priority_callback

    @Test
    void priorityCallback_popsUpOnTheRightDoctorWithRoomAndPetName() {
        when(people.findVisit(7L)).thenReturn(Optional.of(visit()));
        when(people.findUser(DOCTOR)).thenReturn(Optional.of(new UserSummary(DOCTOR, "BS Lan", null, "P01")));

        listener.onPriorityCallback(new DoctorPriorityCallbackEvent(UUID.randomUUID(), NOW, 30L, 7L, "VIS-2026-7", DOCTOR, 11L));

        NotificationMessage popup = captureUser(DOCTOR);
        assertThat(popup.type()).isEqualTo(NotificationType.PRIORITY_CALLBACK);
        assertThat(popup.severity()).isEqualTo(Severity.CRITICAL);
        assertThat(popup.body()).contains("Lu", "VIS-2026-7", "phòng P01");
        assertThat(popup.data()).containsEntry("visitId", 7L).containsEntry("doctorId", DOCTOR)
                .containsEntry("action", "INVITE_PATIENT");
        assertThat(captureRole(RoleCode.RECEPTIONIST).body()).contains("BS Lan", "ưu tiên gọi lại");
        verify(dispatcher).toUser(eq(OWNER), any());
    }

    @Test
    void priorityCallback_stillPopsUpWhenOtherServicesAreDown() {
        when(people.findVisit(7L)).thenReturn(Optional.empty());
        when(people.findUser(DOCTOR)).thenReturn(Optional.empty());

        listener.onPriorityCallback(new DoctorPriorityCallbackEvent(UUID.randomUUID(), NOW, 30L, 7L, "VIS-2026-7", DOCTOR, 11L));

        assertThat(captureUser(DOCTOR).body()).contains("VIS-2026-7", "phòng của bạn");
    }

    // ================================================================== visit.closed_to_payment

    @Test
    void visitClosed_tellsReceptionToCollectPayment() {
        when(people.findVisit(7L)).thenReturn(Optional.of(visit()));

        listener.onVisitClosed(new VisitClosedToPaymentEvent(UUID.randomUUID(), NOW, DOCTOR, 7L, "VIS-2026-7", 11L, DOCTOR, false));

        NotificationMessage message = captureRole(RoleCode.RECEPTIONIST);
        assertThat(message.type()).isEqualTo(NotificationType.PAYMENT_PENDING);
        assertThat(message.severity()).isEqualTo(Severity.INFO);
        assertThat(message.body()).contains("VIS-2026-7", "Lu", "thanh toán");
    }

    @Test
    void visitClosed_abandonedVisitIsAWarningAboutDebt() {
        when(people.findVisit(7L)).thenReturn(Optional.of(visit()));

        listener.onVisitClosed(new VisitClosedToPaymentEvent(UUID.randomUUID(), NOW, 9L, 7L, "VIS-2026-7", 11L, DOCTOR, true));

        NotificationMessage message = captureRole(RoleCode.RECEPTIONIST);
        assertThat(message.severity()).isEqualTo(Severity.WARNING);
        assertThat(message.title()).contains("ghi nợ");
    }

    // ================================================================== payment.completed

    @Test
    void paymentCompleted_notifiesReceptionAndOwnerAndEmailsReceipt() {
        when(people.findVisit(7L)).thenReturn(Optional.of(visit()));
        when(people.requireUser(OWNER)).thenReturn(new UserSummary(OWNER, "Nguyễn Văn A", "a@example.com", null));

        listener.onPaymentCompleted(new PaymentAndDispenseCompletedEvent(UUID.randomUUID(), NOW, 9L, 7L, 40L, 3L));

        assertThat(captureRole(RoleCode.RECEPTIONIST).body()).contains("VIS-2026-7", "phát thuốc");
        assertThat(captureUser(OWNER).title()).isEqualTo("Thanh toán hoàn tất");
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(emailService).send(eq("a@example.com"), contains("VIS-2026-7"), body.capture());
        assertThat(body.getValue()).contains("#40", "Đơn thuốc đã được cấp phát");
    }

    @Test
    void paymentCompleted_visitWithoutPrescriptionDoesNotMentionMedicine() {
        when(people.findVisit(7L)).thenReturn(Optional.of(visit()));
        when(people.requireUser(OWNER)).thenReturn(new UserSummary(OWNER, "Nguyễn Văn A", "a@example.com", null));

        listener.onPaymentCompleted(new PaymentAndDispenseCompletedEvent(UUID.randomUUID(), NOW, 9L, 7L, 40L, null));

        assertThat(captureRole(RoleCode.RECEPTIONIST).body()).doesNotContain("thuốc");
        verify(emailService).send(anyString(), anyString(), org.mockito.ArgumentMatchers.argThat(b -> !b.contains("thuốc")));
    }

    @Test
    void paymentCompleted_unknownOwnerSkipsTheEmailButStillNotifiesReception() {
        when(people.findVisit(7L)).thenReturn(Optional.empty());

        listener.onPaymentCompleted(new PaymentAndDispenseCompletedEvent(UUID.randomUUID(), NOW, 9L, 7L, 40L, null));

        verify(dispatcher).toRole(eq(RoleCode.RECEPTIONIST), any());
        verifyNoInteractions(emailService);
        verify(people, never()).requireUser(anyLong());
    }

    // ================================================================== stock.low_alert

    @Test
    void lowStock_isARedAlertForAdmins() {
        listener.onLowStock(new LowStockEvent(UUID.randomUUID(), NOW, 9L, 1L, "MED_AMOX", "Clavamox 250mg", 8, 20));

        NotificationMessage alert = captureRole(RoleCode.ADMIN);
        assertThat(alert.type()).isEqualTo(NotificationType.LOW_STOCK);
        assertThat(alert.severity()).isEqualTo(Severity.CRITICAL);
        assertThat(alert.body()).contains("Clavamox 250mg", "MED_AMOX", "chỉ còn 8", "ngưỡng cảnh báo 20");
        assertThat(alert.data()).containsEntry("medicineCode", "MED_AMOX").containsEntry("stockQuantity", 8);
    }
}
