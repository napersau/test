package com.vetclinic.notification.service;

import com.vetclinic.common.dto.ApiResponse;
import com.vetclinic.common.exception.AppException;
import com.vetclinic.common.exception.ErrorCode;
import com.vetclinic.notification.client.AuthClient;
import com.vetclinic.notification.client.ClinicalClient;
import com.vetclinic.notification.dto.UserSummary;
import com.vetclinic.notification.dto.VisitSummary;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Tra cứu người nhận / tên hiển thị từ service khác. Có hai kiểu:
 * - require*: bắt buộc (lỗi thì ném để consumer thử lại, dùng khi thiếu dữ liệu nghĩa là mất thư)
 * - find*: làm giàu nội dung thông báo; service kia tạm sập thì trả rỗng, thông báo vẫn đi với nội dung rút gọn.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PeopleLookup {

    private final AuthClient authClient;
    private final ClinicalClient clinicalClient;

    public UserSummary requireUser(Long userId) {
        ApiResponse<UserSummary> response = authClient.getUser(userId);
        if (response == null || response.getData() == null) {
            throw new AppException(ErrorCode.USER_NOT_FOUND);
        }
        return response.getData();
    }

    public Optional<UserSummary> findUser(Long userId) {
        try {
            return Optional.of(requireUser(userId));
        } catch (RuntimeException e) {
            log.warn("Không lấy được người dùng {}: {}", userId, e.getMessage());
            return Optional.empty();
        }
    }

    public Optional<VisitSummary> findVisit(Long visitId) {
        try {
            ApiResponse<VisitSummary> response = clinicalClient.getVisit(visitId);
            return response == null ? Optional.empty() : Optional.ofNullable(response.getData());
        } catch (RuntimeException e) {
            log.warn("Không lấy được đợt khám {}: {}", visitId, e.getMessage());
            return Optional.empty();
        }
    }
}
