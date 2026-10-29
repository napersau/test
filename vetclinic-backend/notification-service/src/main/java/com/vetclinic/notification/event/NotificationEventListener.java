package com.vetclinic.notification.event;

import com.vetclinic.common.event.AppointmentCreatedEvent;
import com.vetclinic.common.event.AppointmentStatusChangedEvent;
import com.vetclinic.common.event.DoctorPriorityCallbackEvent;
import com.vetclinic.common.event.LowStockEvent;
import com.vetclinic.common.event.PaymentAndDispenseCompletedEvent;
import com.vetclinic.common.event.VisitCheckedInEvent;
import com.vetclinic.common.event.VisitClosedToPaymentEvent;
import com.vetclinic.common.security.RoleCode;
import com.vetclinic.notification.config.NotificationProperties;
import com.vetclinic.notification.config.NotificationRabbitConfig;
import com.vetclinic.notification.dto.UserSummary;
import com.vetclinic.notification.dto.VisitSummary;
import com.vetclinic.notification.model.NotificationMessage;
import com.vetclinic.notification.model.NotificationType;
import com.vetclinic.notification.model.Severity;
import com.vetclinic.notification.service.EmailService;
import com.vetclinic.notification.service.NotificationDispatcher;
import com.vetclinic.notification.service.PeopleLookup;
import com.vetclinic.notification.service.ProcessedEvents;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Biến 6 sự kiện nghiệp vụ trên RabbitMQ thành thông báo realtime (WebSocket) và email.
 * Mỗi (sự kiện, kênh) chỉ chạy thành công một lần (ProcessedEvents), nên giao lại sự kiện hoặc thử lại sau khi một bước
 * lỗi không làm người dùng nhận trùng. Lỗi thật (SMTP, auth-service sập khi cần email) thì ném để RabbitMQ thử lại 3 lần
 * rồi đưa vào DLQ. Phần làm giàu nội dung (tên thú cưng, số phòng) lỗi thì bỏ qua, thông báo vẫn đi với nội dung rút gọn.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm");

    private final NotificationDispatcher dispatcher;
    private final EmailService emailService;
    private final PeopleLookup people;
    private final ProcessedEvents processed;
    private final NotificationProperties properties;
    private final Clock clock;

    // ================================================================== appointment.created

    @RabbitListener(queues = NotificationRabbitConfig.APPOINTMENT_CREATED_QUEUE)
    public void onAppointmentCreated(AppointmentCreatedEvent event) {
        log.info("Nhận AppointmentCreatedEvent: {}", event.appointmentCode());
        String when = event.startTime().format(TIME) + " ngày " + event.appointmentDate().format(DATE);
        boolean pending = "PENDING".equals(event.status());
        Map<String, Object> data = data("appointmentId", event.appointmentId(), "appointmentCode", event.appointmentCode(),
                "petId", event.petId(), "date", event.appointmentDate().toString(), "time", event.startTime().toString(),
                "status", event.status());

        processed.runOnce("push:" + event.eventId(), () -> {
            if (pending) {   // UC-17: lịch đặt online chờ Lễ tân duyệt
                dispatcher.toRole(RoleCode.RECEPTIONIST, message(NotificationType.APPOINTMENT_CREATED, Severity.INFO,
                        "Lịch hẹn mới chờ duyệt", "Lịch " + event.appointmentCode() + " lúc " + when + " đang chờ xác nhận", data));
            }
            dispatcher.toUser(event.ownerId(), message(NotificationType.APPOINTMENT_CREATED, Severity.INFO,
                    pending ? "Đã ghi nhận lịch hẹn" : "Lịch hẹn đã được xác nhận",
                    "Lịch " + event.appointmentCode() + " lúc " + when
                            + (pending ? " đang chờ phòng khám xác nhận" : " đã được xác nhận"), data));
        });
        processed.runOnce("mail:" + event.eventId(), () -> {
            UserSummary owner = people.requireUser(event.ownerId());
            if (isBlank(owner.email())) {
                log.info("Chủ nuôi {} chưa có email, bỏ qua thư xác nhận lịch {}", event.ownerId(), event.appointmentCode());
                return;
            }
            emailService.send(owner.email(), "[VetClinic] Xác nhận đặt lịch khám " + event.appointmentCode(),
                    "Kính gửi " + owner.fullName() + ",\n\n"
                            + "Phòng khám đã ghi nhận lịch hẹn của bạn:\n"
                            + "- Mã lịch hẹn: " + event.appointmentCode() + "\n"
                            + "- Thời gian: " + when + "\n"
                            + "- Trạng thái: " + (pending ? "Đang chờ phòng khám xác nhận (chúng tôi sẽ liên hệ lại)" : "Đã xác nhận") + "\n\n"
                            + "Vui lòng mang theo mã lịch hẹn khi đến khám. Nếu cần hủy hoặc đổi lịch, hãy thực hiện trước giờ hẹn "
                            + "ít nhất 2 tiếng.\n\nPhòng khám thú y VetClinic");
        });
    }

    // ================================================================== appointment.status_changed

    /** UC-17 / FR-16: báo chủ nuôi khi phòng khám duyệt, từ chối (kèm lý do), dời giờ hoặc ghi nhận vắng mặt. */
    @RabbitListener(queues = NotificationRabbitConfig.APPOINTMENT_STATUS_QUEUE)
    public void onAppointmentStatusChanged(AppointmentStatusChangedEvent event) {
        log.info("Nhận AppointmentStatusChangedEvent: {} -> {}{}", event.appointmentCode(), event.status(), event.rescheduled() ? " (dời giờ)" : "");
        String when = event.startTime().format(TIME) + " ngày " + event.appointmentDate().format(DATE);
        String reason = isBlank(event.reason()) ? null : event.reason();
        String title;
        String body;
        Severity severity = Severity.INFO;
        if (event.rescheduled()) {
            title = "Phòng khám đã dời giờ hẹn";
            body = "Lịch " + event.appointmentCode() + " được chuyển sang " + when + (reason == null ? "" : ". Lý do: " + reason);
        } else {
            switch (event.status()) {
                case "CONFIRMED" -> {
                    title = "Lịch hẹn đã được xác nhận";
                    body = "Lịch " + event.appointmentCode() + " lúc " + when + " đã được phòng khám xác nhận. Vui lòng có mặt đúng giờ.";
                }
                case "CANCELLED" -> {
                    title = "Lịch hẹn không được chấp nhận";
                    severity = Severity.WARNING;
                    body = "Lịch " + event.appointmentCode() + " lúc " + when + " đã bị hủy" + (reason == null ? "." : ". Lý do: " + reason);
                }
                case "NO_SHOW" -> {
                    title = "Lịch hẹn được ghi nhận vắng mặt";
                    severity = Severity.WARNING;
                    body = "Lịch " + event.appointmentCode() + " lúc " + when + " đã quá giờ mà chưa tiếp nhận. Vui lòng đặt lịch mới nếu vẫn cần khám.";
                }
                default -> {
                    log.warn("Bỏ qua trạng thái {} của lịch {}", event.status(), event.appointmentCode());
                    return;
                }
            }
        }
        Map<String, Object> data = data("appointmentId", event.appointmentId(), "appointmentCode", event.appointmentCode(),
                "petId", event.petId(), "date", event.appointmentDate().toString(), "time", event.startTime().toString(),
                "status", event.status(), "rescheduled", event.rescheduled());
        String finalTitle = title;
        String finalBody = body;
        Severity finalSeverity = severity;
        processed.runOnce("push:" + event.eventId(), () ->
                dispatcher.toUser(event.ownerId(), message(NotificationType.APPOINTMENT_UPDATED, finalSeverity, finalTitle, finalBody, data)));
        processed.runOnce("mail:" + event.eventId(), () -> {
            UserSummary owner = people.requireUser(event.ownerId());
            if (isBlank(owner.email())) {
                log.info("Chủ nuôi {} chưa có email, bỏ qua thư cập nhật lịch {}", event.ownerId(), event.appointmentCode());
                return;
            }
            emailService.send(owner.email(), "[VetClinic] " + finalTitle + " - " + event.appointmentCode(),
                    "Kính gửi " + owner.fullName() + ",\n\n" + finalBody + "\n\nNếu cần hỗ trợ, vui lòng liên hệ hotline phòng khám.\n\nPhòng khám thú y VetClinic");
        });
    }

    // ================================================================== visit.checked_in

    @RabbitListener(queues = NotificationRabbitConfig.VISIT_CHECKED_IN_QUEUE)
    public void onVisitCheckedIn(VisitCheckedInEvent event) {
        log.info("Nhận VisitCheckedInEvent: {}", event.visitCode());
        processed.runOnce("push:" + event.eventId(), () -> {
            Optional<VisitSummary> visit = people.findVisit(event.visitId());
            String pet = petName(visit);
            Map<String, Object> data = data("visitId", event.visitId(), "visitCode", event.visitCode(),
                    "petId", event.petId(), "petName", pet, "emergency", event.emergency());

            NotificationMessage queueMessage = event.emergency()
                    ? message(NotificationType.VISIT_CHECKED_IN, Severity.CRITICAL, "CA CẤP CỨU vừa tiếp nhận",
                    "Ca " + event.visitCode() + " (" + pet + ") cần khám ngay", data)
                    : message(NotificationType.VISIT_CHECKED_IN, Severity.INFO, "Ca mới vào hàng đợi",
                    "Ca " + event.visitCode() + " (" + pet + ") đang chờ phân công bác sĩ", data);
            dispatcher.toRole(RoleCode.RECEPTIONIST, queueMessage);
            if (event.emergency()) {
                dispatcher.toRole(RoleCode.VETERINARIAN, queueMessage);
            }
            visit.map(VisitSummary::ownerId).ifPresent(owner -> dispatcher.toUser(owner, message(
                    NotificationType.VISIT_CHECKED_IN, Severity.INFO, "Đã tiếp nhận thú cưng",
                    pet + " đã được tiếp nhận tại phòng khám (mã " + event.visitCode() + "). Vui lòng chờ được gọi vào phòng.", data)));
        });
    }

    // ================================================================== doctor.priority_callback

    @RabbitListener(queues = NotificationRabbitConfig.PRIORITY_CALLBACK_QUEUE)
    public void onPriorityCallback(DoctorPriorityCallbackEvent event) {
        log.info("Nhận DoctorPriorityCallbackEvent: ca {} -> bác sĩ {}", event.visitCode(), event.doctorId());
        processed.runOnce("push:" + event.eventId(), () -> {
            Optional<VisitSummary> visit = people.findVisit(event.visitId());
            Optional<UserSummary> doctor = people.findUser(event.doctorId());
            String pet = petName(visit);
            String room = doctor.map(UserSummary::roomNumber).filter(r -> !isBlank(r)).orElse("của bạn");
            String doctorName = doctor.map(UserSummary::fullName).orElse("Bác sĩ #" + event.doctorId());
            Map<String, Object> data = data("visitId", event.visitId(), "visitCode", event.visitCode(),
                    "petId", event.petId(), "petName", pet, "doctorId", event.doctorId(), "action", "INVITE_PATIENT");

            // UC-30: popup nổi bật + huy hiệu Khóa ưu tiên trên màn hình đúng Bác sĩ phụ trách
            dispatcher.toUser(event.doctorId(), message(NotificationType.PRIORITY_CALLBACK, Severity.CRITICAL,
                    "Có ca đã đủ kết quả cận lâm sàng",
                    "Mời thú cưng " + pet + " (ca " + event.visitCode() + ") vào lại phòng " + room + " để hội chẩn kết quả", data));
            dispatcher.toRole(RoleCode.RECEPTIONIST, message(NotificationType.PRIORITY_CALLBACK, Severity.WARNING,
                    "Bác sĩ đang có ca chờ đọc kết quả",
                    doctorName + " có ca " + event.visitCode() + " đã đủ kết quả; ưu tiên gọi lại trước khi phân ca mới", data));
            visit.map(VisitSummary::ownerId).ifPresent(owner -> dispatcher.toUser(owner, message(
                    NotificationType.PRIORITY_CALLBACK, Severity.INFO, "Đã có kết quả cận lâm sàng",
                    "Kết quả của " + pet + " đã sẵn sàng. Vui lòng quay lại phòng khám " + room + " để gặp bác sĩ.", data)));
        });
    }

    // ================================================================== visit.closed_to_payment

    @RabbitListener(queues = NotificationRabbitConfig.VISIT_CLOSED_QUEUE)
    public void onVisitClosed(VisitClosedToPaymentEvent event) {
        log.info("Nhận VisitClosedToPaymentEvent: {}", event.visitCode());
        processed.runOnce("push:" + event.eventId(), () -> {
            String pet = petName(people.findVisit(event.visitId()));
            Map<String, Object> data = data("visitId", event.visitId(), "visitCode", event.visitCode(),
                    "petName", pet, "abandoned", event.abandoned());
            dispatcher.toRole(RoleCode.RECEPTIONIST, event.abandoned()
                    ? message(NotificationType.PAYMENT_PENDING, Severity.WARNING, "Khách bỏ về, ghi nợ viện phí",
                    "Ca " + event.visitCode() + " (" + pet + ") đã đóng; hóa đơn chờ thu bù", data)
                    : message(NotificationType.PAYMENT_PENDING, Severity.INFO, "Có ca chờ thanh toán",
                    "Ca " + event.visitCode() + " (" + pet + ") đã chốt, mời chủ nuôi ra quầy thanh toán", data));
        });
    }

    // ================================================================== payment.completed

    @RabbitListener(queues = NotificationRabbitConfig.PAYMENT_COMPLETED_QUEUE)
    public void onPaymentCompleted(PaymentAndDispenseCompletedEvent event) {
        log.info("Nhận PaymentAndDispenseCompletedEvent: visitId={}", event.visitId());
        Optional<VisitSummary> visit = people.findVisit(event.visitId());
        String pet = petName(visit);
        String code = visit.map(VisitSummary::visitCode).orElse("#" + event.visitId());
        Map<String, Object> data = data("visitId", event.visitId(), "visitCode", visit.map(VisitSummary::visitCode).orElse(null),
                "invoiceId", event.invoiceId(), "prescriptionId", event.prescriptionId(), "petName", pet);

        processed.runOnce("push:" + event.eventId(), () -> {
            dispatcher.toRole(RoleCode.RECEPTIONIST, message(NotificationType.VISIT_COMPLETED, Severity.INFO,
                    "Ca khám đã hoàn tất", "Ca " + code + " (" + pet + ") đã thanh toán"
                            + (event.prescriptionId() != null ? " và phát thuốc" : ""), data));
            visit.map(VisitSummary::ownerId).ifPresent(owner -> dispatcher.toUser(owner, message(
                    NotificationType.VISIT_COMPLETED, Severity.INFO, "Thanh toán hoàn tất",
                    "Cảm ơn bạn. Ca khám của " + pet + " đã hoàn tất"
                            + (event.prescriptionId() != null ? ", đơn thuốc đã được cấp phát." : "."), data)));
        });
        processed.runOnce("mail:" + event.eventId(), () -> {
            Optional<Long> ownerId = visit.map(VisitSummary::ownerId);
            if (ownerId.isEmpty()) {
                return;   // không biết chủ nuôi (clinical tạm không phản hồi): bỏ thư, thông báo trong ứng dụng đã đi
            }
            UserSummary owner = people.requireUser(ownerId.get());
            if (isBlank(owner.email())) {
                return;
            }
            emailService.send(owner.email(), "[VetClinic] Xác nhận thanh toán ca khám " + code,
                    "Kính gửi " + owner.fullName() + ",\n\n"
                            + "Phòng khám xác nhận đã thu viện phí cho ca khám " + code + " của " + pet + ".\n"
                            + "- Mã hóa đơn nội bộ: #" + event.invoiceId() + "\n"
                            + (event.prescriptionId() != null
                            ? "- Đơn thuốc đã được cấp phát; vui lòng dùng thuốc đúng hướng dẫn của bác sĩ.\n" : "")
                            + "\nCảm ơn bạn đã tin tưởng phòng khám thú y VetClinic.");
        });
    }

    // ================================================================== stock.low_alert

    @RabbitListener(queues = NotificationRabbitConfig.LOW_STOCK_QUEUE)
    public void onLowStock(LowStockEvent event) {
        log.info("Nhận LowStockEvent: {} còn {}", event.medicineCode(), event.stockQuantity());
        processed.runOnce("push:" + event.eventId(), () -> dispatcher.toRole(RoleCode.ADMIN, message(
                NotificationType.LOW_STOCK, Severity.CRITICAL, "Cảnh báo tồn kho thấp",
                event.medicineName() + " (" + event.medicineCode() + ") chỉ còn " + event.stockQuantity()
                        + ", ngưỡng cảnh báo " + event.minStockAlert() + ". Cần nhập thêm.",
                data("medicineId", event.medicineId(), "medicineCode", event.medicineCode(),
                        "stockQuantity", event.stockQuantity(), "minStockAlert", event.minStockAlert()))));
    }

    // ================================================================== helper

    private NotificationMessage message(NotificationType type, Severity severity, String title, String body,
                                        Map<String, Object> data) {
        return NotificationMessage.of(type, severity, title, body, data, clock.instant());
    }

    private static String petName(Optional<VisitSummary> visit) {
        return visit.map(VisitSummary::petName).filter(n -> !isBlank(n)).orElse("thú cưng");
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    /** Dựng map giữ thứ tự; chấp nhận giá trị null (Map.of không cho). */
    private static Map<String, Object> data(Object... keyValues) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            map.put((String) keyValues[i], keyValues[i + 1]);
        }
        return map;
    }
}
