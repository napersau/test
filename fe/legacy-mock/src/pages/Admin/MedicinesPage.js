import { useState } from 'react';
import CatalogManager from '../../features/catalog/components/CatalogManager';
import useAdminCatalog from '../../features/catalog/useAdminCatalog';
import { medicinesRepository } from '../../features/medicines/medicinesRepository';
import BatchManager from '../../features/medicines/components/BatchManager';
import { DOSAGE_FORMS, MEDICINE_CATEGORIES, MEDICINE_UNITS, clinicToday, money } from '../../features/catalog/catalogPolicy';

const columns = [
  { label: 'Hoạt chất / Dạng', render: (item) => <div className="catalog-stacked"><span>{item.activeIngredient || MEDICINE_CATEGORIES[item.category]}</span><small>{DOSAGE_FORMS[item.dosageForm] || 'Khác'} · {MEDICINE_UNITS[item.unit]}</small></div> },
  { label: 'Giá bán', render: (item) => <strong className="catalog-price">{money(item.salePrice)}</strong> },
  { label: 'Tồn kho', render: (item) => <div className="catalog-stacked"><strong>{item.availableStock} <small>có thể dùng</small></strong><small>Tổng: {item.totalStock} · Ngưỡng cảnh báo: {item.minStockLevel}</small><div className="catalog-flags">{item.status === 'ACTIVE' && item.lowStock && <span className="tone-orange">Chạm ngưỡng cảnh báo</span>}{item.nearExpiryBatches > 0 && <span className="tone-orange">Sắp hết hạn</span>}{item.expiredStock > 0 && <span className="tone-inactive">{item.expiredStock} hết hạn</span>}</div></div> },
];
export default function MedicinesPage() {
  const catalog = useAdminCatalog(medicinesRepository);
  const [batchId, setBatchId] = useState(null);
  const { items } = catalog;
  const selected = items.find((item) => item.id === batchId);
  const today = clinicToday();
  const stats = [
    { label: 'Danh mục thuốc', value: items.length, note: `${items.filter((item) => item.status === 'ACTIVE').length} thuốc đang sử dụng`, icon: 'medicine', tone: 'blue' },
    { label: 'Chạm ngưỡng cảnh báo', value: items.filter((item) => item.status === 'ACTIVE' && item.lowStock).length, note: 'Thuốc đang sử dụng cần bổ sung', icon: 'box', tone: 'orange' },
    { label: 'Lô sắp hết hạn', value: items.reduce((sum, item) => sum + item.nearExpiryBatches, 0), note: 'Còn tồn · trong 30 ngày tới', icon: 'calendar', tone: 'violet' },
    { label: 'Lô đã hết hạn', value: items.reduce((sum, item) => sum + item.batches.filter((batch) => batch.expiry < today && batch.remaining > 0).length, 0), note: 'Không tính vào tồn có thể dùng', icon: 'lock', tone: 'orange' },
  ];
  return <CatalogManager kind="medicine" catalog={catalog} title="Quản lý thuốc" intro="Quản lý danh mục thuốc, nhập kho, điều chỉnh sau kiểm kê và cảnh báo khi tồn chạm ngưỡng tối thiểu." groups={MEDICINE_CATEGORIES} groupKey="category" columns={columns} stats={stats} onBatches={setBatchId}>
    {selected && <BatchManager medicine={selected} saving={catalog.saving} onClose={() => setBatchId(null)} onImport={(values) => catalog.importBatch(selected.id, values)} onAdjust={(batchId, values) => catalog.adjustStock(selected.id, batchId, values)} />}
  </CatalogManager>;
}
