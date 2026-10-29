import { WS_URL } from '../config';
import { getSession } from './session';
import { refreshAccessToken } from './client';

// Client STOMP 1.2 tối thiểu qua WebSocket thuần (notification-service không dùng SockJS). Chỉ nhận thông báo:
// backend cấm client gửi dữ liệu lên kênh. JWT gửi trong frame CONNECT vì trình duyệt không gắn được header cho WebSocket.
const NULL = '\u0000';

export function parseFrames(raw) {
  return String(raw).split(NULL).map((part) => part.replace(/^\n+/, '')).filter((part) => part.trim()).map((part) => {
    const separator = part.indexOf('\n\n');
    const head = (separator === -1 ? part : part.slice(0, separator)).split('\n');
    const headers = {};
    head.slice(1).forEach((line) => { const colon = line.indexOf(':'); if (colon > 0) headers[line.slice(0, colon)] = line.slice(colon + 1); });
    return { command: head[0].trim(), headers, body: separator === -1 ? '' : part.slice(separator + 2) };
  });
}

export const frame = (command, headers = {}) => `${command}\n${Object.entries(headers).map(([key, value]) => `${key}:${value}`).join('\n')}\n\n${NULL}`;

/**
 * Kết nối và đăng ký kênh riêng + kênh theo vai trò. Tự nối lại với độ trễ tăng dần khi mất kết nối; mỗi lần nối lại dùng
 * Access Token hiện tại (refresh trước nếu backend từ chối vì token hết hạn).
 * Trả về hàm đóng kết nối.
 */
export function connectNotifications({ role, onMessage, onState = () => {}, WebSocketImpl = WebSocket }) {
  let socket = null; let closed = false; let attempt = 0; let timer = null;

  const open = () => {
    const token = getSession()?.accessToken;
    if (closed || !token) return;
    onState('connecting');
    socket = new WebSocketImpl(WS_URL);
    let connected = false;
    socket.onopen = () => socket.send(frame('CONNECT', { 'accept-version': '1.2', host: 'localhost', 'heart-beat': '0,0', Authorization: `Bearer ${token}` }));
    socket.onmessage = (event) => {
      parseFrames(event.data).forEach((item) => {
        if (item.command === 'CONNECTED') {
          connected = true; attempt = 0; onState('connected');
          socket.send(frame('SUBSCRIBE', { id: 'sub-user', destination: '/user/queue/notifications' }));
          socket.send(frame('SUBSCRIBE', { id: 'sub-role', destination: `/topic/role/${role}` }));
        } else if (item.command === 'MESSAGE') {
          try { onMessage(JSON.parse(item.body)); } catch { /* bỏ qua thông báo hỏng */ }
        } else if (item.command === 'ERROR' && !connected) {
          // Thường là token hết hạn: làm mới rồi nối lại ở lần thử kế tiếp
          refreshAccessToken().catch(() => {});
        }
      });
    };
    socket.onclose = () => {
      onState('disconnected');
      if (closed) return;
      attempt += 1;
      timer = setTimeout(open, Math.min(30000, 1000 * 2 ** Math.min(attempt, 5)));
    };
    socket.onerror = () => { try { socket.close(); } catch { /* đã đóng */ } };
  };

  open();
  return () => {
    closed = true; clearTimeout(timer);
    try { socket?.close(); } catch { /* đã đóng */ }
  };
}
