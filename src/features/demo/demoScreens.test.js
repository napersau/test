import { render, screen, cleanup } from '@testing-library/react';
import App from '../../App';
import { authenticate } from '../auth/authStorage';
import { loadDemoDataset, extendDemoDataset } from './demoRepository';
import { DEMO_ACCOUNTS } from './demoConfig';
import { findAccount } from '../users/usersRepository';

// Mỗi màn hình của ba vai trò phải dựng được trên bộ demo đầy đủ (V1 + V2), không rơi vào trạng thái lỗi dữ liệu.
const ROUTES = {
  'customer@pawcare.vn': ['/portal/pets', '/portal/appointments', '/portal/notifications', '/portal/medical-history', '/portal/vaccinations', '/portal/prescriptions', '/portal/invoices'],
  'vet@pawcare.vn': ['/vet/today', '/vet/callback', '/vet/lab', '/vet/imaging', '/vet/appointments', '/vet/records', '/vet/diagnoses', '/vet/prescriptions', '/vet/service-orders', '/vet/health-history'],
  'reception@pawcare.vn': ['/reception/queue', '/reception/intake', '/reception/appointments', '/reception/invoices', '/reception/dispense', '/reception/customers', '/reception/pets'],
};
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); findAccount('admin-default'); loadDemoDataset('admin-default', new Date(), { adoptBaseAccounts: true }); extendDemoDataset('admin-default'); });
test('demo accounts advertised on the login page are the ones that own the data', () => {
  expect(DEMO_ACCOUNTS.map((item) => item.email)).toEqual(Object.keys(ROUTES));
});
describe.each(Object.entries(ROUTES))('%s', (email, paths) => {
  test.each(paths)('%s renders without a data error', async (path) => {
    authenticate(email, '123456', true); window.history.replaceState({}, '', path); render(<App />);
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText(/không hợp lệ|bị lỗi|Không tải được/)).not.toBeInTheDocument();
    cleanup();
  });
});

test.each([['vet@pawcare.vn', '/vet/callback', 'Coco'], ['vet@pawcare.vn', '/vet/lab', 'Miu'], ['reception@pawcare.vn', '/reception/invoices', 'INV-DEMO2-1'], ['reception@pawcare.vn', '/reception/queue', 'Nâu'], ['reception@pawcare.vn', '/reception/intake', 'Lucky'], ['reception@pawcare.vn', '/reception/appointments', 'APT-DEMO-025'],
  ['customer@pawcare.vn', '/portal/invoices', 'INV-DEMO2-1']])('%s %s shows demo case %s', async (email, path, text) => {
  authenticate(email, '123456', true); window.history.replaceState({}, '', path); render(<App />);
  expect((await screen.findAllByText(new RegExp(text))).length).toBeGreaterThan(0);
});
