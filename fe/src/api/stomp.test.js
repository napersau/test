import { connectNotifications, frame, parseFrames } from './stomp';
import { clearSession, setSession } from './session';

describe('khung STOMP', () => {
  test('frame() tạo lệnh, header và ký tự kết thúc NULL', () => {
    expect(frame('SUBSCRIBE', { id: 'sub-0', destination: '/user/queue/notifications' })).toBe('SUBSCRIBE\nid:sub-0\ndestination:/user/queue/notifications\n\n\u0000');
  });

  test('parseFrames() tách nhiều khung trong một tin nhắn và giữ nguyên thân JSON', () => {
    const raw = 'CONNECTED\nversion:1.2\n\n\u0000MESSAGE\ndestination:/user/queue/notifications\nmessage-id:9\n\n{"id":"n1","title":"Có ca mới"}\u0000';
    const frames = parseFrames(raw);
    expect(frames.map((item) => item.command)).toEqual(['CONNECTED', 'MESSAGE']);
    expect(frames[0].headers.version).toBe('1.2');
    expect(JSON.parse(frames[1].body)).toEqual({ id: 'n1', title: 'Có ca mới' });
  });

  test('parseFrames() bỏ qua heart-beat (dòng trống)', () => {
    expect(parseFrames('\n\n')).toEqual([]);
  });
});

describe('connectNotifications', () => {
  class FakeSocket {
    constructor(url) { this.url = url; this.sent = []; FakeSocket.last = this; }
    send(data) { this.sent.push(data); }
    close() { this.onclose?.(); }
  }
  beforeEach(() => { clearSession(); setSession({ accessToken: 'jwt-token', refreshToken: 'r', user: { id: 1 } }, true); });
  afterEach(() => clearSession());

  test('gửi JWT trong khung CONNECT, đăng ký kênh riêng + kênh theo vai trò của chính mình, nhận thông báo', () => {
    const messages = []; const states = [];
    const close = connectNotifications({ role: 'RECEPTIONIST', onMessage: (m) => messages.push(m), onState: (s) => states.push(s), WebSocketImpl: FakeSocket });
    const socket = FakeSocket.last;
    expect(socket.url).toMatch(/^ws:\/\/.*\/ws$/);
    socket.onopen();
    expect(socket.sent[0]).toContain('CONNECT');
    expect(socket.sent[0]).toContain('Authorization:Bearer jwt-token');
    socket.onmessage({ data: 'CONNECTED\nversion:1.2\n\n\u0000' });
    expect(socket.sent.some((item) => item.includes('destination:/user/queue/notifications'))).toBe(true);
    expect(socket.sent.some((item) => item.includes('destination:/topic/role/RECEPTIONIST'))).toBe(true);
    socket.onmessage({ data: 'MESSAGE\ndestination:/user/queue/notifications\n\n{"id":"n1","title":"Ca mới"}\u0000' });
    expect(messages).toEqual([{ id: 'n1', title: 'Ca mới' }]);
    expect(states).toEqual(['connecting', 'connected']);
    close();
  });

  test('chưa đăng nhập thì không mở kết nối', () => {
    clearSession(); FakeSocket.last = null;
    const close = connectNotifications({ role: 'ADMIN', onMessage() {}, WebSocketImpl: FakeSocket });
    expect(FakeSocket.last).toBeNull();
    close();
  });
});
