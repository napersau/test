// Cấu hình kết nối tới backend. Chỉ cần đặt REACT_APP_API_URL (xem fe/.env.example).
// API Gateway là cổng duy nhất của backend; WebSocket thông báo cũng đi qua Gateway tại /ws.
export const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8080').replace(/\/+$/, '');
export const WS_URL = `${API_URL.replace(/^http/i, 'ws')}/ws`;

export const SESSION_KEY = 'vetclinic_session';
