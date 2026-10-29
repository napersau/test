import { useEffect } from 'react';
import CustomerLayout from '../../layouts/CustomerLayout';
import { NotificationList } from '../../components/layout/NotificationBell';
import { PageHead, Panel } from '../../components/ui';
import { useNotifications } from '../../contexts/NotificationContext';

export default function NotificationsPage() {
  const { items, connection, markAllRead } = useNotifications();
  useEffect(() => { markAllRead(); }, [markAllRead, items.length]);
  return <CustomerLayout>
    <PageHead eyebrow="THÔNG BÁO" title="Thông báo">Cập nhật về lịch hẹn, tiếp nhận, kết quả khám và thanh toán. {connection === 'connected' ? 'Đang nhận thông báo trực tiếp.' : 'Chưa kết nối thông báo trực tiếp — tải lại trang để thử lại.'}</PageHead>
    <Panel><NotificationList items={items} empty="Chưa có thông báo nào. Thông báo mới sẽ hiện ở đây ngay khi phòng khám cập nhật." /></Panel>
  </CustomerLayout>;
}
