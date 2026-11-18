# Thiết Kế Kiến Trúc Hệ Thống (Agent A - Lead & Architecture)

## 1. Sơ Đồ Kiến Trúc Hệ Thống

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TRÌNH DUYỆT NGƯỜI DÙNG                          │
│                                                                        │
│  ┌───────────────────────┐  ┌────────────────┐  ┌───────────────────┐  │
│  │ TradingView Widget    │  │  Khay Tương Tác│  │ Chat & Đạo Tràng  │  │
│  │ (Iframe chính thức)   │  │  (Web Audio +  │  │ (Live Presence +  │  │
│  │ Realtime Forex Charts │  │   Quẻ Xăm 99)  │  │  Reactions)       │  │
│  └───────────────────────┘  └────────────────┘  └───────────────────┘  │
└───────────────────▲──────────────────────────────────────▲─────────────┘
                    │                                      │
           HTTP / Static Assets                  WebSocket /ws (2 chiều)
                    │                                      │
┌───────────────────▼──────────────────────────────────────▼─────────────┐
│                       NODE.JS BACKEND (Express + ws)                   │
│                                                                        │
│   ┌─────────────────────┐  ┌──────────────────────┐  ┌───────────────┐ │
│   │ Room Manager        │  │ Presence & Heartbeat │  │ Chat & Anti-  │ │
│   │ (State & Sync)      │  │ (Chống đếm ảo)       │  │ Spam Engine   │ │
│   └─────────────────────┘  └──────────────────────┘  └───────────────┘ │
│                                                                        │
│   ┌─────────────────────┐  ┌──────────────────────┐  ┌───────────────┐ │
│   │ Score & Achievement │  │ 99 Quẻ Nến Audio     │  │ JsonStore     │ │
│   │ Ledger (Anti-cheat) │  │ Catalog Loader       │  │ (Persistence) │ │
│   └─────────────────────┘  └──────────────────────┘  └───────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Giao Thức WebSocket (`/ws`)

### A. Client Gửi Lên Server (`Client -> Server`):
1. `join_room`: `{ type: "join_room", data: { roomId: string, user: { id: string, name: string, avatar?: string } } }`
2. `leave_room`: `{ type: "leave_room", data: { roomId: string } }`
3. `set_room_state`: `{ type: "set_room_state", data: { roomId: string, symbol: string, timeframe: string } }` (Chỉ Host hoặc quyền điều khiển)
4. `chat_message`: `{ type: "chat_message", data: { roomId: string, text: string } }`
5. `reaction`: `{ type: "reaction", data: { roomId: string, reactionId: string } }`
6. `action`: `{ type: "action", data: { roomId: string, actionId: "incense"|"fortune"|"bell"|"oxygen"|"grand" } }`
7. `heartbeat`: `{ type: "heartbeat", data: { roomId: string } }`
8. `admin_command`: `{ type: "admin_command", data: { command: "mute"|"delete_message"|"lock_room", targetId: string, secret?: string } }`

### B. Server Phát Xuống Client (`Server -> Client`):
1. `welcome`: Trả về danh tính đã xác thực, cấu hình hệ thống và danh mục quẻ xăm.
2. `room_snapshot`: Gửi trạng thái đầy đủ khi vừa vào phòng (symbol, timeframe, hostId, presence list, 30 tin nhắn gần nhất, bảng điểm).
3. `room_state_updated`: Phát khi Host đổi symbol hoặc timeframe.
4. `chat_broadcast`: Tin nhắn mới đã được sanitize và gán timestamp, ID.
5. `reaction_broadcast`: Reaction ngắn bay lên màn hình.
6. `action_broadcast`: Nghi lễ Forex (thắp nhang, gõ chuông, quẻ nến, bơm oxy) kèm điểm thưởng và hiệu ứng âm thanh.
7. `presence_updated`: Cập nhật danh sách và số lượng người online thực tế.
8. `leaderboard_updated`: Bảng xếp hạng điểm ảo mới nhất.
9. `error`: Thông báo lỗi (ví dụ: bị cooldown, tin nhắn quá dài, không có quyền host).

---

## 3. Các Thực Thể Dữ Liệu (Data Models)

1. **`GuestIdentity`**:
   - `id`: UUID chuỗi định danh duy nhất (lưu trong `localStorage` để giữ danh tính khi refresh).
   - `name`: Tên hiển thị (tối đa 30 ký tự, mặc định `Trader_XXXX`).
   - `score`: Tổng điểm ảo tích lũy.
   - `level`: Cấp bậc danh hiệu (1 đến 6).
   - `actions`: Thống kê số lần gồng lệnh, bói nến, gõ chuông.

2. **`Room`**:
   - `id`: Mã phòng (ví dụ: `general`, `gold-rush`, `scalping-night`).
   - `name`: Tên phòng (ví dụ: *"Phòng Cháy Tài Khoản #1"*).
   - `symbol`: Cặp tiền đang hiển thị (mặc định `FX:EURUSD`).
   - `timeframe`: Khung thời gian (mặc định `15`).
   - `hostId`: ID của Host hiện tại.
   - `locked`: Trạng thái khóa phòng (chỉ Host được đổi chart).
   - `participants`: Map danh sách người dùng đang online (dựa trên active WebSocket connection).
   - `messages`: Hàng đợi 50 tin nhắn chat gần nhất.

3. **`ScoreLedger & Anti-Spam`**:
   - Quản lý cooldown theo từng người dùng bằng `Map<userId, lastActionTime>`.
   - Điểm được tính toán và lưu trữ độc quyền ở Server. Không nhận payload `score` từ phía client.

---

## 4. Cơ Chế Presence & Chống Đếm Người Ảo
- Mỗi kết nối WebSocket giữ cờ `isAlive = true`.
- Cứ mỗi 10 giây, Server gửi `ping` tới tất cả client. Nếu client không phản hồi trong 2 chu kỳ, kết nối bị đóng và loại bỏ khỏi danh sách phòng.
- Khi người dùng refresh trang (F5): Client gửi kèm `userId` cũ; Server phát hiện kết nối mới thay thế kết nối cũ của cùng một người, **số lượng online không bị nhân đôi**.
