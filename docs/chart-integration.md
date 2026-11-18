# Thiết Kế Tích Hợp Chart TradingView (Agent C - Frontend & Charts)

## 1. Giải Pháp Đã Chọn & Tài Liệu Tham Chiếu
- **Giải pháp:** Sử dụng **TradingView Advanced Real-Time Chart Widget** chính thức.
- **Tài liệu chính thức tham chiếu:**
  - TradingView Advanced Chart Widget: [https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/](https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/)
  - TradingView Lightweight Charts: [https://tradingview.github.io/lightweight-charts/](https://tradingview.github.io/lightweight-charts/)

## 2. Vì Sao Chọn TradingView Advanced Widget?
1. **Dữ liệu thật, nguồn chính thức:** Không cần tự dựng server cấp dữ liệu nến (feed server) phức tạp và tốn kém; widget đi kèm sẵn feed nến của các nhà cung cấp uy tín (OANDA, FXCM) hoàn toàn miễn phí cho cộng đồng.
2. **Đầy đủ công cụ tương tác:** Người dùng có thể zoom in/out, vẽ đường xu hướng, thêm chỉ báo RSI/MACD/MA, đổi khung thời gian trực tiếp trên chart.
3. **Tuân thủ bản quyền:** Giải pháp widget chính thức được TradingView cấp phép nhúng trên các website cộng đồng, chỉ cần giữ nguyên logo và link attribution đến TradingView.
4. **Không phụ thuộc API Key bí mật ở frontend:** An toàn, không sợ bị lộ key hay vượt quota.

## 3. Danh Sách Symbol & Timeframe Được Hỗ Trợ

| Mã hiển thị | Identifier chính xác (TradingView) | Thị trường | Nguồn dữ liệu |
| :--- | :--- | :--- | :--- |
| **EUR / USD** | `FX:EURUSD` | Euro / Đô la Mỹ | FXCM / TradingView |
| **GBP / USD** | `FX:GBPUSD` | Bảng Anh / Đô la Mỹ | FXCM / TradingView |
| **USD / JPY** | `FX:USDJPY` | Đô la Mỹ / Yên Nhật | FXCM / TradingView |
| **XAU / USD (Vàng)** | `OANDA:XAUUSD` | Giá Vàng Thế Giới (USD/Ounce) | OANDA / TradingView |

### Danh sách Timeframe hỗ trợ:
- `1` (1 Phút)
- `5` (5 Phút)
- `15` (15 Phút)
- `60` (1 Giờ)
- `240` (4 Giờ)
- `D` (1 Ngày)

## 4. Ranh Giới Điều Khiển & Hợp Đồng Đồng Bộ Phòng ("Cùng Xem Chart")

### Giới hạn kỹ thuật cần tuân thủ nghiêm ngặt:
- Widget chạy bên trong iframe có nguồn gốc từ TradingView (`tradingview.com`).
- Theo chính sách Same-Origin Policy của trình duyệt, **ứng dụng KHÔNG được và KHÔNG thể truy cập DOM nội bộ của iframe** để đọc giá raw hay con trỏ chuột.
- Ứng dụng quản lý việc chọn symbol và timeframe thông qua **Thanh Điều Khiển Bên Ngoài (External Control Bar)**.

### Hợp đồng đồng bộ giữa các thành viên trong phòng:
1. **Server là nguồn chân lý (Source of Truth):** Trạng thái phòng lưu `symbol` và `timeframe` hiện tại.
2. **Vai trò Host:** Người tạo phòng hoặc người có quyền Host khi bấm chọn symbol/timeframe trên thanh điều khiển sẽ gửi event `set_room_state` lên Server.
3. **Phát tán (Broadcast):** Server kiểm tra quyền, cập nhật trạng thái phòng và gửi `room_state_updated` đến toàn bộ client trong phòng.
4. **Chế độ xem của Client:**
   - **Chế độ "Theo phòng" (`mode: 'room'`):** Nhận sự kiện từ Host $\rightarrow$ Widget chart tự động tải lại theo đúng symbol và timeframe của Host.
   - **Chế độ "Xem riêng" (`mode: 'solo'`):** Client tự do soi cặp tiền khác mà không bị gián đoạn khi Host đổi chart. Trên màn hình sẽ hiện nút: `[Đang xem riêng - Bấm để quay lại theo phòng]`.

## 5. Xử Lý Lỗi & Tình Huống Mất Kết Nối
- **Bộ đếm thời gian tải (Loading Watchdog 8s):** Nếu sau 8 giây script TradingView không tải được (do mạng yếu hoặc AdBlock chặn):
  - Hiển thị thông báo rõ ràng: *"Không thể tải chart từ TradingView. Vui lòng kiểm tra kết nối mạng hoặc tắt tiện ích chặn quảng cáo đối với domain tradingview.com"*.
  - Cung cấp nút **"Thử tải lại chart"**.
  - Cung cấp link ngoài: **"Mở trực tiếp trên TradingView"** trỏ đúng symbol đang chọn.
  - **Tuyệt đối không dùng dữ liệu ngẫu nhiên (nến giả)** rồi ghi là thị trường thật.
