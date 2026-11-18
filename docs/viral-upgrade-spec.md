# Đặc Tả Nâng Cấp Nền Tảng Viral & Trải Nghiệm Tương Tác: "Đu Chart Online"
> **Tài liệu đặc tả kiến trúc tương tác, UX/UI phong cách Chùa Gỗ Cổ Điển, Data Contract & Kế hoạch QA**  
> **Phiên bản:** 2.0-VIRAL-UPGRADE · **Tác giả:** Viral Architect & UX Director  
> **Đối tượng sử dụng:** Lead Engineer, Agent Backend, Agent Frontend, Agent QA  
> **Môi trường mục tiêu:** Màn hình Livestream OBS / TikTok Live Studio (Dọc 1080 × 1920) & Nền tảng Web tương tác thời gian thực (Desktop & Mobile)

---

## MỤC LỤC
1. [Tầm Nhìn & Triết Lý Thiết Kế (Design Philosophy & Vision)](#1-tầm-nhìn--triết-lý-thiết-kế)
2. [Hệ Thống Thiết Kế Trực Quan: Chùa Gỗ Tâm Linh & Sàn Cổ Điển (Design System)](#2-hệ-thống-thiết-kế-trực-quan)
3. [Đặc Tả 4 Cơ Chế Tương Tác Viral Nòng Cốt (Core Viral Mechanics)](#3-đặc-tả-4-cơ-chế-tương-tác-viral-nòng-cốt)
   - [3.1. Bull vs Bear Kéo Co (Thánh Bò Xanh vs Cụ Gấu Đỏ Đại Chiến)](#31-bull-vs-bear-kéo-co-thánh-bò-xanh-vs-cụ-gấu-đỏ-đại-chiến)
   - [3.2. Vòng Xoay Định Mệnh Gồng Lỗ (Wheel of Financial Karma)](#32-vòng-xoay-định-mệnh-gồng-lỗ-wheel-of-financial-karma)
   - [3.3. Còi Báo Động Quét Thanh Khoản (Liquidity Hunt Siren)](#33-còi-báo-động-quét-thanh-khoản-liquidity-hunt-siren)
   - [3.4. Bản Tin Nóng Phố Wall Đu Đỉnh (Wall Street Breaking News Memes)](#34-bản-tin-nóng-phố-wall-đu-đỉnh-wall-street-breaking-news-memes)
4. [Bố Cục Giao Diện Màn Hình Dọc 1080 × 1920 & Web App (Layout Specifications)](#4-bố-cục-giao-diện)
5. [Hệ Thống Âm Thanh Đa Tầng & Cơ Chế Audio Ducking (Audio Architecture)](#5-hệ-thống-âm-thanh-đa-tầng)
6. [Hợp Đồng Dữ Liệu Kỹ Thuật (Data Contracts: WebSocket & REST API)](#6-hợp-đồng-dữ-liệu-kỹ-thuật)
   - [6.1. Giao thức WebSocket (`/ws`)](#61-giao-thức-websocket)
   - [6.2. REST API Endpoints](#62-rest-api-endpoints)
7. [Tiêu Chí Nghiệm Thu (Acceptance Criteria - Given/When/Then)](#7-tiêu-chí-nghiệm-thu)
8. [Kế Hoạch & Bộ Kịch Bản Kiểm Thử Dành Cho Agent QA (QA Verification Suite)](#8-kế-hoạch--bộ-kịch-bản-kiểm-thử-qa)

---

## 1. Tầm Nhìn & Triết Lý Thiết Kế

### 1.1. Bối cảnh & Vấn đề
Các livestream phân tích biểu đồ Forex, Crypto hay Chứng khoán hiện nay trên TikTok Live, Facebook Live hay YouTube thường khô khan, nặng tính học thuật hoặc chỉ xoay quanh việc streamer nói một chiều. Trong khi đó, các buổi livestream tương tác đình đám trên Douyin (TikTok Trung Quốc) thu hút hàng triệu mắt xem nhờ cơ chế **PK đối kháng trực tiếp**, **hiệu ứng quà tặng gây choáng ngợp**, và **tạo cảm xúc gắn kết cộng đồng mãnh liệt**.

### 1.2. Giải pháp đột phá: "Đu Chart Online" V2
"Đu Chart Online" giải quyết bài toán giữ chân người xem (Retention) và kích thích tương tác liên tục (Virality) bằng cách lai tạo hai thế giới tưởng chừng tương khắc:
- **Tâm linh Chùa Gỗ Việt Cổ:** Thanh tịnh, an yên, chuông đại hồng chung ngân vang, khói trầm lan tỏa, gieo quẻ giải tỏa âu lo.
- **Sàn Giao Dịch Tài Chính Khốc Liệt:** Nến giật từng pip, cuộc chiến sống còn giữa Bò (Long) và Gấu (Short), nỗi ám ảnh quét Stop-loss và những câu đùa WallStreetBets bất hủ.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      "ĐU CHART ONLINE" VIRAL ENGINE                    │
├──────────────────────────────────┬─────────────────────────────────────┤
│      LỚP TÂM LINH AN LẠC         │       LỚP CHIẾN TRƯỜNG FOREX        │
│  - Chánh điện gỗ gụ chạm trổ    │  - Bảng nến TradingView thời gian thực│
│  - Tiếng chuông rền buông bỏ     │  - Còi hú báo động bão giá cấp 12   │
│  - Quẻ xăm nến chiêm nghiệm 99   │  - Vòng xoay luân hồi gồng lỗ        │
│  - Nhang trầm cầu nến xanh       │  - Đại chiến Bò Xanh kéo co Gấu Đỏ  │
└──────────────────────────────────┴─────────────────────────────────────┘
```

---

## 2. Hệ Thống Thiết Kế Trực Quan (Design System)

Nhằm đảm bảo 100% tính nguyên bản và thẩm mỹ cổ kính, toàn bộ đồ họa, viền bo, icon và bảng màu phải tuân thủ nghiêm ngặt bảng mã màu và hoa văn đã quy định:

### 2.1. Bảng màu quy chuẩn (Official Color Palette)

| Vai trò | Tên màu | Mã HEX | Giá trị RGB / HSL | Ứng dụng cụ thể |
| :--- | :--- | :--- | :--- | :--- |
| **Nền tảng (Dominant)** | Gỗ gụ trầm hương | `#24140d` | `rgb(36, 20, 13)` | Nền chánh điện, bảng tương tác, thanh điều hướng chính, bóng đổ viền |
| **Kim loại cổ (Secondary)**| Đồng cổ phong thủy | `#ae854d` | `rgb(174, 133, 77)` | Khung viền bảng nến, chốt chặn bánh xe, sợi xích kéo co, viền thẻ bài |
| **Hào quang (Accent Gold)**| Vàng hoàng kim | `#f3d28a` | `rgb(243, 210, 138)`| Tiêu đề chính, tia hào quang, kim chỉ bánh xe, điểm thưởng, text vinh danh |
| **Phe Mua (Bull Green)**   | Xanh ngọc phỉ thúy | `#10b981` | `rgb(16, 185, 129)` | Biểu tượng Bò, phe Long/Buy, nến xanh tăng giá, hiệu ứng thắng trận phe Bò |
| **Phe Bán (Bear Red)**     | Đỏ ruby huyết ngọc | `#ef4444` | `rgb(239, 68, 68)`  | Biểu tượng Gấu, phe Short/Sell, nến đỏ giảm giá, còi báo động quét thanh khoản |
| **Hài hòa (Quiet Sand)**   | Vàng cát thanh tịnh| `#d6bd91` | `rgb(214, 189, 145)`| Phụ đề, chữ mô tả nhỏ, đường nét kẻ mờ, thời gian timestamp |
| **Tâm nến (Candle Cream)** | Trắng kem ánh nến | `#fff0cb` | `rgb(255, 240, 203)`| Thân nến, chữ trong thẻ quẻ, lời bình luận của khán giả |

### 2.2. Quy tắc chất liệu & Đồ họa (Textures & Borders)
- **Khung viền (Borders):** Viền đồng 2 lớp `border: 2px solid #ae854d; outline: 1px solid #f3d28a55;` với hoa văn góc bo kiểu triện đồng truyền thống (`border-radius: 12px` đến `16px`).
- **Hiệu ứng ánh kim (Glow & Shadow):**
  - Ánh vàng chánh điện: `box-shadow: 0 8px 32px #090402cc, 0 0 20px #f3d28a33;`
  - Hào quang Bò Xanh: `box-shadow: 0 0 25px rgba(16, 185, 129, 0.45);`
  - Ánh lửa Gấu Đỏ: `box-shadow: 0 0 25px rgba(239, 68, 68, 0.45);`
- **Typography:**
  - Tiêu đề & Hoành phi: `font-family: Georgia, 'Times New Roman', serif; font-weight: 700;`
  - Số liệu pip, giá & ticker: `font-family: 'JetBrains Mono', 'Courier New', monospace; font-variant-numeric: tabular-nums;`
  - Nội dung mô tả & chat: `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`

---

## 3. Đặc Tả 4 Cơ Chế Tương Tác Viral Nòng Cốt

### 3.1. Bull vs Bear Kéo Co (Thánh Bò Xanh vs Cụ Gấu Đỏ Đại Chiến)

```
                 SỢI XÍCH ĐỒNG KÉO CO BÁT QUÁI
               ◄── GẤU ĐỎ        BÒ XANH ──►
   [ CỤ GẤU ĐỎ ]═══════════╤═══════════[ THÁNH BÒ XANH ]
   (Short / Sell)          ▼ MỐC 0             (Long / Buy)
   Lực: 1,420 kg          [-10px]              Lực: 1,890 kg
```

#### A. Khái niệm & Trải nghiệm cảm xúc
Mô phỏng cuộc chiến sinh tử giữa phe Long và phe Short theo định dạng mini-game đối kháng (Tug of War) lấy cảm hứng từ các màn PK top trending Douyin:
- **Phe Bò Xanh (`#10b981`):** Khán giả đặt cược niềm tin vào xu hướng tăng, hô hào mua vào, thắp nhang cầu nến dựng cột.
- **Phe Gấu Đỏ (`#ef4444`):** Khán giả đặt cược vào xu hướng sập gãy, đè nến, cắt lỗ tập thể.
- **Sợi dây thừng kéo co:** Thể hiện bằng một sợi xích đồng phong thủy viền khắc cổ tự, ở giữa có một lá bùa bát quái vàng `#f3d28a`.

#### B. Cơ chế vận hành (Game Loop & Rules)
1. **Chu kỳ trận đấu (Match Round):**
   - Mỗi trận kéo dài **90 giây** (hoặc do Host tùy biến 60s - 180s).
   - Khi chưa bắt đầu: Trạng thái `idle` (Chờ ghép trận / countdown).
   - Khi bắt đầu: Trạng thái `active`.
2. **Cách thức đóng góp lực kéo (Pull Power Calculation):**
   - **Tương tác miễn phí (Web Reaction / Chat):**
     - Comment chứa từ khóa `buy`, `long`, `bò`, `xanh`, `lên`, `1` -> +1 điểm lực cho Bò.
     - Comment chứa từ khóa `sell`, `short`, `gấu`, `đỏ`, `xuống`, `2` -> +1 điểm lực cho Gấu.
     - Nhấp nút Reaction nhanh "🟢 Gồng tiếp" / "🕯️ Xin vía xanh" -> +2 lực Bò.
     - Nhấp nút Reaction nhanh "☕ Đứng ngoài" / "🚢 Về bờ" -> +2 lực Gấu.
   - **Nghi thức Forex (Action Buttons):**
     - Thắp nhang gồng Buy (`bull_pull`) -> +15 lực kéo Bò (Cooldown 3s).
     - Gõ mõ đè Sell (`bear_pull`) -> +15 lực kéo Gấu (Cooldown 3s).
   - **TikTok Live Gifts (nếu kết nối Stream):**
     - 1 xu = +5 điểm lực kéo.
     - Quà Đại Lễ (500 xu) = +3,000 điểm lực kéo -> Kích hoạt hiệu ứng "Bò Húc Khổng Lồ" hoặc "Gấu Tát Lốc Xoáy".
3. **Cơ chế giằng co (Physics & Tug Indicator):**
   - Vị trí bùa trung tâm $P$ chạy trên trục từ `-100%` (Gấu thắng) đến `+100%` (Bò thắng), ban đầu $P_0 = 0$.
   - Công thức cập nhật vị trí mỗi tick (500ms):
     $$\Delta Lực = Lực_{Bò} - Lực_{Gấu}$$
     $$P_{mới} = \text{clamp}\left(P_{cũ} + \Delta Lực \times \alpha - P_{cũ} \times \beta,\; -100,\; 100\right)$$
     *(Trong đó $\alpha = 0.05$ là hệ số lực đẩy, $\beta = 0.02$ là lực cản ma sát tự nhiên về tâm).*
4. **Kết quả trận đấu & Kịch bản ăn mừng (Victory Sequence):**
   - **Bò Thắng ($P \ge +80\%$ khi hết giờ, hoặc chạm mốc $+100\%$ Knockout):**
     - Tượng Thần Bò Xanh Ngọc bừng sáng hào quang, húc bay Gấu Đỏ lộn nhào 3 vòng lên trời.
     - Mưa tiền vàng hoàng kim `#f3d28a` rơi lấp lánh toàn màn hình.
     - Âm thanh chuông khánh reo vang tưng bừng (`tone('bull-win')`), toàn bộ phe Bò nhận danh hiệu tạm thời *"Dũng Sĩ Húc Bay Cản"*.
   - **Gấu Thắng ($P \le -80\%$ khi hết giờ, hoặc chạm mốc $-100\%$ Knockout):**
     - Cụ Gấu Đỏ Ruby giơ bàn tay gấu tát sập bàn cờ, nến đỏ máu cắm thẳng xuống sàn.
     - Hiệu ứng khói đỏ cuộn trào, avatar bay dép, tiếng còi tàu chìm u sầu.
     - Toàn bộ phe Gấu nhận danh hiệu *"Chiến Thần Đạp Đáy"*.
   - **Hòa trận ($-15\% \le P \le +15\%$):**
     - Hiện bảng nến Doji Lưỡng Lự: *"Hai phe mệt nhoài, rủ nhau ra đê ngồi hóng mát!"*.

---

### 3.2. Vòng Xoay Định Mệnh Gồng Lỗ (Wheel of Financial Karma)

```
                     ┌──────────────────┐
                     │   ▼ KIM ĐỒNG ▼   │
               ┌─────┴──────────────────┴─────┐
            ╱  [ Ô 1: Margin Call X100 ]       ╲
          ╱    [ Ô 2: Gồng Lỗ Bất Tử ]           ╲
         │     [ Ô 3: Cắt Ngay Đáy ]             │
         │     [ Ô 4: Chốt Non 1 Pip ]           │
         │     [ Ô 5: Bơm Oxy Thần Tốc ]         │
         │     [ Ô 6: Về Bờ Trong Mơ ]           │
         │     [ Ô 7: Tâm Bất Biến ]             │
          ╲    [ Ô 8: Phật Quang Nến Xanh ]      ╱
            ╲                                  ╱
               └──────────────────────────────┘
```

#### A. Khái niệm & Trải nghiệm cảm xúc
Lấy cảm hứng từ vòng quay may mắn (Lucky Wheel / Roulette) trên Douyin nhưng lồng ghép trọn vẹn văn hóa meme tài chính và triết lý nhân quả luân hồi. Bánh xe bằng gỗ mun khắc chỉ đồng cổ `#ae854d`, kim chỉ làm bằng đồng thau hình ngọn nến phát sáng.

#### B. Bảng 8 Ô Luân Hồi Định Mệnh

| Vị trí | Tên ô định mệnh | Tỷ lệ trúng | Điểm tích lũy | Hiệu ứng trực quan & Âm thanh | Câu sấm truyền / Lời bình |
| :---: | :--- | :---: | :---: | :--- | :--- |
| **Ô 1** | **X100 Đòn Bẩy (Margin Call)** | 10% | `-50 pts` | Màn hình nháy đỏ, tiếng kính vỡ vụn xót xa | *"Tham thì thâm, đòn bẩy một ngàn tiễn nàng ra đê!"* |
| **Ô 2** | **Gồng Lỗ Bất Tử** | 20% | `+20 pts` | Nhân vật ngồi thiền hóa đá rêu phong mọc | *"Gồng lỗ là bản năng, gồng lãi là bản lĩnh chưa luyện thành."* |
| **Ô 3** | **Cắt Ngay Đáy** | 15% | `+10 pts` | Nến dựng đứng tên lửa ngay khi vừa bán | *"Vừa buông tay cắt lỗ thì nến vọt 100 pip, cay đắng ngậm ngùi!"* |
| **Ô 4** | **Chốt Non 1 Pip** | 18% | `+15 pts` | Bát mì tôm bốc khói mờ ảo | *"Ăn non cho lành, một tô mì tôm ấm lòng giữa mùa bão giá."* |
| **Ô 5** | **Bơm Oxy Thần Tốc** | 14% | `+25 pts` | Bọt khí xanh ngọc bay ngập tràn chart | *"Bình oxy đã mở van! Tạm thời thoát khỏi cơn ngạt thở."* |
| **Ô 6** | **Về Bờ Trong Mơ** | 10% | `+30 pts` | Con thuyền nan trôi bồng bềnh giữa mây | *"Thấy bờ đâu đây... ai dè chỉ là ảo ảnh thị trường!"* |
| **Ô 7** | **Tâm Bất Biến** | 8% | `+40 pts` | Chuông vàng ngân vang, hào quang kim cương | *"Thị trường giật 500 pip, ta ung dung nâng chén trà sen."* |
| **Ô 8** | **Cột Xanh Chọc Nóc** | 5% | `+100 pts`| Pháo hoa rực rỡ toàn phòng, rung chuyển OBS | *"Phật quang phổ chiếu! Nến xanh chọc thủng mọi kháng cự!"* |

#### C. Quy tắc quay & Động lực học (Wheel Physics)
- **Cơ chế kích hoạt:** Khán giả nhấp nút "Quay Định Mệnh" (tiêu tốn 20 điểm ảo hoặc cooldown 30 giây/lượt).
- **Vật lý quay:**
  - Thời gian quay: $4.5$ giây.
  - Công thức Easing: `cubic-bezier(0.15, 0.9, 0.25, 1.0)` (bắt đầu tăng tốc cực nhanh, sau đó lướt chậm dần và dừng khấc nảy nhẹ).
  - Góc quay mục tiêu: $\theta_{target} = 360^\circ \times N_{vòng} + \theta_{slot} + \text{randomOffset}(-15^\circ, +15^\circ)$ ($N_{vòng} = 5 \div 8$).
  - Âm thanh lách cách gỗ: Mỗi khi kim lướt qua một nan gờ gỗ, phát tiếng khấc gỗ Web Audio (`wood-click`), tần số giảm dần theo tốc độ quay.

---

### 3.3. Còi Báo Động Quét Thanh Khoản (Liquidity Hunt Siren)

```
🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨
  [BÁO ĐỘNG ĐỎ CẤP 12] CÁ MẬP QUÉT THANH KHOẢN HAI ĐẦU!
  RÚT DÂY MẠNG GẤP · KHÔNG BẮT ĐÁY · TỌA THIỀN GIỮ TÂM!
🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨
```

#### A. Khái niệm & Trải nghiệm cảm xúc
Tái hiện hiện tượng "quét thanh khoản" (Liquidity Wick Sweep / Fakeout) khét tiếng trong Forex: Khi cá mập bất ngờ tung lệnh giật nến thọc sâu 2 đầu quét sạch Stop-loss của cả phe Mua lẫn phe Bán trước giờ tin tức Non-Farm (NFP) hay Fed công bố lãi suất. Đây là khoảnh khắc hồi hộp tột độ, kích hoạt phản xạ phòng thủ hài hước của các trader.

#### B. Cơ chế kích hoạt (Triggers)
1. **Kích hoạt tự động (Auto Market Volatility Detector):**
   - Giả lập hoặc đồng bộ khi biên độ nến vượt ngưỡng $3\times$ ATR (Average True Range).
2. **Kích hoạt từ Host / Admin:**
   - Streamer bấm nút khẩn cấp trên trang Admin: `[BÁO ĐỘNG QUÉT THANH KHOẢN]`.
3. **Kích hoạt bằng Tương tác Khán giả:**
   - Khán giả đồng lòng kích hoạt 50 reaction "🧘 Né FOMO" trong vòng 10 giây hoặc donate quà "Mâm lễ xả xui".

#### C. Trình tự hiệu ứng nghe nhìn (15 Giây Bão Táp)
- **Giây 0 - 2 (Báo động nổ ra):**
  - Đèn chánh điện chuyển sang chế độ chớp nháy đỏ ruby `#ef4444` và vàng hổ phách cảnh báo (`animation: sirenFlash 0.6s infinite`).
  - Tiếng còi báo động khẩn cấp ngân vang kết hợp tiếng chuông báo động dồn dập (`tone('siren')`).
  - Toàn bộ nhạc nền tự động giảm âm lượng xuống 20% (Audio Ducking).
- **Giây 2 - 10 (Cá mập đi săn & Rút râu nến):**
  - Trên Bảng Nến Trung Tâm xuất hiện hình bóng bóng ma "Cá Mập Cổ Điển" bơi lượn qua chart.
  - Cột nến giả lập một cây kim thọc rút râu 2 đầu dài ngoằng.
  - Đạo tràng các đệ tử ngồi thiền bị gió lốc thổi bay vạt áo, dép tổ ong và nón lá văng tung tóe trên màn hình 1080x1920.
- **Giây 10 - 15 (Minigame 5 Giây "Bấm Nhanh Giữ Lệnh"):**
  - Xuất hiện nút khẩn cấp giữa màn hình: `[GIỮ CHẶT STOP-LOSS]`.
  - Khán giả spam click. Ai click $\ge 15$ lần trong 5s sẽ nhận được huân chương *"Bàn Tay Kim Cương"* và cộng +50 điểm kỷ luật.
- **Giây 15 (Bình yên trở lại):**
  - Tiếng đại hồng chung ngân một hồi dài trầm ấm, màn hình dịu lại với ánh sáng vàng ấm áp `#f3d28a`.
  - Banner hiển thị: *"Bão đã tan! Chúc mừng các đạo hữu kiên cường còn sống sót trên bờ!"*.

---

### 3.4. Bản Tin Nóng Phố Wall Đu Đỉnh (Wall Street Breaking News Memes)

```
╔══════════════════════════════════════════════════════════════════════════╗
║ 🔴 TIN NÓNG PHỐ WALL (BREAKING NEWS)                        10:24:30 PM  ║
╠══════════════════════════════════════════════════════════════════════════╣
║ CHỦ TỊCH FED POWELL TUYÊN BỐ: "CHÚNG TÔI THẤY TRADER HOÀNG NAM VỪA SHORT ║
║ VÀNG, TOÀN BỘ HỆ THỐNG ĐÃ KÍCH HOẠT LỆNH KÉO NẾN XANH CỨU TÀI KHOẢN!"    ║
╚══════════════════════════════════════════════════════════════════════════╝
```

#### A. Khái niệm & Cơ chế lan truyền (Viral Loop)
Bản tin trực tiếp mô phỏng giao diện Breaking News của các hãng tin tài chính hàng đầu (Bloomberg, CNBC, Reuters) nhưng mang phong cách hoành phi cáo thị cổ truyền. Điểm nhấn viral nằm ở việc **tự động chèn tên và hành động của chính khán giả đang có mặt trong phòng** vào dòng tít chấn động, kích thích khán giả chụp màn hình (screenshot) đăng lên Story TikTok, Facebook, Discord để khoe chiến tích.

#### B. Hai hình thức hiển thị
1. **Dải chữ chạy liên tục (Breaking News Ticker Bar):**
   - Vị trí: Chân bảng nến TradingView (hoặc mép dưới màn hình).
   - Thiết kế: Dải lụa nâu gụ `#24140d` dát viền đồng `#ae854d`, chữ chạy mượt mà từ phải sang trái bằng font monospace màu vàng kem `#fff0cb`.
   - Nội dung: Tỷ giá thời gian thực xen kẽ các tin vắn hài hước.
2. **Khung tin nóng đột xuất (Flash News Modal / Popup):**
   - Kích hoạt khi: Có sự kiện lớn (Viewer trúng ô X100 Đòn Bẩy, viewer donate quà lớn, một phe lật kèo kéo co, hoặc Admin phát tin).
   - Thời gian tồn tại: 6 giây.
   - Âm thanh: Nhạc hiệu đài truyền hình phối với tiếng khánh đồng rộn rã (`tone('breaking-news')`).

#### C. Kho 30+ Câu Tin Nóng Phố Wall Cá Nhân Hóa (Dynamic Headline Templates)
*(Hệ thống tự động thay thế `{trader}` bằng nickname thực tế của viewer)*

1. *"CHẤN ĐỘNG: Hiệp sĩ `{trader}` vừa nạp thêm nén nhang thứ 99, EUR/USD lập tức dựng cột 40 pip giải cứu hàng ngàn anh em!"*
2. *"REUTERS ĐƯA TIN: Chủ tịch Fed phát biểu: 'Thấy `{trader}` vừa vào lệnh Short, chúng tôi quyết định hoãn giảm lãi suất!'"*
3. *"CẢNH BÁO TỪ WALL STREET: `{trader}` vừa bấm nút Buy Vàng, cá mập toàn cầu đồng loạt ôm tiền bỏ chạy!"*
4. *"BẢN TIN KHẨN: Một lệnh gồng lỗ xuyên màn đêm của `{trader}` vừa được ghi danh vào kỷ lục Guinness!"*
5. *"NÓNG: Ngân hàng Trung ương châu Âu (ECB) tuyên bố: 'Thị trường không thể sập chừng nào `{trader}` chưa chịu cắt lỗ!'*
6. *"KỲ DIỆU: `{trader}` vừa gõ một tiếng chuông tỉnh tâm, chỉ số DXY lập tức quay đầu giảm nhiệt!"*
7. *"WALLSTREETBETS VINH DANH: Chiến thần `{trader}` chốt non 1.5 pip thành công, bảo toàn vốn ăn phở trọn vẹn cả tuần!"*
8. *"TIN GIỜ CHÓT: Phát hiện `{trader}` nhồi 10 lệnh không Stop-loss, cả phòng đồng thanh đọc kinh cầu an!"*
9. *"TIN BUỒN: `{trader}` vừa bán ngay đáy XAU/USD tại 2650, 3 giây sau giá vọt lên 2700 trong sự ngỡ ngàng của cả dòng họ!"*
10. *"TỔNG THỐNG PHÁT BIỂU: Xin toàn dân noi gương tinh thần 'Tâm bất biến giữa dòng đời nến giật' của `{trader}`!"*
11. *"THỐNG KÊ MỚI: 99% trader trong phòng thở phào nhẹ nhõm sau khi thấy `{trader}` kích hoạt bình bơm oxy!"*
12. *"GIẢI THƯỞNG NOBEL KINH TẾ: Đề cử `{trader}` nhờ công trình chứng minh: 'Cắt lỗ xong nến luôn luôn bay ngược lại'."*
13. *"CÁ MẬP PHỐ WALL KHÓC RÒNG: Bẫy giá chuẩn bị sẵn 3 ngày liền nhưng `{trader}` quyết định... đi ngủ sớm!"*
14. *"BẢN TIN ĐÊM MUỘN: `{trader}` đã hạ quyết tâm cai đòn bẩy 1:1000, chuyển sang ngồi thiền đếm nến 1H."*
15. *"TIN NỘI BỘ: Đội lái vừa họp khẩn vì `{trader}` kiên quyết không chịu nhả lệnh gồng lỗ 300 pip!"*
16. *"SỰ THẬT KINH HOÀNG: `{trader}` soi chart trên điện thoại suốt 8 tiếng, mắt sáng hơn cả đèn pha ô tô!"*
17. *"GÓC KỶ LUẬT: `{trader}` đã đặt Stop-loss cách entry đúng 15 pip, xứng đáng được phong tặng danh hiệu Chiến Thần Sắt Đá!"*
18. *"CHUYỆN LẠ CÓ THẬT: Nến rút chân dài ngoằng vừa cứu `{trader}` thoát Margin Call trong đúng 0.5 pip cuối cùng!"*
19. *"BẢN TIN PHÒNG CHÁY: Toàn bộ thành viên phòng `{roomId}` vừa đồng loạt thắp nhang tiếp lửa cho `{trader}`!"*
20. *"THỊ TRƯỜNG CHỨNG KHOÁN ĐỎ LỬA: Riêng tài khoản của `{trader}` vẫn xanh mướt... vì chưa kịp vào lệnh!"*
21. *"HỘI ĐỒNG THẨM ĐỊNH: Bát mì tôm đêm nay của `{trader}` đậm đà hơn thường lệ nhờ 20 pip lợi nhuận chốt non!"*
22. *"CÔNG AN KINH TẾ KHUYẾN CÁO: Đừng bao giờ tranh cãi xu hướng với một người vừa quay trúng ô 'Gồng Lỗ Bất Tử' như `{trader}`!"*
23. *"ĐẠI HỘI TRADER TOÀN CẦU: Nhất trí dựng tượng đồng tri ân `{trader}` vì đã gánh team đu đỉnh suốt 3 tháng qua!"*
24. *"NÓNG BỎNG TAY: `{trader}` vừa quay trúng ô Phật Quang Phổ Chiếu, nến xanh đang rượt đuổi nến đỏ chạy có cờ!"*
25. *"LỜI SẤM TRUYỀN: Nến đỏ là thử thách, nến xanh là quà tặng, và `{trader}` là người kiên định nhất đạo tràng!"*

---

## 4. Bố Cục Giao Diện Màn Hình Dọc 1080 × 1920 & Web App

### 4.1. Kiến trúc bố cục OBS / TikTok Live (1080 × 1920)

```
        Y=0px  ┌────────────────────────────────────────────────────────┐
               │ [STAGE HEADER] Tiêu Đề Phòng · Trạng Thái Live (60px)   │
      Y=100px  ├────────────────────────────────────────────────────────┤
               │ [BREAKING NEWS POPUP & TICKER BAR] (Height: 80px)      │
      Y=200px  ├────────────────────────────┬───────────────────────────┤
               │ [BẢNG NẾN TÂM LINH]        │ [BẢNG XẾP HẠNG TRADER]    │
               │ TradingView Real-time      │ TOP Chiến Thần Gồng Lỗ    │
               │ W: 680px | H: 640px        │ W: 320px | H: 640px       │
      Y=860px  ├────────────────────────────┴───────────────────────────┤
               │ [BULL VS BEAR KÉO CO / TUG OF WAR ARENA]               │
               │ Bò Xanh vs Gấu Đỏ · Sợi xích đồng giằng co (H: 220px)   │
     Y=1100px  ├────────────────────────────────────────────────────────┤
               │ [KHÔNG GIAN LUÂN HỒI / VÒNG XOAY ĐỊNH MỆNH HOẶC QUẺ XĂM]│
               │ Vòng Xoay Bát Quái / Thẻ Quẻ Chiêm Nghiệm (H: 380px)   │
     Y=1500px  ├────────────────────────────────────────────────────────┤
               │ [ĐẠO TRÀNG 28 CHỖ NGỒI TÂM LINH & DIỄN VIÊN NHỎ]       │
               │ Tương tác lạy vái, bong bóng ước nguyện, khói hương     │
     Y=1820px  ├────────────────────────────────────────────────────────┤
               │ [STAGE FOOTER] Bản Tin Chạy Chữ Cổ Điển Ticker (80px)  │
     Y=1920px  └────────────────────────────────────────────────────────┘
```

### 4.2. Tọa độ chính xác các phần tử trên Canvas (Source Coordinates)

| Phần tử giao diện | Vị trí $(X, Y)$ | Kích thước $(W \times H)$ | $Z$-Index | Quy cách thẩm mỹ |
| :--- | :--- | :--- | :--- | :--- |
| **Stage Background** | `0, 0` | `1080 × 1920` | `1` | Ảnh chánh điện chùa gỗ `background.png` + Vignette tối `#0e0604` |
| **Canvas Hạt (Particles)**| `0, 0` | `1080 × 1920` | `18` | Khói nhang xanh ngọc, chuông lan tỏa, mưa vàng kim, lửa đỏ |
| **Bảng Nến TradingView** | `40, 200` | `680 × 640` | `22` | Viền đồng `#ae854d`, bo góc 16px, bóng đổ vàng kim `#f3d28a33` |
| **Bảng Xếp Hạng Top** | `740, 200` | `300 × 640` | `22` | Nền gỗ sẫm `#24140df2`, danh hiệu màu vàng `#f3d28a` |
| **Sàn Kéo Co Bull vs Bear**| `40, 860` | `1000 × 220` | `25` | Sợi xích đồng, thước đo lực kéo co, 2 mascot Bò & Gấu |
| **Vòng Xoay Định Mệnh** | `290, 1100` | `500 × 500` | `30` | Bánh xe bát quái gỗ, tâm trục đồng, kim chỉ dát vàng |
| **Bản Tin Breaking Ticker**| `0, 1840` | `1080 × 80` | `35` | Dải đồng cổ `#ae854d`, chữ chạy mượt font JetBrains Mono |
| **Còi Báo Động Overlay** | `0, 0` | `1080 × 1920` | `50` | Màn phủ chớp nháy đỏ ruby `#ef444455`, còi hú và banner khẩn |

---

## 5. Hệ Thống Âm Thanh Đa Tầng & Cơ Chế Audio Ducking

### 5.1. Bảng âm thanh Web Audio Oscillator & File Audio

Toàn bộ âm thanh được tổng hợp chuẩn xác qua **Web Audio API** (không phụ thuộc vào file ngoài, giảm tối đa độ trễ mạng) kết hợp kho 99 file WAV giọng đọc cổ truyền:

| Tên âm thanh | Loại kỹ thuật | Tần số / Thông số | Mục đích & Trải nghiệm |
| :--- | :--- | :--- | :--- |
| **Đại Hồng Chung** (`bell`) | Web Audio Harmonics | $220\text{Hz}, 445\text{Hz}, 665\text{Hz}, 1120\text{Hz}$ | Gõ chuông tỉnh tâm, kết thúc kéo co, buông bỏ chấp niệm |
| **Khánh Đồng Phong Thủy** (`chime`)| Sine Oscillators | $880\text{Hz}, 1320\text{Hz}, 1760\text{Hz}$ | Bò Xanh ghi điểm, reaction tim bay, cộng điểm tích lũy |
| **Khấc Gỗ Bánh Xe** (`wood-click`)| Short Burst Noise + Filter | $350\text{Hz}$ Q=12, decay $0.03\text{s}$ | Kim bánh xe va vào chốt chặn gỗ khi quay |
| **Còi Báo Động Bão Nến** (`siren`)| Frequency Ramp Sawtooth | $400\text{Hz} \to 950\text{Hz} \to 400\text{Hz}$ | Còi quét thanh khoản, rung chuyển màn hình |
| **Nhạc Hiệu Bản Tin** (`fanfare`) | Chord Progression Triad | E-Minor $\to$ C-Major $\to$ G-Major | Bật pop-up Breaking News Phố Wall |
| **Giọng Đọc 99 Quẻ Xăm** | File Audio WAV (Mai Chi) | 44.1kHz, 16-bit Mono | Đọc thơ và lời chiêm nghiệm khi rút quẻ nến |

### 5.2. Ma trận ưu tiên âm thanh & Tự động giảm nhạc nền (Audio Ducking)
Khi có hiệu ứng quan trọng diễn ra, hệ thống tự động điều chỉnh âm lượng (Ducking) để tránh xung đột âm thanh:

```
┌────────────────────────────────────────────────────────┐
│ MỨC ƯU TIÊN 1 (Cao nhất): Còi Báo Động & Breaking News │ -> Nhạc nền duck xuống 15%
├────────────────────────────────────────────────────────┤
│ MỨC ƯU TIÊN 2: Giọng Đọc Quẻ Xăm & Đại Hồng Chung       │ -> Nhạc nền duck xuống 30%
├────────────────────────────────────────────────────────┤
│ MỨC ƯU TIÊN 3: Tiếng Lách Cách Vòng Xoay & Chime Kéo Co│ -> Nhạc nền duck xuống 60%
├────────────────────────────────────────────────────────┤
│ MỨC ƯU TIÊN 4 (Mặc định): Nhạc Thiền Nền Chùa Gỗ       │ -> 100% âm lượng cấu hình
└────────────────────────────────────────────────────────┘
```

---

## 6. Hợp Đồng Dữ Liệu Kỹ Thuật (Data Contracts)

Nhằm đảm bảo **Agent Backend** và **Agent Frontend** phát triển độc lập nhưng tích hợp chuẩn xác 100%, dưới đây là định nghĩa khép kín các gói tin WebSocket và REST API:

### 6.1. Giao thức WebSocket (`/ws`)

#### A. Client gửi lên Server (`Client -> Server`)

##### 1. Đóng góp lực kéo co (`tug_pull`)
```json
{
  "type": "tug_pull",
  "data": {
    "roomId": "general",
    "side": "bull",
    "actionType": "click",
    "weight": 1
  }
}
```
*Ghi chú validation:* `side` chỉ chấp nhận `"bull"` hoặc `"bear"`. `weight` do server tính toán hoặc giới hạn tối đa 5 đối với tương tác thông thường, tránh client gian lận số điểm.

##### 2. Quay Vòng Luân Hồi Định Mệnh (`wheel_spin`)
```json
{
  "type": "wheel_spin",
  "data": {
    "roomId": "general"
  }
}
```

##### 3. Kích hoạt Còi Quét Thanh Khoản thủ công (`siren_trigger`)
```json
{
  "type": "siren_trigger",
  "data": {
    "roomId": "general",
    "reason": "Host kích hoạt bão giá NFP"
  }
}
```

##### 4. Gửi đề xuất tin nóng / Bình luận chạy Ticker (`breaking_news_submit`)
```json
{
  "type": "breaking_news_submit",
  "data": {
    "roomId": "general",
    "text": "Vừa vào lệnh Buy 10 lot tại đỉnh, xin anh em tiếp tế bình oxy!"
  }
}
```

---

#### B. Server phát xuống Client (`Server -> Client / Broadcast`)

##### 1. Đồng bộ trạng thái Trận Kéo Co (`tug_state_broadcast`)
Được broadcast mỗi 500ms khi trận đấu đang ở trạng thái `active`:
```json
{
  "type": "tug_state_broadcast",
  "data": {
    "roundId": "round-20261110-093012",
    "status": "active",
    "timeLeftSec": 45,
    "bullPower": 1420,
    "bearPower": 1180,
    "ropePosition": 18.5,
    "lastAction": {
      "side": "bull",
      "userId": "trader_99",
      "nickname": "Nguyễn Văn Bull",
      "powerAdded": 15,
      "label": "Thắp Nhang Gồng Buy"
    }
  }
}
```

##### 2. Công bố kết quả Trận Kéo Co (`tug_result_broadcast`)
```json
{
  "type": "tug_result_broadcast",
  "data": {
    "roundId": "round-20261110-093012",
    "winner": "bull",
    "finalPosition": 82.4,
    "bullTotalPower": 3250,
    "bearTotalPower": 2100,
    "mvp": {
      "userId": "trader_88",
      "nickname": "Hiệp Sĩ Xanh",
      "contributedPower": 650
    },
    "headline": "BÒ HÚC BAY KHÁNG CỰ! NẾN XANH DỰNG CỘT 100 PIP!"
  }
}
```

##### 3. Kết quả Vòng Xoay Định Mệnh (`wheel_result_broadcast`)
```json
{
  "type": "wheel_result_broadcast",
  "data": {
    "spinId": "spin_887123",
    "userId": "trader_12",
    "nickname": "Mai Hoa",
    "avatar": "https://...",
    "slotIndex": 7,
    "slotKey": "god_candle",
    "title": "Cột Xanh Chọc Nóc",
    "pointsAwarded": 100,
    "finalAngle": 1845.5,
    "quote": "Phật quang phổ chiếu! Nến xanh chọc thủng mọi kháng cự!",
    "soundEffect": "bell"
  }
}
```

##### 4. Cảnh báo Còi Báo Động Quét Thanh Khoản (`siren_alert_broadcast`)
```json
{
  "type": "siren_alert_broadcast",
  "data": {
    "alertId": "alert_49182",
    "level": "critical",
    "durationMs": 15000,
    "headline": "🚨 BÁO ĐỘNG ĐỎ CẤP 12: QUÉT THANH KHOẢN HAI ĐẦU!",
    "subtext": "Cá mập vào vùng nước trũng. Đề nghị rút dây mạng hoặc ngồi thiền tuyệt đối!",
    "action": "wick_hunt",
    "activeUsersTargeted": 42
  }
}
```

##### 5. Phát sóng Bản Tin Nóng Phố Wall (`breaking_news_broadcast`)
```json
{
  "type": "breaking_news_broadcast",
  "data": {
    "newsId": "news_91238",
    "mode": "popup",
    "headline": "CHẤN ĐỘNG: Hiệp sĩ Mai Hoa vừa nạp thêm nén nhang thứ 99, EUR/USD giật ngược 40 pip!",
    "traderName": "Mai Hoa",
    "durationMs": 6000,
    "sound": "fanfare"
  }
}
```

---

### 6.2. REST API Endpoints

#### 1. Bắt đầu hiệp Kéo Co mới (Admin / Host)
- **Endpoint:** `POST /api/tug/start`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "roomId": "general",
    "durationSec": 90,
    "secret": "admin_pass_optional"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "ok": true,
    "roundId": "round-20261110-093500",
    "status": "active",
    "durationSec": 90
  }
  ```

#### 2. Kích hoạt lượt quay Bánh Xe Luân Hồi
- **Endpoint:** `POST /api/wheel/spin`
- **Request Body:**
  ```json
  {
    "roomId": "general",
    "userId": "trader_123"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "ok": true,
    "spinId": "spin_887123",
    "slotIndex": 4,
    "slotKey": "oxygen_boost",
    "title": "Bơm Oxy Thần Tốc",
    "pointsAwarded": 25,
    "finalAngle": 1980.0
  }
  ```
- **Response `429 Too Many Requests`:**
  ```json
  {
    "error": "Quay quá nhanh! Vui lòng chờ 25 giây để tĩnh tâm."
  }
  ```

#### 3. Kích hoạt Còi Báo Động Quét Thanh Khoản
- **Endpoint:** `POST /api/siren/trigger`
- **Request Body:**
  ```json
  {
    "roomId": "general",
    "durationMs": 15000,
    "headline": "Bão giá Non-Farm quét sạch râu nến!"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "ok": true,
    "alertId": "alert_49182",
    "durationMs": 15000
  }
  ```

#### 4. Lấy danh sách tin Ticker đang hoạt động
- **Endpoint:** `GET /api/news/ticker?roomId=general`
- **Response `200 OK`:**
  ```json
  {
    "items": [
      "EUR/USD: 1.0845 ▲ +0.35%",
      "XAU/USD: 2,685.20 ▲ +1.12%",
      "Chiến thần Hoàng Nam vừa chốt non 1.5 pip thành công!",
      "Khuyến cáo: Tránh say máu nhồi lệnh khi còi báo động đang hú!"
    ]
  }
  ```

---

## 7. Tiêu Chí Nghiệm Thu (Acceptance Criteria - Given/When/Then)

Dành cho **Agent QA** và **Agent Reviewer** thẩm định sản phẩm:

### 7.1. Tính năng Bull vs Bear Kéo Co
- **AC-TUG-01 (Bắt đầu trận):**
  - **Given:** Phòng đang ở trạng thái `idle`.
  - **When:** Streamer bấm bắt đầu trận từ trang Admin hoặc API `/api/tug/start` được gọi.
  - **Then:** Toàn bộ client nhận sự kiện `tug_state_broadcast`, đồng hồ đếm ngược bắt đầu chạy từ 90s về 0s, thanh kéo co hiện lên với vị trí bùa ở tâm $0\%$.
- **AC-TUG-02 (Tương tác thời gian thực):**
  - **Given:** Trận kéo co đang `active`.
  - **When:** Viewer bấm nút "Thắp Nhang Gồng Buy" hoặc gõ từ khóa `"buy"`.
  - **Then:** Điểm lực phe Bò tăng ngay lập tức, vị trí bùa nhích về phía bên phải (phía Bò) trong vòng $\le 100\text{ms}$, âm thanh khánh đồng phát ra nhẹ nhàng.
- **AC-TUG-03 (Kết thúc & Vinh danh):**
  - **Given:** Hết 90s hoặc một phe chạm mốc $\pm 100\%$.
  - **When:** Server phát sự kiện `tug_result_broadcast`.
  - **Then:** Âm thanh chiến thắng vang rền, mascot của phe thắng tung cước húc mascot phe thua, mưa hạt vàng hoặc khói đỏ xuất hiện, bảng vinh danh hiển thị MVP kéo co.

### 7.2. Tính năng Vòng Xoay Định Mệnh Gồng Lỗ
- **AC-WHEEL-01 (Quay hợp lệ):**
  - **Given:** Người dùng có đủ điểm ảo hoặc đã hết thời gian cooldown (30s).
  - **When:** Người dùng nhấp nút "Quay Vòng Định Mệnh".
  - **Then:** Nút bấm bị vô hiệu hóa (disable), bánh xe quay mượt mà với hiệu ứng easing trong 4.5s, tiếng gõ gỗ phát ra theo từng nấc nan, dừng đúng ô đã được server xác định trước.
- **AC-WHEEL-02 (Chống gian lận client):**
  - **Given:** Client cố tình gửi payload góc quay hoặc slot index tùy ý.
  - **When:** Gửi request lên server.
  - **Then:** Server từ chối payload đầu vào, tự sinh kết quả ngẫu nhiên có trọng số và trả về kết quả chính thức; client bắt buộc xoay theo góc độ của server.

### 7.3. Tính năng Còi Báo Động Quét Thanh Khoản
- **AC-SIREN-01 (Kích hoạt tức thì):**
  - **Given:** Livestream đang hiển thị bảng nến bình thường.
  - **When:** Có lệnh kích hoạt còi quét thanh khoản (`siren_trigger`).
  - **Then:** Trong vòng $\le 80\text{ms}$, toàn bộ màn hình 1080x1920 bật viền chớp đỏ ruby `#ef4444`, còi hú ngân vang, nhạc nền tự động giảm âm lượng xuống $15\%$, banner cảnh báo giật râu 2 đầu chạy chữ ngang.
- **AC-SIREN-02 (Tự động phục hồi):**
  - **Given:** Còi báo động đang chạy trong chu kỳ 15 giây.
  - **When:** Hết 15 giây.
  - **Then:** Hiệu ứng chớp đỏ tắt, tiếng đại hồng chung ngân một hồi êm dịu, nhạc nền tự phục hồi về $100\%$ âm lượng cài đặt.

### 7.4. Tính năng Bản Tin Nóng Phố Wall
- **AC-NEWS-01 (Ticker chạy liên tục):**
  - **Given:** Màn hình `/overlay` hoặc Web Client đang mở.
  - **When:** Ứng dụng chạy.
  - **Then:** Dải tin chạy chữ Ticker ở đáy bảng nến di chuyển mượt mà 60 FPS, không bị giật lag, hiển thị đan xen tỷ giá và câu meme tài chính.
- **AC-NEWS-02 (Pop-up cá nhân hóa):**
  - **Given:** Người dùng có nickname "Trần Tuấn" thực hiện hành động nổi bật.
  - **When:** Sự kiện `breaking_news_broadcast` được phát.
  - **Then:** Khung tin nổi lên ở vị trí trên bảng nến với tiêu đề chứa chính xác chữ "Trần Tuấn", âm thanh fanfare vang lên, tự động ẩn sau đúng 6 giây.

---

## 8. Kế Hoạch & Bộ Kịch Bản Kiểm Thử Dành Cho Agent QA

### 8.1. Ma trận kiểm thử kiểm chứng (QA Test Matrix)

| Mã test | Hạng mục kiểm thử | Kịch bản thực hiện | Kết quả mong đợi | Mức độ nghiêm trọng |
| :--- | :--- | :--- | :--- | :---: |
| **TC-VIRAL-01** | Kéo co đồng thời (Concurrency) | Dùng script mở 30 kết nối WebSocket, đồng thời gửi 500 lệnh kéo co trong 5 giây | Server xử lý ổn định, không crash, vị trí dây thừng tính toán chuẩn xác, không bị race condition | **Blocker** |
| **TC-VIRAL-02** | Xoay bánh xe & Cooldown | Một user gửi 5 request quay liên tiếp trong 1 giây | Chỉ 1 request đầu tiên được duyệt (200 OK), 4 request sau nhận 429 Too Many Requests | **Critical** |
| **TC-VIRAL-03** | Audio Ducking | Kích hoạt còi hú hoặc quẻ xăm khi nhạc nền đang bật | Nhạc nền hạ âm lượng mượt mà (Fade down $0.3\text{s}$) và tự nâng lại khi kết thúc | **Major** |
| **TC-VIRAL-04** | Hiệu năng OBS 1080x1920 | Bật màn hình `/overlay` chạy liên tục trong 2 giờ kèm kích hoạt liên tục cả 4 tính năng | CPU trình duyệt $< 15\%$, RAM $< 200\text{MB}$, không xuất hiện rò rỉ bộ nhớ (Memory Leak) | **Critical** |
| **TC-VIRAL-05** | Đồng bộ màu sắc & Thẩm mỹ | Soi mã màu kiểm tra trên DOM của cả 4 tính năng | 100% phần tử tuân thủ `#24140d`, `#ae854d`, `#f3d28a`, `#10b981`, `#ef4444` | **Normal** |

### 8.2. Kịch bản chạy Test tự động mẫu (Node.js Script cho QA)
Agent QA có thể chạy nhanh đoạn mã sau để kiểm tra hợp đồng dữ liệu WebSocket và REST API:

```javascript
// test-viral-mechanics.mjs
import { WebSocket } from 'ws';

const BASE_URL = 'http://127.0.0.1:3000';
const WS_URL = 'ws://127.0.0.1:3000/ws?roomId=general';

console.log('🚀 Bắt đầu bài test kiểm chứng Data Contract V2...');

// Test 1: Kiểm tra REST API Bánh Xe
async function testWheelApi() {
  const res = await fetch(`${BASE_URL}/api/wheel/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId: 'general', userId: 'qa_tester_01' })
  });
  const data = await res.json();
  console.assert(res.status === 200, '❌ Lỗi HTTP Status API Wheel');
  console.assert(data.slotIndex >= 0 && data.slotIndex <= 7, '❌ SlotIndex không nằm trong khoảng 0-7');
  console.log('✅ PASS Test 1: API Wheel Spin hợp lệ.');
}

// Test 2: Kiểm tra WebSocket Kéo Co
function testTugSocket() {
  const ws = new WebSocket(WS_URL);
  ws.on('open', () => {
    ws.send(JSON.stringify({
      type: 'tug_pull',
      data: { roomId: 'general', side: 'bull', weight: 5 }
    }));
  });

  ws.on('message', raw => {
    const msg = JSON.parse(raw);
    if (msg.type === 'tug_state_broadcast') {
      console.assert(typeof msg.data.ropePosition === 'number', '❌ ropePosition không phải số');
      console.log('✅ PASS Test 2: Nhận broadcast tug_state_broadcast chuẩn xác.');
      ws.close();
    }
  });
}

testWheelApi().then(() => testTugSocket());
```

---
> **Kết luận từ Viral Architect & UX Director:**  
> Bản đặc tả trên đây là chuẩn mực thực thi cao nhất cho phiên bản nâng cấp của **"Đu Chart Online"**. Mọi triển khai mã nguồn của **Agent Backend** và **Agent Frontend** phải bám sát tuyệt đối cấu trúc gói tin, bảng mã màu Chùa Gỗ Cổ Điển và các tiêu chí nghiệm thu của **Agent QA**.
