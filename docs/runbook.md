# Sổ Tay Vận Hành & Hướng Dẫn Kỹ Thuật (Runbook) — Đu Chart Online

## 1. Thông Tin Phiên Bản & Môi Trường Yêu Cầu
- **Tên dự án:** Đu Chart Online (Forex & Gold Community Entertainment)
- **Phiên bản:** v1.0.0
- **Node.js:** `>= 24.0.0` (LTS khuyến nghị)
- **NPM:** `>= 10.0.0`
- **Hệ điều hành:** Windows 10/11, macOS, Linux (Ubuntu 22.04+).

---

## 2. Hướng Dẫn Cài Đặt & Khởi Chạy Local

### Bước 1: Cài đặt Dependencies
```bash
npm ci --no-audit --no-fund
```

### Bước 2: Chạy Ứng Dụng
- **Trên Windows:**
  Nhấp đúp chuột vào file `start.cmd` hoặc chạy qua terminal:
  ```powershell
  cmd /c start.cmd
  ```
- **Trên macOS / Linux:**
  ```bash
  PORT=3001 node server.js --open
  ```

### Bước 3: Truy Cập Các Giao Diện
- **Màn hình LIVE Stream dọc cho OBS / TikTok Live Studio (1080 × 1920):** [http://127.0.0.1:3001/overlay](http://127.0.0.1:3001/overlay)
- **Phòng Điều Khiển Streamer / Host:** [http://127.0.0.1:3001/admin](http://127.0.0.1:3001/admin)
- **Màn hình Xem trước Live Stream (Preview):** [http://127.0.0.1:3001/preview](http://127.0.0.1:3001/preview)
- **Trang web Cộng đồng Forex:** [http://127.0.0.1:3001/](http://127.0.0.1:3001/)
- **Vào phòng xem chart theo link:** [http://127.0.0.1:3001/room/gold-rush](http://127.0.0.1:3001/room/gold-rush)

---

## 3. Biến Môi Trường (Environment Variables)

Xem chi tiết trong file `.env.example`:
- `PORT`: Cổng mạng ứng dụng lắng nghe (mặc định: `3001`).
- `APP_TITLE`: Tên hiển thị trên website (mặc định: `Đu Chart Online`).
- `ALLOWED_HOSTS`: Danh sách host được phép truy cập (phân tách bởi dấu phẩy, ví dụ: `localhost,duchart.example.com`).
- `DATA_DIR`: Thư mục lưu trữ dữ liệu điểm và cấu hình (mặc định: `./output/qa-v2/data` hoặc `./data`).

---

## 4. Kiểm Thử Hệ Thống (Automated Testing)
Chạy toàn bộ 51 bài unit và integration tests (bao gồm kiểm thử mô phỏng 2 client cùng lúc qua WebSocket):
```bash
npm test
```

---

## 5. Hướng Dẫn Bảo Trì & Tùy Biến

### A. Thay đổi / Thêm câu đùa phản hồi Forex
- Mở file: `src/score.js` (Object `ACTIONS`) hoặc `docs/product-spec.md`.
- Chỉnh sửa trường `quote` trong các hành động hoặc thêm thông điệp mới.

### B. Thay đổi danh mục cặp tiền & Khung thời gian
- Mở file: `src/rooms.js`.
- Chỉnh sửa mảng `SUPPORTED_SYMBOLS` (ví dụ: thêm `FX:USDCHF`) và `SUPPORTED_TIMEFRAMES`.
- Chỉnh sửa danh sách nút bấm tương ứng trong `public/index.html`.

### C. Thay đổi ngưỡng điểm và danh hiệu
- Mở file: `src/score.js`.
- Chỉnh sửa mảng `ACHIEVEMENTS` (thay đổi `minScore`, `title` và `badge`).

### D. Thêm / Thay thế nhạc thiền nền
- Đặt file `.mp3` hoặc `.wav` vào thư mục: `public/assets/music/`.
- Cập nhật nhãn bài hát trong `config/music.json`.
- Mở trang Admin bấm **Cập nhật danh sách nhạc**.

---

## 6. Xử Lý Sự Cố Thường Gặp (Troubleshooting)

| Vấn đề | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| **Không nghe thấy âm thanh chuông / quẻ** | Trình duyệt chặn Autoplay | Click chuột vào trang web hoặc bấm nút **Âm thanh: BẬT** ở góc trên màn hình. |
| **Chart TradingView báo lỗi không tải được** | AdBlock chặn script hoặc mất mạng | Tắt tiện ích AdBlock cho trang web hoặc bấm nút *"Mở trên TradingView"* để xem trực tiếp. |
| **Cổng 3001 bị báo lỗi EADDRINUSE** | Phiên server cũ chưa tắt | Chạy lệnh `taskkill /F /IM node.exe` trong PowerShell để dọn dẹp các tiến trình Node.js cũ. |
| **Người dùng chat không hiển thị cho người khác** | Khác phòng hoặc mất kết nối WS | Kiểm tra mã phòng trên thanh tiêu đề, mở F12 kiểm tra kết nối WebSocket `/ws?roomId=...`. |

---

## 7. Triển Khai Lên Máy Chủ / Cloud (Deployment)
1. Có thể đóng gói chạy bằng PM2 trên VPS Linux:
   ```bash
   pm2 start server.js --name "du-chart" --env PORT=3001
   ```
2. Cấu hình Nginx Reverse Proxy hỗ trợ WebSocket:
   ```nginx
   location / {
       proxy_pass http://127.0.0.1:3001;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
   }
   ```
