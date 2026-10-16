import { render, screen } from '@testing-library/react';
import App from './App';

test('renders PawCare homepage and primary booking action', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /chăm sóc trọn vẹn/i })).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: /đặt lịch/i }).length).toBeGreaterThan(0);
  expect(screen.getByRole('heading', { name: /đặt lịch khám/i })).toBeInTheDocument();
});
