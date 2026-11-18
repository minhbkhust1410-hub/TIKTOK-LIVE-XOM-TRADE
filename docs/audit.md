# Audit & Đánh Giá Hiện Trạng Kiến Trúc (Agent A)

## 1. Thông Tin Môi Trường & Stack Thực Tế
- **Hệ điều hành:** Windows 10/11 (PowerShell/CMD).
- **Runtime:** Node.js v24.19.0 (LTS).
- **Package Manager:** npm v11.17.0.
- **Dependencies chính:**
  - `express`: 4.21.2 (HTTP REST API & static file server)
  - `ws`: 8.18.3 (WebSocket realtime communication)
  - `tiktok-live-connector`: 2.5.0 (Bộ kết nối live TikTok)
- **DevDependencies & Testing:**
  - Node.js native test runner (`node --test test/*.test.js`)
- **Port hoạt động:** Mặc định `3001` (qua `start.cmd` hoặc biến môi trường `PORT`).

## 2. Kiến Trúc Hiện Tại Của Repo Gốc (`tilita-tiktok-live-theanh`)
- **Mô hình hoạt động:** Server-Authoritative Local Web App phục vụ streamer TikTok Live đơn lẻ.
- **Luồng dữ liệu:**
  1. `src/tiktok.js` lắng nghe sự kiện TikTok (quà, comment, like, share, follow).
  2. `src/core.js` (`LiveEngine`): Chuẩn hóa sự kiện (`normalizeEvent`), phân loại quà theo 7 mốc xu (`GIFT_TIERS`), xếp hàng đợi ưu tiên (`PriorityQueue`) chống nghẽn (sau 5 lượt ưu tiên nhường 1 lượt miễn phí), deduplicate combo quà.
  3. Quản lý trạng thái chánh điện (`src/hall.js`): Giới hạn 28 chỗ ngồi hiển thị (TOP 4 mạnh thường quân cố định + 24 phật tử luân phiên 10s/trang).
  4. Quản lý bộ 99 quẻ xăm (`src/fortunes.js`): Đầy đủ 99 file `.wav` giọng đọc Mai Chi trong `public/assets/fortunes/an-01.wav` đến `an-99.wav`.
  5. Phát realtime qua WebSocket (`server.js` route `/ws`) với cơ chế throttle 80ms tới các client (màn hình `overlay.html` và quản trị `admin.html`).
  6. Âm thanh: Web Audio API tổng hợp tiếng chuông chùa (`sine` wave 220Hz, 445Hz, 665Hz, 1120Hz) và Audio Ducking (giảm 70% nhạc nền khi phát giọng đọc xăm).
  7. Lưu trữ: `src/store.js` (`JsonStore`) ghi JSON an toàn, chống ghi đè file hỏng.

## 3. Các Lỗi & Hạn Chế Tồn Tại Cần Xử Lý
1. **Thiếu file nhạc nền MP3:** Repo gốc không commit file mp3 mà chỉ có file `README.md`. Chúng tôi đã bổ sung 3 bản ambient WAV (`sen-tinh.wav`, `truc-an.wav`, `may-thien.wav`) và cập nhật metadata `config/music.json`.
2. **Kiểm tra Host/Origin nghiêm ngặt:** `server.js` dòng 47–49 chặn tất cả request không có `Host: 127.0.0.1` hoặc `localhost`. Khi triển khai ra LAN hoặc domain, cần cơ chế cho phép cấu hình linh hoạt.
3. **Mô hình đơn phòng (Single Room / Single Overlay):** Bản gốc chỉ thiết kế cho 1 người phát stream nhận lệnh từ TikTok; không có khái niệm nhiều phòng cộng đồng, không có chat 2 chiều giữa các người dùng web với nhau, không có chart tài chính.

## 4. Chiến Lược Tái Sử Dụng & Mở Rộng Sang "Đu Chart Online"

| Thành phần gốc | Đánh giá | Hướng xử lý sang "Đu Chart Online" |
| :--- | :--- | :--- |
| **Hệ thống WebSocket & HTTP (`server.js`)** | Rất tốt, nhẹ, tin cậy | Giữ lại và mở rộng hỗ trợ đa phòng (`/ws?roomId=...`), heartbeat presence chuẩn. |
| **Bộ 99 Quẻ xăm & Giọng đọc (`fortunes.js`)** | 99 file WAV chất lượng cao | Tái sử dụng thành "Bộ 99 Quẻ Nến / Bói Xu Hướng Forex" hài hước cho trader. |
| **Hệ thống Âm thanh Web Audio & Ducking** | Siêu nhẹ, zero-latency | Giữ nguyên tiếng chuông tỉnh tâm (Discipline Bell), phát khi thanh lý/chốt lời/gõ chuông. |
| **Engine Hạt Canvas 30 FPS (`particles.js`)** | Cực kỳ tối ưu CPU | Chuyển đổi thành hiệu ứng nến xanh bay, tiền vàng rơi, vệt sét margin call. |
| **Bộ lưu trữ JsonStore (`store.js`)** | Nhẹ, an toàn | Tái sử dụng để lưu danh sách phòng, điểm ảo người dùng, bảng xếp hạng và audit log. |
| **TikTok Connector (`tiktok.js`)** | Phục vụ live stream cũ | Giữ ở chế độ tùy chọn; bổ sung Web Community Gateway cho người dùng web trực tiếp. |
| **Giao diện người dùng** | Giao diện dọc 9:16 OBS | Xây dựng giao diện responsive (Desktop & Mobile) có TradingView Chart trung tâm. |

## 5. Ràng Buộc Bản Quyền & Trách Nhiệm Sản Phẩm
- **TradingView Widget:** Tuân thủ điều khoản sử dụng chính thức của TradingView, giữ nguyên logo và link điều hướng đến nguồn gốc dữ liệu.
- **Tuyên bố giải trí:** Sản phẩm là nền tảng giải trí cộng đồng thuần túy. Điểm ảo không quy đổi tiền thật, không nạp/rút, không khuyến nghị giao dịch tài chính.
