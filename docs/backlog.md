# Backlog Dự Án "Đu Chart Online" (Lead Engineer)

| Task ID | Mục Tiêu & Mô Tả | Vai Trò (Agent) | File / Module Sở Hữu | Phụ Thuộc | Tiêu Chí Nghiệm Thu | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A-1** | Audit hiện trạng mã nguồn & dependencies | Agent A (Audit) | `docs/audit.md` | Không | Nêu đủ stack, lỗi có sẵn, phần tái sử dụng | **DONE** |
| **B-1** | Đặc tả sản phẩm & ánh xạ trải nghiệm Forex | Agent B (Product) | `docs/product-spec.md` | A-1 | 30+ câu đùa, 6 danh hiệu, 5 reaction, UX map | **DONE** |
| **B-2** | Thiết kế tích hợp Chart TradingView chính thức | Agent C (Frontend) | `docs/chart-integration.md` | B-1 | 4 symbol, timeframe, fallback, ranh giới API | **DONE** |
| **B-3** | Thiết kế kiến trúc Backend & WebSocket protocol | Agent A (Architecture) | `docs/architecture.md` | B-1 | Contract sự kiện, presence, chống gian lận điểm | **DONE** |
| **D-1** | Triển khai Room Manager, Presence & Chat Engine | Agent D (Backend) | `src/rooms.js`, `server.js` | B-3 | Đa phòng, chat sanitize, presence chính xác | **IN PROGRESS** |
| **D-2** | Triển khai Virtual Score Ledger, Cooldown & Quẻ | Agent D (Backend) | `src/score.js`, `src/fortunes.js` | D-1 | Điểm tính tại server, chống spam, 99 quẻ nến | **PENDING** |
| **C-1** | Triển khai Giao diện Web Responsive Đu Chart | Agent C (Frontend) | `public/index.html`, `public/app.js` | B-2, D-1 | Chart TradingView, watchlist, mobile tabs | **PENDING** |
| **C-2** | Tích hợp Web Audio, Quẻ Xăm & Hiệu ứng tương tác | Agent C (Frontend) | `public/app.js`, `public/js/` | C-1, D-2 | Chuông tỉnh tâm, giọng đọc Mai Chi, ducking | **PENDING** |
| **E-1** | Viết kịch bản kiểm thử tự động nhiều client | Agent E (QA) | `test/forex-multi-client.test.js` | D-1, D-2 | 2 client cùng phòng, sync chart, chat, anti-cheat | **PENDING** |
| **F-1** | Viết Runbook vận hành, sao lưu và xử lý sự cố | Agent F (Release) | `docs/runbook.md`, `.env.example` | E-1 | Hướng dẫn chạy, port, biến môi trường, bảo trì | **PENDING** |
| **F-2** | Bàn giao tổng thể và biên bản nghiệm thu | Lead Engineer | `docs/handoff.md` | Tất cả | 10 tiêu chí Section 02 đều đạt có bằng chứng | **PENDING** |
