# Bàn giao nhanh cho AI tiếp quản

## Mục tiêu đang chạy

Đây là web show "Xóm Trade · Động Đu Chart": một màn hình khách xem/overlay và một trang admin. Tất cả phải tự diễn được ngay cả khi chưa kết nối TikTok Live: Đại chiến Bò–Gấu, tin nóng, còi, tiểu phẩm, người ngồi dưới và âm thanh (âm thanh cần người xem bấm mở một lần vì trình duyệt chặn autoplay).

## Chạy local

Máy này đang chạy Node 25 tại `C:\Program Files\nodejs\node.exe`. Dữ liệu local ở `output\qa-v2\data`.

```powershell
cd 'C:\Users\ADMIN\Documents\ChatGPT\TIKTOK LIVE XOM TRADE'
$env:TILITA_DATA_DIR = "$PWD\output\qa-v2\data"
& 'C:\Program Files\nodejs\node.exe' server.js
```

Mở:

- Khách + admin cùng một trang: `http://127.0.0.1:3001/live-test`
- Overlay khách: `http://127.0.0.1:3001/overlay`
- Admin: `http://127.0.0.1:3001/admin`

Nếu chưa có `node_modules`, dùng `pnpm install` (không dùng `npm ci`: dependency `msedge-tts` yêu cầu pnpm). Có thể cần chạy `pnpm approve-builds` và chọn `msedge-tts`.

## Những phần đã chỉnh

| Khu vực | File | Trạng thái |
|---|---|---|
| Tự điều phối show | `src/ambient.js`, `server.js` | Bật mặc định: tự Bò/Gấu, tin, comedy, vòng quay, legend, còi. |
| Đám đông 28 người | `public/js/hall.js`, `public/overlay-v2.css` | Luôn đầy ghế; lắc mạnh; có cá tính, nhóm chat, căng thẳng/chúc mừng/chào khách. |
| Liên kết sự kiện → phản ứng | `public/js/overlay.js` | Bò/Gấu, tin, comedy, còi đổi trạng thái cảm xúc của đám đông. |
| Audio | `public/overlay.html`, `public/js/overlay.js`, `public/overlay.css` | Nút bật âm thanh hiển thị; cần một click hợp lệ của người xem. |
| Điều khiển demo | `public/admin.html`, `public/js/admin.js` | Có nút tạo comedy/legend; nhưng show vẫn tự chạy. |

## Kiểm tra nhanh

1. Vào `/live-test`, chờ 10–30 giây: Bò/Gấu phải tự chuyển động và lực thay đổi.
2. Người dưới phải lắc ngay cả khi không có người thật; sẽ lần lượt chat, hồi hộp và bùng nổ.
3. Bấm **BẬT ÂM THANH** trên overlay một lần để cho phép tiếng.
4. Nếu giao diện cũ, hard refresh `Ctrl+F5`; cache frontend đang ở `hang-rong-v2.4` trong `public/overlay.html`.

## Lưu ý cho lần phát triển tiếp theo

- Không xóa `output\qa-v2\data`: đây là dữ liệu demo local.
- Tránh khôi phục hoặc ghi đè các thay đổi nêu trên.
- Mọi hiệu ứng tự động quan trọng xuất phát từ `AmbientEngine` trong `src/ambient.js`; UI chỉ nhận WebSocket/broadcast và hiển thị.
- TikTok là nguồn sự kiện bổ sung, không được làm demo đứng im khi TikTok chưa kết nối.
