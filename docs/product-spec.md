# Đặc Tả Sản Phẩm: Đu Chart Online (Agent B - Product, UX & Content)

## 1. Tầm Nhìn & Bản Chất Sản Phẩm
- **Tên làm việc:** **Đu Chart Online** (Có thể đổi qua file cấu hình `APP_TITLE`).
- **Khẩu hiệu:** *"Cùng ngắm nến, vững tâm lý, không quạu khi thị trường vả!"*
- **Bản chất:** Nền tảng web giải trí cộng đồng dành cho các anh em trader cùng xem chart Forex/Vàng theo thời gian thực, trò chuyện xả stress, gieo quẻ bói nến, tích điểm danh hiệu vui và bấm các nút tương tác hài hước.
- **Tuyên bố pháp lý & giải trí:**
  - Điểm ảo tích lũy KHÔNG quy đổi thành tiền mặt hay bất kỳ hiện vật nào.
  - Không có tính năng nạp/rút tiền, không kết nối tài khoản sàn môi giới (broker).
  - Không đưa ra lời khuyên đầu tư tài chính hay tín hiệu Buy/Sell.

---

## 2. Bảng Ánh Xạ Tính Năng (Original -> Forex Version)

| Tính năng gốc (Đi chùa online) | Vai trò trải nghiệm | Phiên bản Forex ("Đu Chart Online") | Hành vi giữ lại | Thay đổi / Nâng cấp | Tiêu chí nghiệm thu |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Cảnh Chùa & Tượng Phật** | Không gian tập trung trung tâm | **Khu Vực Chart TradingView Tương Tác** | Vùng trọng tâm của giao diện, thu hút ánh nhìn | Thay tượng bằng nến thật (EUR/USD, GBP/USD, USD/JPY, XAU/USD) | Chart tải mượt mà, đổi được cặp tiền và khung thời gian. |
| **Dâng hương · Tam bái (3 xu)** | Lễ nghi cơ bản giải tỏa căng thẳng | **Thắp Nhang Gồng Lệnh** | Nhân vật/biểu tượng quỳ lạy, khói tỏa, tăng điểm | Khói chuyển sang màu xanh hy vọng, cộng điểm "Gồng Lỗ" | Bấm nút -> Khói xanh tỏa lên chart, âm thanh chuông êm, +10 điểm. |
| **Xin quẻ xăm (1 xu)** | Đưa ra lời khuyên chiêm nghiệm | **Bói Quẻ Nến / Xu Hướng** | Rút ngẫu nhiên trong 99 quẻ, hiện thẻ cổ thư kèm giọng đọc | Giữ nguyên 99 audio WAV giọng Mai Chi, nội dung mang triết lý an yên trước sóng gió thị trường | Thẻ quẻ hiện giữa màn hình, giọng đọc phát ra, nhạc nền tự giảm âm lượng. |
| **Đại hồng chung (100 xu)** | Âm thanh cảnh tỉnh, xua tan u mê | **Gõ Chuông Tỉnh Tâm (Cai Nghiện Đòn Bẩy)** | Tiếng chuông trầm ngân vang Web Audio | Hiệu ứng sóng âm lan tỏa trên chart nhắc nhở tuân thủ Stop-loss | Tiếng chuông ngân vang không lag, +15 điểm Kỷ Luật. |
| **Hoa đăng nguyện (10 xu)** | Gửi gắm ước nguyện | **Thả Hoa Đăng Cầu Về Bờ** | Đèn bay từ dưới lên kèm tên người ước | Tên người dùng và câu khấn "Về bờ an toàn" bay bổng | Đèn lồng bay lên góc chart, bong bóng hiển thị cho cả phòng. |
| **Phật quang phổ chiếu (500 xu)** | Hiệu ứng cực đại ăn mừng | **Cột Xanh Chọc Trời (God Candle)** | Hào quang rực rỡ, toàn bộ phòng đồng lễ | Toàn bộ phòng rung chuông, hạt nến xanh rơi ngập tràn | Toàn bộ thành viên trong phòng nhận hiệu ứng pháo hoa xanh. |
| **Chánh điện 28 chỗ ngồi** | Cảm giác mọi người đang cùng tham gia | **Đạo Tràng Trader (Room Presence)** | Hiển thị avatar & tên những người đang có mặt | Hiển thị danh sách trader online thực tế, đếm chuẩn xác | Người thứ 2 vào phòng -> Danh sách tăng lên 2, avatar xuất hiện. |
| **Bảng Mạnh Thường Quân** | Vinh danh người dẫn đầu | **Bảng Xếp Hạng "Chiến Thần Đu Đỉnh"** | Xếp hạng theo điểm tích lũy | Điểm tính theo số lần tương tác, điểm kỷ luật và thời gian hiện diện | Server xác thực điểm, không chấp nhận điểm tự khai từ client. |

---

## 3. Kiến Trúc Trải Nghiệm & Bố Cục (Desktop & Mobile)

### A. Header (Thanh Tiêu Đề)
- Logo & Tên ứng dụng: **Đu Chart Online** (có thể cấu hình).
- Phòng hiện tại: Tên phòng, mã phòng, badge `[Theo Phòng]` hoặc `[Xem Riêng]`.
- Nút Sao chép Link mời (`Copy Link`).
- Bộ đếm Online: Hiển thị số người dùng thực đang kết nối trong phòng.
- Danh tính người dùng: Avatar, Tên hiển thị (Guest hoặc Đã đặt tên), Điểm ảo & Danh hiệu hiện tại.
- Nút Bật/Tắt Âm thanh & Nhạc thiền.

### B. Khu Vực Chart (Trung Tâm)
- Nhúng **TradingView Advanced Real-time Chart Widget** chính thức.
- **Thanh Watchlist nhanh:** `EUR/USD`, `GBP/USD`, `USD/JPY`, `XAU/USD` (Vàng).
- **Bộ chọn Timeframe:** `1m`, `5m`, `15m`, `1h`, `4h`, `1D`.
- Công tắc chế độ:
  - **Theo Phòng (Host Sync):** Chart tự động chuyển theo Host của phòng.
  - **Tự Xem Riêng (Free Look):** Tự do soi cặp tiền khác mà không bị kéo theo phòng, có nút `[Quay lại theo phòng]`.
- Link chính thức mở mã trên TradingView (đáp ứng bản quyền).

### C. Khu Vực Phòng & Live Chat (Bên Phải / Tab Mobile)
- Danh sách thành viên đang có mặt trong phòng (Presence).
- **Live Chat Stream:** Tin nhắn thời gian thực giữa các thành viên, hiển thị tên, thời gian, danh hiệu.
- Chống spam: Giới hạn 1 tin mỗi 1.5 giây, lọc từ ngữ bậy bạ, escape HTML an toàn.
- Khay nút **Reaction Siêu Nhanh (1-click)**:
  - 🟢 **Gồng tiếp**
  - 🕯️ **Xin vía xanh**
  - 🧘 **Né FOMO**
  - 🚢 **Về bờ**
  - ☕ **Đứng ngoài cho lành**

### D. Khu Vực Tương Tác Hài Hước (Dưới Chart / Tab Mobile)
- 4 Nút hành động chính:
  1. 🕯️ **Thắp Nhang Gồng Lệnh** (Cooldown 5s, +10 điểm)
  2. 🥠 **Rút Quẻ Nến / Bói Xu Hướng** (Cooldown 15s, +20 điểm, hiện quẻ và đọc tiếng Việt)
  3. 🔔 **Gõ Chuông Tỉnh Tâm** (Cooldown 10s, +15 điểm, ngân vang chuông đại đồng)
  4. 🫧 **Bơm Oxy Cứu Tài Khoản** (Cooldown 3s, +5 điểm, bong bóng oxy bay)
- Bảng hiển thị thông điệp phản hồi ngẫu nhiên từ hệ thống.

### E. Bảng Xếp Hạng & Danh Hiệu
- **Bảng Xếp Hạng (Leaderboard):** TOP các "Chiến thần đu đỉnh" có điểm cao nhất phòng và toàn server.
- **Hệ thống 6 Danh Hiệu Độc Quyền:**
  1. **F0 Mới Vào Nghề** (Điểm: 0 - 50): Mới bước chân vào thị trường, mắt còn sáng ngời hy vọng.
  2. **Chiến Thần Gồng Lỗ** (Điểm: 51 - 200): Gồng lệnh xuyên đêm, tài khoản đỏ lửa nhưng tâm vững như bàn thạch.
  3. **Thánh Chốt Non** (Điểm: 201 - 500): Vừa cắt lời 2 pip thì nến dựng cột 100 pip.
  4. **Nữ Hoàng Bắt Đáy** (Điểm: 501 - 1000): Cứ tưởng đáy rồi, ai ngờ đáy hôm nay là đỉnh ngày mai.
  5. **Chiến Thần Kỷ Luật** (Điểm: 1001 - 2500): Luôn cài Stop-loss, không bao giờ nhồi lệnh khi cay cú.
  6. **Cá Voi Triệu Đô** (Điểm: 2501+): Lão làng thị trường, nhìn nến cười trừ, tâm bất biến giữa dòng đời vạn biến.

---

## 4. Kho 30+ Câu Phản Hồi Tiếng Việt Hài Hước (Forex Humor)

Khi người dùng thực hiện các thao tác, hệ thống sẽ ngẫu nhiên đưa ra các phản hồi dí dỏm:

1. *"Lệnh đã vào, SL đã đặt, việc còn lại phó mặc cho số trời!"*
2. *"Tâm bất biến giữa dòng đời nến giật!"*
3. *"Gồng lỗ thì như dũng sĩ, gồng lãi thì như thỏ đế!"*
4. *"Nến đỏ là để thử thách lòng kiên nhẫn, nến xanh là để xem ai chốt non trước."*
5. *"Một nụ cười bằng mười thang thuốc bổ, cháy một tài khoản bằng vạn lần ngộ ra."*
6. *"Bình tĩnh, thị trường vẫn mở cửa tới thứ Bảy, việc gì phải vội!"*
7. *"Hãy tham lam khi người khác sợ hãi, và hãy sợ hãi khi tài khoản sắp Margin Call."*
8. *"Vừa cắt lỗ xong nến lập tức quay đầu dựng ngược, chuyện bình thường ở huyện!"*
9. *"Cháy tài khoản không phải là thất bại, đó là học phí trả cho ngài Thị Trường."*
10. *"Đã gõ chuông cảnh tỉnh! Hít thở sâu 3 giây, bỏ tay ra khỏi nút Buy/Sell."*
11. *"Oxy đã được bơm đầy bình! Xin quý khách yên tâm tiếp tục gồng lệnh."*
12. *"Bói được quẻ: Hôm nay nên tắt máy đi ngủ, nhìn chart nhiều chỉ tốn thuốc trợ tim."*
13. *"Xu hướng thị trường rõ như ban ngày, chỉ có túi tiền của ta là mù mịt."*
14. *"Kỷ luật là sức mạnh! Không nhồi lệnh, không DCA vô tội vạ."*
15. *"Một tiếng chuông buông xả muộn phiền, cắt lỗ trong danh dự!"*
16. *"Thà nuốt nước mắt chốt non còn hơn lau nước mắt vì gồng lỗ."*
17. *"Người ta làm giàu từ từ, còn ta quyết định chia đôi tài khoản cấp tốc."*
18. *"Đã dâng mâm hoa quả tạ ơn ngài Market vì đã không quét sạch ví hôm nay."*
19. *"Thấy nến giật tưởng đâu cá mập làm giá, ai dè ngài Powell vừa hắt hơi."*
20. *"Đường về bờ còn xa lắm, nhưng ít nhất chúng ta đang đu cùng nhau!"*
21. *"Hôm nay thị trường chạy ngang, tim trader cũng đập ngang."*
22. *"Cây nến rút râu dài ngoằng như thanh kiếm chém tan hy vọng của phe Buy."*
23. *"Đừng chống lại xu hướng, trừ khi bạn có nhiều tiền hơn Cục Dự trữ Liên bang."*
24. *"Nhìn nến chạy mà ngỡ nhịp tim người yêu cũ, thoắt ẩn thoắt hiện."*
25. *"Bình tâm lại, tắt đòn bẩy 1:1000 đi rồi nói chuyện tiếp."*
26. *"Đã nhận được 1 nén nhang thành tâm! Chúc lệnh của bạn xanh mướt như đồi chè."*
27. *"Khóc làm chi em ơi, nến xanh rồi cũng sẽ đỏ, nến đỏ rồi cũng về cát bụi."*
28. *"Không có chuyện làm giàu sau một đêm, chỉ có nghèo đi sau một cây nến quét thanh khoản."*
29. *"Cầu cho cá voi đẩy sóng, đưa toàn thể anh em trong phòng cập bến an toàn!"*
30. *"Đứng ngoài thị trường cũng là một vị thế, và là vị thế ít đau tim nhất."*
31. *"Bảo toàn vốn là mẹ của thành công, còn say máu là cha của cháy tài khoản."*
32. *"Chart chạy mượt như lụa, chỉ có lòng người là chao đảo theo từng pip."*
