package com.vetclinic.notification.service;

import com.vetclinic.common.exception.AppException;
import com.vetclinic.common.exception.ErrorCode;
import com.vetclinic.notification.config.NotificationProperties;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/** Gửi thư văn bản thuần (UTF-8) qua SMTP (Mailpit khi chạy Docker). */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final NotificationProperties properties;

    /** Lỗi SMTP được ném lên để consumer RabbitMQ thử lại rồi chuyển DLQ, không nuốt mất thư. */
    public void send(String to, String subject, String content) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, "UTF-8");
            helper.setFrom(properties.mailFrom());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(content, false);
            mailSender.send(message);
            log.info("Đã gửi email '{}' tới {}", subject, to);
        } catch (MessagingException e) {
            throw new AppException(ErrorCode.INVALID_INPUT_DATA, "Địa chỉ email không hợp lệ: " + to);
        } catch (MailException e) {
            log.error("Gửi email tới {} thất bại: {}", to, e.getMessage());
            throw new AppException(ErrorCode.SERVICE_UNAVAILABLE, "Không gửi được email, vui lòng thử lại sau");
        }
    }
}
