import { RECEPTION_LINKS } from './receptionNavigation';
import { VETERINARIAN_LINKS } from './veterinarianNavigation';
export const STAFF_AREAS = {
  reception: { label: 'lễ tân', accountLabel: 'Nhân viên lễ tân', title: 'Không gian lễ tân', subtitle: 'Tiếp nhận · Lịch hẹn · Thu ngân', brand: 'RECEPTION CONSOLE', caption: 'KHU VỰC LỄ TÂN', home: '/reception/queue', themeKey: 'pawcare_reception_theme_v1', links: RECEPTION_LINKS, description: 'Tra cứu chủ nuôi, cập nhật thông tin liên hệ và quản lý hồ sơ thú cưng.' },
  vet: { label: 'bác sĩ', accountLabel: 'Bác sĩ thú y', title: 'Không gian bác sĩ', subtitle: 'Lịch được phân công · Hồ sơ khám', brand: 'VETERINARIAN CONSOLE', caption: 'KHU VỰC BÁC SĨ', home: '/vet/today', themeKey: 'pawcare_vet_theme_v1', links: VETERINARIAN_LINKS, description: 'Theo dõi lịch được phân công, tiếp tục hồ sơ và hoàn tất khám đúng quy trình.' },
};
