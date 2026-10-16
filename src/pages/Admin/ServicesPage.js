import CatalogManager from '../../features/catalog/components/CatalogManager';
import useAdminCatalog from '../../features/catalog/useAdminCatalog';
import { servicesRepository } from '../../features/services/servicesRepository';
import { SERVICE_TYPES, money } from '../../features/catalog/catalogPolicy';

const columns = [
  { label: 'Nhóm dịch vụ', render: (item) => <span className="catalog-group">{SERVICE_TYPES[item.serviceType]}</span> },
  { label: 'Đơn giá', render: (item) => <strong className="catalog-price">{money(item.price)}</strong> },
  { label: 'Kết quả', render: (item) => <div className="catalog-flags">{item.serviceType === 'LABORATORY' && <span>{item.labItemIds?.length || 0} chỉ số xét nghiệm</span>}{item.serviceType === 'IMAGING' && <span>Mô tả + ảnh</span>}{!['LABORATORY', 'IMAGING'].includes(item.serviceType) && <small>Không cần kết quả</small>}</div> },
];
export default function ServicesPage() {
  const catalog = useAdminCatalog(servicesRepository);
  const { items } = catalog;
  const stats = [
    { label: 'Tổng dịch vụ', value: items.length, note: 'Danh mục của phòng khám', icon: 'service', tone: 'blue' },
    { label: 'Đang sử dụng', value: items.filter((item) => item.status === 'ACTIVE').length, note: 'Dịch vụ đang cung cấp', icon: 'check', tone: 'teal' },
    { label: 'Ngừng sử dụng', value: items.filter((item) => item.status === 'INACTIVE').length, note: 'Giữ lại dữ liệu danh mục', icon: 'lock', tone: 'orange' },
    { label: 'Nhóm dịch vụ', value: new Set(items.map((item) => item.serviceType)).size, note: 'Phân loại chuyên môn', icon: 'grid', tone: 'violet' },
  ];
  return <CatalogManager kind="service" catalog={catalog} title="Quản lý dịch vụ" intro="Quản lý 9 nhóm dịch vụ kỹ thuật và đơn giá. Dịch vụ đã phát sinh trong lịch sử khám chỉ được ngừng cung cấp, không xóa." groups={SERVICE_TYPES} groupKey="serviceType" columns={columns} stats={stats} />;
}
