package com.vetclinic.auth.service.impl;

import com.vetclinic.auth.constant.UserStatus;
import com.vetclinic.auth.dto.request.RegisterRequest;
import com.vetclinic.auth.dto.response.UserResponse;
import com.vetclinic.auth.entity.Role;
import com.vetclinic.auth.entity.User;
import com.vetclinic.auth.mapper.UserMapperImpl;
import com.vetclinic.auth.repository.RefreshTokenRepository;
import com.vetclinic.auth.repository.RoleRepository;
import com.vetclinic.auth.repository.UserRepository;
import com.vetclinic.common.exception.AppException;
import com.vetclinic.common.exception.ErrorCode;
import com.vetclinic.common.security.RoleCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    private static final long ADMIN = 1L;
    private static final long RECEPTIONIST = 2L;

    @Mock
    private UserRepository userRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    private final PasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private UserServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new UserServiceImpl(userRepository, roleRepository, refreshTokenRepository, encoder, new UserMapperImpl());
        lenient().when(userRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> {
            User saved = inv.getArgument(0);
            if (saved.getId() == null) {
                saved.setId(50L);
            }
            return saved;
        });
        for (RoleCode code : RoleCode.values()) {
            lenient().when(roleRepository.findByCode(code)).thenReturn(Optional.of(role(code)));
        }
    }

    @AfterEach
    void clearSecurity() {
        SecurityContextHolder.clearContext();
    }

    private static Role role(RoleCode code) {
        return Role.builder().id((long) code.ordinal() + 1).code(code).name(code.name()).build();
    }

    private static User user(long id, RoleCode code, String room) {
        return User.builder().id(id).role(role(code)).username("u" + id).passwordHash("old-hash").fullName("Người " + id)
                .phoneNumber("09000000" + id).roomNumber(room).status(UserStatus.ACTIVE).build();
    }

    private static void loginAs(long userId, RoleCode role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                String.valueOf(userId), null, List.of(new SimpleGrantedAuthority("ROLE_" + role.name()))));
    }

    private static void assertError(ErrorCode expected, Runnable call) {
        assertThatThrownBy(call::run).isInstanceOfSatisfying(AppException.class,
                e -> assertThat(e.getErrorCode()).isEqualTo(expected));
    }

    // ================================================================== tự đăng ký

    @Test
    void register_alwaysCreatesAnActivePetOwnerWithThePhoneAsUsername() {
        UserResponse response = service.register(new RegisterRequest("Chunuoi@1", "  Nguyễn Văn A ", "0944444441", "a@example.com", null));

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(saved.capture());
        User user = saved.getValue();
        assertThat(user.getRole().getCode()).isEqualTo(RoleCode.PET_OWNER);   // không có đường nào để tự cấp quyền khác
        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(user.getUsername()).isEqualTo("0944444441");
        assertThat(user.getFullName()).isEqualTo("Nguyễn Văn A");
        assertThat(user.getRoomNumber()).isNull();
        assertThat(encoder.matches("Chunuoi@1", user.getPasswordHash())).isTrue();   // lưu BCrypt, không lưu mật khẩu thô
        assertThat(response.role()).isEqualTo(RoleCode.PET_OWNER);
    }

    @Test
    void register_refusesAPhoneNumberThatIsAlreadyRegistered() {
        when(userRepository.existsByPhoneNumber("0944444441")).thenReturn(true);

        assertError(ErrorCode.PHONE_NUMBER_ALREADY_EXISTS,
                () -> service.register(new RegisterRequest("Chunuoi@1", "A", "0944444441", null, null)));
        verify(userRepository, never()).saveAndFlush(any());
    }

    @Test
    void register_refusesAPasswordBcryptWouldReject() {
        String tooLong = "Aa1" + "x".repeat(80);

        assertError(ErrorCode.INVALID_INPUT_DATA, () -> service.register(new RegisterRequest(tooLong, "A", "0944444441", null, null)));
    }

    // ================================================================== đổi vai trò

    @Test
    void changeRole_movesStaffToTheNewRoleAndRevokesTheirSessions() {
        loginAs(ADMIN, RoleCode.ADMIN);
        User receptionist = user(7L, RoleCode.RECEPTIONIST, null);
        when(userRepository.findWithRoleById(7L)).thenReturn(Optional.of(receptionist));

        UserResponse response = service.changeRole(7L, RoleCode.VETERINARIAN);

        assertThat(receptionist.getRole().getCode()).isEqualTo(RoleCode.VETERINARIAN);
        assertThat(response.role()).isEqualTo(RoleCode.VETERINARIAN);
        verify(refreshTokenRepository).revokeAllUserTokens(7L);   // phiên kế tiếp phải mang vai trò mới
    }

    @Test
    void changeRole_awayFromAClinicRoleClearsTheFixedRoomNumber() {
        loginAs(ADMIN, RoleCode.ADMIN);
        User doctor = user(7L, RoleCode.VETERINARIAN, "P01");
        when(userRepository.findWithRoleById(7L)).thenReturn(Optional.of(doctor));

        service.changeRole(7L, RoleCode.RECEPTIONIST);

        assertThat(doctor.getRoomNumber()).isNull();
    }

    @Test
    void changeRole_betweenRoomRolesKeepsTheRoom() {
        loginAs(ADMIN, RoleCode.ADMIN);
        User tech = user(7L, RoleCode.LAB_TECHNICIAN, "LAB01");
        when(userRepository.findWithRoleById(7L)).thenReturn(Optional.of(tech));

        service.changeRole(7L, RoleCode.IMAGING_TECHNICIAN);

        assertThat(tech.getRoomNumber()).isEqualTo("LAB01");
    }

    @Test
    void changeRole_refusesSelfSameRoleAndAnythingInvolvingPetOwners() {
        loginAs(ADMIN, RoleCode.ADMIN);
        assertError(ErrorCode.CANNOT_MODIFY_OWN_ACCOUNT, () -> service.changeRole(ADMIN, RoleCode.VETERINARIAN));

        when(userRepository.findWithRoleById(7L)).thenReturn(Optional.of(user(7L, RoleCode.RECEPTIONIST, null)));
        assertError(ErrorCode.INVALID_INPUT_DATA, () -> service.changeRole(7L, RoleCode.RECEPTIONIST));
        assertError(ErrorCode.INVALID_INPUT_DATA, () -> service.changeRole(7L, RoleCode.PET_OWNER));

        when(userRepository.findWithRoleById(8L)).thenReturn(Optional.of(user(8L, RoleCode.PET_OWNER, null)));
        assertError(ErrorCode.INVALID_INPUT_DATA, () -> service.changeRole(8L, RoleCode.VETERINARIAN));
        verify(refreshTokenRepository, never()).revokeAllUserTokens(any());
    }

    // ================================================================== đặt lại mật khẩu

    @Test
    void resetPassword_byAdminReplacesTheHashAndRevokesSessions() {
        loginAs(ADMIN, RoleCode.ADMIN);
        User doctor = user(7L, RoleCode.VETERINARIAN, "P01");
        when(userRepository.findWithRoleById(7L)).thenReturn(Optional.of(doctor));

        service.resetPassword(7L, "MatKhau@2026");

        assertThat(encoder.matches("MatKhau@2026", doctor.getPasswordHash())).isTrue();
        verify(userRepository).save(doctor);
        verify(refreshTokenRepository).revokeAllUserTokens(7L);
    }

    @Test
    void resetPassword_byReceptionistOnlyForPetOwners() {
        loginAs(RECEPTIONIST, RoleCode.RECEPTIONIST);
        User owner = user(8L, RoleCode.PET_OWNER, null);
        User doctor = user(7L, RoleCode.VETERINARIAN, "P01");
        when(userRepository.findWithRoleById(8L)).thenReturn(Optional.of(owner));
        when(userRepository.findWithRoleById(7L)).thenReturn(Optional.of(doctor));

        service.resetPassword(8L, "MatKhau@2026");
        assertThat(encoder.matches("MatKhau@2026", owner.getPasswordHash())).isTrue();

        assertError(ErrorCode.ACCESS_DENIED, () -> service.resetPassword(7L, "MatKhau@2026"));
        assertThat(doctor.getPasswordHash()).isEqualTo("old-hash");   // tài khoản nhân sự không bị đụng tới
    }

    @Test
    void resetPassword_notForYourOwnAccountAndNotForUnknownOrOverlongPasswords() {
        loginAs(ADMIN, RoleCode.ADMIN);
        assertError(ErrorCode.CANNOT_MODIFY_OWN_ACCOUNT, () -> service.resetPassword(ADMIN, "MatKhau@2026"));
        assertError(ErrorCode.INVALID_INPUT_DATA, () -> service.resetPassword(7L, "Aa1" + "x".repeat(80)));
        when(userRepository.findWithRoleById(99L)).thenReturn(Optional.empty());
        assertError(ErrorCode.USER_NOT_FOUND, () -> service.resetPassword(99L, "MatKhau@2026"));
        verify(refreshTokenRepository, never()).revokeAllUserTokens(any());
    }
}
