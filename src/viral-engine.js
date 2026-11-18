import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';

// 8 Official Karma Slots from docs/viral-upgrade-spec.md Section 3.2.B
export const WHEEL_SLOTS = [
  {
    index: 0,
    key: 'margin_call',
    title: 'X100 Đòn Bẩy (Margin Call)',
    weight: 10,
    points: -50,
    soundEffect: 'broken-glass',
    quote: 'Tham thì thâm, đòn bẩy một ngàn tiễn nàng ra đê!'
  },
  {
    index: 1,
    key: 'hold_loss',
    title: 'Gồng Lỗ Bất Tử',
    weight: 20,
    points: 20,
    soundEffect: 'wood-click',
    quote: 'Gồng lỗ là bản năng, gồng lãi là bản lĩnh chưa luyện thành.'
  },
  {
    index: 2,
    key: 'cut_bottom',
    title: 'Cắt Ngay Đáy',
    weight: 15,
    points: 10,
    soundEffect: 'wood-click',
    quote: 'Vừa buông tay cắt lỗ thì nến vọt 100 pip, cay đắng ngậm ngùi!'
  },
  {
    index: 3,
    key: 'take_profit_early',
    title: 'Chốt Non 1 Pip',
    weight: 18,
    points: 15,
    soundEffect: 'chime',
    quote: 'Ăn non cho lành, một tô mì tôm ấm lòng giữa mùa bão giá.'
  },
  {
    index: 4,
    key: 'oxygen_boost',
    title: 'Bơm Oxy Thần Tốc',
    weight: 14,
    points: 25,
    soundEffect: 'chime',
    quote: 'Bình oxy đã mở van! Tạm thời thoát khỏi cơn ngạt thở.'
  },
  {
    index: 5,
    key: 'breakeven_dream',
    title: 'Về Bờ Trong Mơ',
    weight: 10,
    points: 30,
    soundEffect: 'chime',
    quote: 'Thấy bờ đâu đây... ai dè chỉ là ảo ảnh thị trường!'
  },
  {
    index: 6,
    key: 'zen_mind',
    title: 'Tâm Bất Biến',
    weight: 8,
    points: 40,
    soundEffect: 'bell',
    quote: 'Thị trường giật 500 pip, ta ung dung nâng chén trà sen.'
  },
  {
    index: 7,
    key: 'god_candle',
    title: 'Cột Xanh Chọc Nóc',
    weight: 5,
    points: 100,
    soundEffect: 'bell',
    quote: 'Khí thế Xóm Trade dâng cao! Nến xanh chọc thủng mọi kháng cự!'
  }
];

// Satirical Wall Street Breaking News Templates (50 items)
export const NEWS_TEMPLATES = [
  'CHẤN ĐỘNG: Hiệp sĩ {trader} vừa nạp thêm nén nhang thứ 99, EUR/USD lập tức dựng cột 40 pip giải cứu hàng ngàn anh em!',
  "REUTERS ĐƯA TIN: Chủ tịch Fed phát biểu: 'Thấy {trader} vừa vào lệnh Short, chúng tôi quyết định hoãn giảm lãi suất!'",
  'CẢNH BÁO TỪ WALL STREET: {trader} vừa bấm nút Buy Vàng, cá mập toàn cầu đồng loạt ôm tiền bỏ chạy!',
  'BẢN TIN KHẨN: Một lệnh gồng lỗ xuyên màn đêm của {trader} vừa được ghi danh vào kỷ lục Guinness!',
  "NÓNG: Ngân hàng Trung ương châu Âu (ECB) tuyên bố: 'Thị trường không thể sập chừng nào {trader} chưa chịu cắt lỗ!'",
  'KỲ DIỆU: {trader} vừa gõ một tiếng chuông tỉnh tâm, chỉ số DXY lập tức quay đầu giảm nhiệt!',
  'WALLSTREETBETS VINH DANH: Chiến thần {trader} chốt non 1.5 pip thành công, bảo toàn vốn ăn phở trọn vẹn cả tuần!',
  'TIN GIỜ CHÓT: Phát hiện {trader} nhồi 10 lệnh không Stop-loss, cả xóm đồng thanh hò reo cổ vũ!',
  'TIN BUỒN: {trader} vừa bán ngay đáy XAU/USD tại 2650, 3 giây sau giá vọt lên 2700 trong sự ngỡ ngàng của cả dòng họ!',
  "TỔNG THỐNG PHÁT BIỂU: Xin toàn dân noi gương tinh thần 'Tâm bất biến giữa dòng đời nến giật' của {trader}!",
  'THỐNG KÊ MỚI: 99% trader trong phòng thở phào nhẹ nhõm sau khi thấy {trader} kích hoạt bình bơm oxy!',
  "GIẢI THƯỞNG NOBEL KINH TẾ: Đề cử {trader} nhờ công trình chứng minh: 'Cắt lỗ xong nến luôn luôn bay ngược lại'.",
  'CÁ MẬP PHỐ WALL KHÓC RÒNG: Bẫy giá chuẩn bị sẵn 3 ngày liền nhưng {trader} quyết định... đi ngủ sớm!',
  'BẢN TIN ĐÊM MUỘN: {trader} đã hạ quyết tâm cai đòn bẩy 1:1000, chuyển sang ngồi thiền đếm nến 1H.',
  'TIN NỘI BỘ: Đội lái vừa họp khẩn vì {trader} kiên quyết không chịu nhả lệnh gồng lỗ 300 pip!',
  'SỰ THẬT KINH HOÀNG: {trader} soi chart trên điện thoại suốt 8 tiếng, mắt sáng hơn cả đèn pha ô tô!',
  'GÓC KỶ LUẬT: {trader} đã đặt Stop-loss cách entry đúng 15 pip, xứng đáng được phong tặng danh hiệu Chiến Thần Sắt Đá!',
  'CHUYỆN LẠ CÓ THẬT: Nến rút chân dài ngoằng vừa cứu {trader} thoát Margin Call trong đúng 0.5 pip cuối cùng!',
  'BẢN TIN PHÒNG CHÁY: Toàn bộ thành viên phòng {roomId} vừa đồng loạt hò reo tiếp sức cho {trader}!',
  'THỊ TRƯỜNG CHỨNG KHOÁN ĐỎ LỬA: Riêng tài khoản của {trader} vẫn xanh mướt... vì chưa kịp vào lệnh!',
  'HỘI ĐỒNG THẨM ĐỊNH: Bát mì tôm đêm nay của {trader} đậm đà hơn thường lệ nhờ 20 pip lợi nhuận chốt non!',
  "CÔNG AN KINH TẾ KHUYẾN CÁO: Đừng bao giờ tranh cãi xu hướng với một người vừa quay trúng ô 'Gồng Lỗ Bất Tử' như {trader}!",
  'ĐẠI HỘI TRADER TOÀN CẦU: Nhất trí dựng tượng đồng tri nỗ {trader} vì đã gánh team đu đỉnh suốt 3 tháng qua!',
  'NÓNG BỎNG TAY: {trader} vừa quay trúng ô Cột Xanh Chọc Nóc, nến xanh đang rượt đuổi nến đỏ chạy có cờ!',
  'LỜI SẤM TRUYỀN: Nến đỏ là thử thách, nến xanh là quà tặng, và {trader} là người kiên định nhất Xóm Trade!',
  "WALL STREET JOURNAL: Trader {trader} vừa chia sẻ bí kíp bất bại: 'Cứ khi nào sắp cháy thì tắt app đi ngủ'!",
  'TIN ĐẶC BIỆT: {trader} phát minh phương pháp gồng lỗ bằng cách xóa app, thị trường bất lực không làm gì được!',
  'TRUYỀN THUYẾT PHỐ WALL: Ai đó thấy bóng dáng {trader} đứng ở đỉnh 2,750 USD vẫy tay chào đồng bào!',
  // 22 Kịch bản thời sự tài chính mở rộng (FED, Non-Farm, CPI, Cá Mập, Rút dây mạng)
  "FED TẬP TRUNG HỌP KHẨN: Chủ tịch Powell tuyên bố 'Lãi suất sẽ tăng vọt nếu {trader} còn cố chấp nhồi thêm lệnh Buy!'",
  'BẢN TIN NON-FARM NÓNG: Số liệu việc làm Mỹ đảo chiều dữ dội sau khi phát hiện {trader} vừa cắt lỗ 5 lot Vàng!',
  'BÁO CÁO CPI MỸ: Lạm phát hạ nhiệt bất ngờ vì {trader} đã chuyển từ ăn phở sang ăn mì tôm để gồng lệnh!',
  'CÁ MẬP PHỐ WALL XẢ HÀNG: Khối ngoại vừa bán tháo 1,000 tỷ USD chỉ vì nghi ngờ {trader} đang cùng phe với họ!',
  'TUYỆT KỸ RÚT DÂY MẠNG: {trader} vừa thi triển thần chưởng rút dây modem Wi-Fi đúng 1 giây trước cây nến tử thần!',
  'CHẤN ĐỘNG PHIÊN MỸ: Non-Farm quét râu 150 pip hai đầu, nhưng {trader} thoát nạn nhờ bận... đi thắp hương!',
  'BLOOMBERG ĐƯA TIN: Các quỹ đầu cơ đồng loạt ngắt máy chủ vì sợ bẫy thanh khoản của cao thủ {trader}!',
  'NÓNG BỎNG TAY: Jerome Powell vừa hắt hơi trên sóng truyền hình trực tiếp, tài khoản của {trader} rung lắc cấp 8!',
  'PHÁT HIỆN BẤT THƯỜNG: Cá voi vừa chuyển 50,000 BTC lên sàn để chuẩn bị đón đầu lệnh Short của {trader}!',
  'TIN GIỜ CHÓT: Sàn giao dịch vừa ghi nhận hiện tượng trượt giá Slippage 50 pip chỉ để quét trúng Stop-loss của {trader}!',
  'KỶ LỤC GUINNESS MỚI: {trader} chính thức trở thành người rút dây mạng modem nhanh nhất lịch sử tài chính thế giới!',
  'PHỐ WALL RÚNG ĐỘNG: CPI công bố vượt dự báo, toàn bộ thị trường đỏ lửa riêng bàn thờ lệnh của {trader} bốc khói nghi ngút!',
  "CẢNH BÁO TỪ BỘ TÀI CHÍNH: Khuyến nghị anh em tắt máy tính ngay khi thấy {trader} hô hào 'Tất tay làm lại cuộc đời'!",
  'HỘI THẢO ĐẦU TƯ TOÀN CẦU: Đưa trường hợp gồng lỗ xuyên qua 3 kỳ Non-Farm của {trader} vào sách giáo khoa kinh tế!',
  "REUTERS ĐẶC BIỆT: Chủ tịch Fed thắc mắc: 'Tại sao {trader} vừa bấm Buy là chỉ số Dow Jones lập tức cắm đầu 500 điểm?'",
  "CHIẾN THUẬT ĐỈNH CAO: {trader} chia sẻ bí quyết sống sót qua bão CPI: 'Cứ tắt app xóa tài khoản là không ai đòi nợ được'!",
  'CÁ MẬP BẬT KHÓC: Dự định kéo xả 100 pip để bắt đáy nhưng bị {trader} chốt non 1 pip chặn họng!',
  'TIN ĐỘC QUYỀN: Một tổ chức tài chính ngầm vừa treo thưởng 1 triệu USD cho ai tìm ra công thức gồng lệnh của {trader}!',
  'CƠN ĐỊA CHẤN TÀI CHÍNH: Fed tuyên bố tạm dừng họp báo vì phát hiện {trader} đang livestream phân tích sóng Elliot!',
  'PHÒNG CHÁY CHỮA CHÁY KHẨN: Trạm cứu hỏa điều xe đến cứu viện vì tài khoản của {trader} đang bốc cháy ngùn ngụt sau giờ Non-Farm!',
  'BẢN TIN PHONG THỦY: Chuyên gia khuyên {trader} nên đổi màu hình nền điện thoại sang xanh lá để khắc chế vía đỏ nến tuần!',
  'HẾT GIỜ GIAO DỊCH: Toàn bộ phố Wall thở phào nhẹ nhõm vì {trader} đã an toàn tắt máy đi ngủ mà không nhồi thêm lệnh nào!',
  "CHẤN ĐỘNG: CZ Binance vừa tweet khen ngợi {trader}: 'Quả là tinh thần If you cannot hold you will not be rich đích thực!'",
  'HUYỀN THOẠI LIVERMORE NHẬP: {trader} kiên nhẫn ngồi yên không vào lệnh suốt 4 tiếng, né trọn cú quét râu 200 pip của cá mập!',
  'CZ BINANCE DẶN DÒ: Nhắn gửi {trader} nhớ kỹ quy tắc số 4: Bỏ ngoài tai FUD, tập trung soi chart và giữ chặt Stop-loss!',
  "GEORGE SOROS GẬT GÙ: Thấy {trader} chốt non 20 pip ăn bát mì tôm, ngài Soros khen ngợi đây là bài học quản trị vốn mẫu mực!",
  'WARREN BUFFETT GỌI ĐIỆN CHO {trader}: Xin bí kíp gồng lệnh không cần nhìn chart để áp dụng cho quỹ Berkshire Hathaway!',
  'PAUL TUDOR JONES CẢNH BÁO: Nhắc nhở {trader} tuyệt đối không được nhồi lệnh bình quân giá xuống (Losers average losers)!'
];

// Kho 40 Lời Thoại Sấm Truyền & Châm Biếm Phân Tích Kỹ Thuật của Giáo Sư Cún (Professor Dog)
export const PROFESSOR_DOG_QUOTES = [
  'GS. Cún: Jesse Livermore dạy: Tiền kiếm được là nhờ kiên nhẫn ngồi yên chờ đợi, chứ không phải cào phím mỗi phút! 🧘‍♂️',
  'GS. Cún: CZ Binance dặn: If you cannot hold, you will not be rich! Không gồng được thì đừng mơ làm đại gia! 💎',
  'GS. Cún: Jesse Livermore bảo: Đừng bao giờ cãi nhau với bảng nến! Thị trường không bao giờ sai, chỉ có trò là sai! 📉',
  'GS. Cún: CZ dặn con số 4 thần thánh: Bỏ ngoài tai mọi FUD và tiếng ồn, tập trung soi chart và bảo vệ tài khoản! 4️⃣',
  'GS. Cún: George Soros dạy: Đúng hay sai không quan trọng, quan trọng là lúc đúng ăn bao nhiêu pip, lúc sai mất bao nhiêu! 🎯',
  'GS. Cún: Paul Tudor Jones bảo: Losers average losers! Gồng lỗ là dở rồi, lại còn nhồi thêm lệnh là chuẩn bị ra đảo! 🏝️',
  'GS. Cún: Warren Buffett dạy: Nguyên tắc 1 là không để cháy tài khoản, nguyên tắc 2 là xem lại nguyên tắc 1! 📜',
  'GS. Cún: Satoshi Nakamoto nhắn: Nếu anh em không hiểu hoặc không tin, tôi không có thời gian để giải thích đâu! ⚡',
  'GS. Cún: Mark Minervini dạy: Thà cắt lỗ nhỏ như muỗi cắn mười pip, còn hơn để cá mập cắn đứt cả tài khoản! 🛡️',
  'GS. Cún: Jesse Livermore dạy: Kẻ thù lớn nhất của trader nằm ở trong chính bản thân họ: lòng tham và nỗi sợ hãi! 🪞',
  'GS. Cún: Thầy bảo nến búa rút chân, trò lại tưởng búa đập vỡ tài khoản! 🔨',
  'GS. Cún: Sóng Elliot đếm 1-2-3-4-5, đếm xong tiền trong ví thấy về số 0! 🌊',
  'GS. Cún: Phân kỳ RSI ba đoạn rõ mồn một, mà trò vẫn cố cãi thầy nhồi lệnh! 📉',
  'GS. Cún: Cản MA200 cứng như bàn thạch, đâm đầu vào chỉ có mẻ nón lá thôi! 📐',
  'GS. Cún: Vừa thấy nến xanh tưởng Bull Run, ai ngờ trúng bẫy Bull Trap của cá mập! 🐂🪤',
  'GS. Cún: Bẫy Bear Trap kinh điển: dụ anh em bán tháo rồi phi tên lửa thẳng lên mây! 🐻🪤',
  'GS. Cún: Cắt lỗ ngay đáy chuẩn sách giáo khoa, vừa buông tay là nến dựng cột! ✂️',
  'GS. Cún: Chốt non 0.5 pip ăn bát mì tôm, nhìn nến chạy tiếp 100 pip mà rớt nước mắt! 🍜',
  'GS. Cún: Gồng lỗ bất tử - bí kíp chân truyền từ đời cụ tổ truyền lại cho trò à? 🛡️',
  'GS. Cún: Thước kẻ của thầy đo sóng chuẩn từng pip, chỉ có trò là đo nhầm lòng tham! 📏',
  'GS. Cún: Mô hình Vai - Đầu - Vai, hay là mô hình bay màu cả gia tài? 👨‍🏫',
  'GS. Cún: Fibonacci thoái lui 61.8%, nhưng ví tiền của trò thoái lui 99%! 🌀',
  'GS. Cún: Nến Doji bia mộ dựng ngay đỉnh, không chạy thì đợi ai cứu hả các ông? 🪦',
  'GS. Cún: Quản lý vốn là gì? Là đừng để thầy phải đi mua mì tôm cứu trợ anh em! 🍜',
  'GS. Cún: Kháng cự sinh ra để phá, nhưng tài khoản sinh ra không phải để cháy! ⚠️',
  'GS. Cún: Trò bảo phân tích đa khung thời gian: 1 phút cháy, 5 phút khóc, 1 giờ ra đê! 🕒',
  'GS. Cún: Nến Marubozu đặc ruột thế kia mà dám nhảy vào chặn đầu xe lửa! 🚂',
  'GS. Cún: MACD cắt xuống từ đỉnh Everest rồi, buông tay đi cho nhẹ đầu anh em ơi! ✂️',
  'GS. Cún: Bắt dao rơi đứt tay, bắt nến rơi thì đứt luôn cả sợi dây mạng! 🗡️',
  'GS. Cún: Thầy dạy "xu hướng là bạn", trò lại coi cá mập là người yêu cũ! 🦈',
  'GS. Cún: Đặt Stop-loss 10 pip thì sợ dính, gồng lỗ 300 pip thì can đảm phi thường! 🦁',
  'GS. Cún: Bollinger Band thắt cổ chai, sắp có bão tố cấp 15 quét sạch hai đầu! 🌪️',
  'GS. Cún: Ông nào nhồi lệnh Martingale đấy? Ra góc phòng úp mặt vào tường kiểm điểm mau! 🙇',
  'GS. Cún: Mây Ichimoku dày đặc sương mù, tâm trò cũng mịt mờ như tương lai lệnh Buy! ☁️',
  'GS. Cún: Học trò ruột của thầy là phải nhớ: Thà chốt non còn hơn lau nước mắt! 🚀',
  'GS. Cún: Cây Pinbar dài ngoằng như gậy Như Ý, quét râu xong đi về nơi xa lắm! 🪄',
  'GS. Cún: Giao dịch không kỷ luật thì thần may mắn cũng phải lắc đầu ngao ngán! ⚠️',
  'GS. Cún: Vừa mở mắt thấy Gap nhảy 50 pip, tim đập nhanh hơn nhịp sóng Elliot! 💓',
  'GS. Cún: Trò bảo "Lần này sẽ khác", đúng rồi, lần này cháy nhanh gấp đôi lần trước! 💸',
  'GS. Cún: Nến rút chân thần thánh! May quá cá mập vừa nhả cho một nhịp hồi! 🚀'
];

// Danh Hiệu Phong Thần Vinh Danh Chiến Thắng Kéo Co (Tug of War Honorary Titles)
export const BULL_HONORARY_TITLES = [
  { title: 'Chúa Tể Bắt Đáy', badge: '👑 Bắt Đáy', minPower: 0 },
  { title: 'Đại Gia Phước Dày', badge: '🐋 Phước Dày', minPower: 500 },
  { title: 'Chiến Thần Húc Kháng Cự', badge: '🐂 Húc Cản', minPower: 200 },
  { title: 'Bậc Thầy Bơm Nến Xanh', badge: '🕯️ Bơm Xanh', minPower: 100 },
  { title: 'Dũng Sĩ Long Thần Chưởng', badge: '⚡ Long Thần', minPower: 50 }
];

export const BEAR_HONORARY_TITLES = [
  { title: 'Chiến Thần Gồng Lỗ', badge: '🛡️ Gồng Lỗ', minPower: 0 },
  { title: 'Cụ Tổ Đạp Đáy', badge: '🐻 Đạp Đáy', minPower: 500 },
  { title: 'Sát Thủ Vả Nến', badge: '💥 Vả Nến', minPower: 200 },
  { title: 'Chúa Tể Thoát Hàng', badge: '🚪 Thoát Hàng', minPower: 100 },
  { title: 'Đại Ca Quét Râu', badge: '🗡️ Quét Râu', minPower: 50 }
];

export const DRAW_HONORARY_TITLES = [
  { title: 'Đại Sứ Hòa Bình Xóm Trade', badge: '🕊️ Hòa Bình' },
  { title: 'Bậc Thầy Nến Doji', badge: '⚖️ Doji' },
  { title: 'Chiến Hữu Ra Đê Hóng Mát', badge: '🍵 Hóng Mát' }
];

export const BULL_VICTORY_HEADLINES = [
  'BÒ HÚC BAY KHÁNG CỰ! NẾN XANH DỰNG CỘT 100 PIP!',
  'BÒ HÚC TUNG NÓC PHỐ WALL! NẾN XANH CHỌC TRỜI ĐƯA ANH EM VỀ BỜ!',
  'BÒ HÚC SẬP PHE GẤU! CHÚA TỂ BẮT ĐÁY DẪN CẢ XÓM TRADE ĐI ĂN PHỞ!',
  'BÒ HÚC BAY CẢN CỨNG! ĐẠI GIA BÚ ĐẪM PIP TIẾP LỰC ĐƯA ANH EM VỀ BỜ!',
  'BÒ HÚC GÃY CÀNG CÁ MẬP! NẾN XANH ĐÂM THỦNG MỌI DỰ BÁO!'
];

export const BEAR_VICTORY_HEADLINES = [
  'GẤU TÁT SẬP BÀN CỜ! NẾN ĐỎ CẮM THẲNG XUỐNG SÀN!',
  'GẤU VẢ CHIẾN THẦN GỒNG LỖ! ĐẠP GÃY TOÀN BỘ HỖ TRỢ PHỐ WALL!',
  'GẤU TÁT RƠI DÉP PHE BUY! CỤ TỔ ĐẠP ĐÁY TIỄN ANH EM RA ĐÊ HÓNG MÁT!',
  'GẤU QUÉT SẠCH TÚI PHIÊN MỸ! CƠN LỐC ĐỎ RỰC QUÉT TRỤI THANH KHOẢN!',
  'GẤU TÁT NẾN ĐỎ LÒM! BÁO ĐỘNG ĐỎ CẤP 12 NHẤN CHÌM PHE LONG!'
];

export const DRAW_VICTORY_HEADLINES = [
  'HAI PHE BẤT PHÂN THẮNG BẠI! RỦ NHAU RA ĐÊ HÓNG MÁT!',
  'HAI PHE HÒA NHOÀI AN LẠC! NẾN DOJI LƯỠNG LỰ CÙNG HẾT OXY!',
  'HAI PHE BẮT TAY ĐÌNH CHIẾN! CÙNG UỐNG TRÀ SEN THẮP HƯƠNG TÂM AN!'
];

// Never place invented market numbers in the broadcast ticker.  The XAU/USD
// spot quote is rendered from the dedicated real-price endpoint above chart.
export const MARKET_TICKER_LABELS = [
  'XAU/USD SPOT: giá thực hiển thị ở bảng giá phía trên · không dùng số mô phỏng',
  'EUR/USD · GBP/USD · USD/JPY: theo dõi trực tiếp trên biểu đồ đã chọn',
  'QUẢN TRỊ VỐN: Mỗi lệnh đều cần điểm dừng lỗ và khối lượng phù hợp',
  'TÂM LÝ GIAO DỊCH: Bình tĩnh quan sát trước khi FOMO theo một cây nến',
  'XÓM TRADE: Vốn còn là còn cơ hội · vào lệnh có kế hoạch'
];

// Comment Keyword Intent Detection
export function detectCommentIntent(text) {
  if (!text || typeof text !== 'string') return null;
  const clean = text.trim();
  if (!clean) return null;
  // Bull words: buy, long, bò, bo, xanh, lên, len, or exact vote "1" / "team 1"
  // Bear words: sell, short, gấu, gau, đỏ, do, xuống, xuong, or exact vote "2" / "team 2"
  const bullRegex = /(?:^|[\s\p{P}])(buy+|long|bò|bo|xanh|lên|len)(?:$|[\s\p{P}])/iu;
  const bearRegex = /(?:^|[\s\p{P}])(sell+|short|gấu|gau|đỏ|do|xuống|xuong)(?:$|[\s\p{P}])/iu;
  const bullVoteRegex = /^(?:1+|(?:team|phe|chon|chọn)\s*1)$/iu;
  const bearVoteRegex = /^(?:2+|(?:team|phe|chon|chọn)\s*2)$/iu;

  const isBull = bullRegex.test(clean) || bullVoteRegex.test(clean);
  const isBear = bearRegex.test(clean) || bearVoteRegex.test(clean);

  if (isBull && !isBear) return 'bull';
  if (isBear && !isBull) return 'bear';
  return null;
}

/** Detect chat keywords that contribute to Liquidity Siren stop-loss rescue. */
export function detectSirenRescueIntent(text) {
  if (!text || typeof text !== 'string') return false;
  return /(?:^|[\s\p{P}])(cắt lỗ|cat lo|stop\s*loss|stoploss|cứu em|cuu em|rút dây|rut day)(?:$|[\s\p{P}])/iu.test(text.trim());
}

// 1. TugOfWar Engine (Kéo Co Bò vs Gấu)
export class TugOfWar {
  constructor(options = {}) {
    this.status = 'idle'; // 'idle' | 'active' | 'finished'
    this.roundId = this.generateRoundId();
    this.durationSec = Number(options.durationSec) || 90;
    this.timeLeftSec = this.durationSec;
    this.bullPower = 0;
    this.bearPower = 0;
    this.ropePosition = 0; // -100 to +100
    this.contributors = new Map(); // userId -> { userId, nickname, avatar, bullPower, bearPower, totalPower }
    this.lastAction = null;
    this.result = null;
  }

  generateRoundId() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    return `round-${ts}`;
  }

  start(options = {}) {
    this.durationSec = Math.max(10, Math.min(300, Number(options.durationSec) || 90));
    this.timeLeftSec = this.durationSec;
    this.status = 'active';
    this.roundId = this.generateRoundId();
    this.bullPower = 0;
    this.bearPower = 0;
    this.ropePosition = 0;
    this.contributors.clear();
    this.lastAction = null;
    this.result = null;
    return this.getState();
  }

  reset() {
    this.status = 'idle';
    this.timeLeftSec = this.durationSec;
    this.bullPower = 0;
    this.bearPower = 0;
    this.ropePosition = 0;
    this.contributors.clear();
    this.lastAction = null;
    this.result = null;
    return this.getState();
  }

  pull(side, power = 1, user = {}, source = 'click') {
    // If game is idle, auto-start
    if (this.status !== 'active') {
      this.start({ durationSec: this.durationSec });
    }

    if (side !== 'bull' && side !== 'bear') {
      return { ok: false, error: "Phe kéo phải là 'bull' hoặc 'bear'." };
    }

    const safePower = Math.max(1, Math.min(5000, Number(power) || 1));
    if (side === 'bull') {
      this.bullPower += safePower;
    } else {
      this.bearPower += safePower;
    }

    const uid = String(user.userId || user.id || 'trader_' + randomUUID().slice(0, 6));
    const nickname = String(user.nickname || user.name || 'Trader').slice(0, 40);
    const avatar = String(user.avatar || '');

    let contrib = this.contributors.get(uid);
    if (!contrib) {
      contrib = { userId: uid, nickname, avatar, bullPower: 0, bearPower: 0, totalPower: 0 };
      this.contributors.set(uid, contrib);
    }
    if (side === 'bull') contrib.bullPower += safePower;
    else contrib.bearPower += safePower;
    contrib.totalPower += safePower;

    // Default label based on source/side
    let label = user.label;
    if (!label) {
      if (source === 'comment') label = side === 'bull' ? 'Hô Buy (Comment)' : 'Hô Sell (Comment)';
      else if (source === 'action') label = side === 'bull' ? 'Thắp Nhang Gồng Buy' : 'Gõ Mõ Đè Sell';
      else if (source === 'gift') label = side === 'bull' ? 'Tiếp Lực Bò Xanh' : 'Tiếp Lực Gấu Đỏ';
      else label = side === 'bull' ? '🟢 Gồng tiếp' : '☕ Đứng ngoài';
    }

    this.lastAction = {
      side,
      userId: uid,
      nickname,
      powerAdded: safePower,
      label,
      source,
      timestamp: Date.now()
    };

    // Calculate impulse delta: alpha = 0.05
    const impulse = (side === 'bull' ? safePower : -safePower) * 0.05;
    this.ropePosition = Math.min(100, Math.max(-100, Math.round((this.ropePosition + impulse) * 10) / 10));

    // Knockout check: instant win if reaches +100 or -100
    if (this.ropePosition >= 100 || this.ropePosition <= -100) {
      const res = this.finish();
      return { ok: true, finished: true, result: res, state: this.getState() };
    }

    return { ok: true, finished: false, pull: this.lastAction, state: this.getState() };
  }

  tick(deltaSec = 1) {
    if (this.status !== 'active') return null;

    this.timeLeftSec = Math.max(0, this.timeLeftSec - deltaSec);

    // Natural friction towards 0: beta = 0.02
    const friction = this.ropePosition * 0.02;
    this.ropePosition = Math.min(100, Math.max(-100, Math.round((this.ropePosition - friction) * 10) / 10));

    // Finish when timer ends or knockout reached
    if (this.timeLeftSec <= 0 || this.ropePosition >= 100 || this.ropePosition <= -100) {
      return this.finish();
    }

    return this.getState();
  }

  finish() {
    this.status = 'finished';

    let winner;
    if (this.ropePosition >= 80) winner = 'bull';
    else if (this.ropePosition <= -80) winner = 'bear';
    else if (Math.abs(this.ropePosition) <= 15) winner = 'draw';
    else winner = this.ropePosition > 0 ? 'bull' : 'bear';

    // Find MVP from winning side
    let mvp = null;
    const allContribs = [...this.contributors.values()];
    if (allContribs.length > 0) {
      allContribs.sort((a, b) => {
        const pA = winner === 'bull' ? a.bullPower : winner === 'bear' ? a.bearPower : a.totalPower;
        const pB = winner === 'bull' ? b.bullPower : winner === 'bear' ? b.bearPower : b.totalPower;
        return pB - pA;
      });
      const top = allContribs[0];
      const winPower = winner === 'bull' ? top.bullPower : winner === 'bear' ? top.bearPower : top.totalPower;

      // Assign honorary title based on side and contribution power
      let titleObj;
      if (winner === 'bull') {
        const sorted = [...BULL_HONORARY_TITLES].sort((a, b) => b.minPower - a.minPower);
        titleObj = sorted.find(t => winPower >= t.minPower) || sorted.at(-1);
      } else if (winner === 'bear') {
        const sorted = [...BEAR_HONORARY_TITLES].sort((a, b) => b.minPower - a.minPower);
        titleObj = sorted.find(t => winPower >= t.minPower) || sorted.at(-1);
      } else {
        titleObj = DRAW_HONORARY_TITLES[Math.floor(Math.random() * DRAW_HONORARY_TITLES.length)];
      }

      mvp = {
        userId: top.userId,
        nickname: top.nickname,
        avatar: top.avatar,
        contributedPower: winPower,
        title: titleObj.title,
        badge: titleObj.badge
      };
    } else {
      const defaultTitle = winner === 'bull' ? 'Chúa Tể Bắt Đáy' : winner === 'bear' ? 'Chiến Thần Gồng Lỗ' : 'Đại Sứ Hòa Bình';
      mvp = { userId: 'trader_mvp', nickname: 'Chiến Thần Vô Danh', contributedPower: 0, title: defaultTitle, badge: '⭐' };
    }

    let headline;
    if (winner === 'bull') {
      headline = BULL_VICTORY_HEADLINES[Math.floor(Math.random() * BULL_VICTORY_HEADLINES.length)];
    } else if (winner === 'bear') {
      headline = BEAR_VICTORY_HEADLINES[Math.floor(Math.random() * BEAR_VICTORY_HEADLINES.length)];
    } else {
      headline = DRAW_VICTORY_HEADLINES[Math.floor(Math.random() * DRAW_VICTORY_HEADLINES.length)];
    }

    this.result = {
      roundId: this.roundId,
      winner,
      finalPosition: this.ropePosition,
      bullTotalPower: this.bullPower,
      bearTotalPower: this.bearPower,
      mvp,
      headline
    };

    return this.result;
  }

  getState() {
    return {
      roundId: this.roundId,
      status: this.status,
      timeLeftSec: this.timeLeftSec,
      bullPower: this.bullPower,
      bearPower: this.bearPower,
      ropePosition: this.ropePosition,
      lastAction: this.lastAction,
      result: this.result
    };
  }
}

// 2. WheelOfFate Engine (Vòng Xoay Định Mệnh)
export class WheelOfFate {
  constructor(options = {}) {
    this.slots = WHEEL_SLOTS;
    this.userCooldowns = new Map(); // userId -> timestamp
    this.cooldownMs = Number(options.cooldownMs) || 25000; // 25s default cooldown
    this.recentSpins = [];
  }

  resetCooldown(userId) {
    if (userId) this.userCooldowns.delete(userId);
    else this.userCooldowns.clear();
  }

  cleanup() {
    const now = Date.now();
    for (const [uid, at] of this.userCooldowns) {
      if (now - at > 300000) this.userCooldowns.delete(uid);
    }
  }

  spin(user = {}) {
    const uid = String(user.userId || user.id || 'trader_' + randomUUID().slice(0, 4));
    const nickname = String(user.nickname || user.name || 'Trader Ẩn Danh').slice(0, 40);
    const avatar = String(user.avatar || '');

    // Check cooldown
    const now = Date.now();
    const lastSpin = this.userCooldowns.get(uid) || 0;
    const elapsed = now - lastSpin;
    if (elapsed < this.cooldownMs) {
      const waitSec = Math.ceil((this.cooldownMs - elapsed) / 1000);
      const err = new Error(`Quay quá nhanh! Vui lòng chờ ${waitSec} giây để tĩnh tâm.`);
      err.status = 429;
      err.waitSec = waitSec;
      throw err;
    }

    this.userCooldowns.set(uid, now);

    // Weighted random selection: total weight = 100
    const totalWeight = this.slots.reduce((sum, s) => sum + s.weight, 0);
    let rand = Math.random() * totalWeight;
    let selectedSlot = this.slots[0];

    for (const slot of this.slots) {
      if (rand < slot.weight) {
        selectedSlot = slot;
        break;
      }
      rand -= slot.weight;
    }

    // Target angle physics: theta = 360 * N + slotAngle + randomOffset(-15, 15)
    // 8 slots, each 45 degrees. Center of slot i is i * 45 + 22.5
    const slotAngle = selectedSlot.index * 45 + 22.5;
    const turns = 5 + Math.floor(Math.random() * 4); // 5 to 8 turns
    const offset = Math.round((Math.random() * 30 - 15) * 10) / 10;
    const finalAngle = Math.round((360 * turns + slotAngle + offset) * 10) / 10;

    const spinId = `spin_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    const result = {
      spinId,
      userId: uid,
      nickname,
      avatar,
      slotIndex: selectedSlot.index,
      slotKey: selectedSlot.key,
      title: selectedSlot.title,
      pointsAwarded: selectedSlot.points,
      finalAngle,
      quote: selectedSlot.quote,
      soundEffect: selectedSlot.soundEffect,
      timestamp: now
    };

    this.recentSpins.unshift(result);
    if (this.recentSpins.length > 20) this.recentSpins.pop();

    return result;
  }
}

// 3. LiquiditySiren Engine (Còi Báo Động Quét Thanh Khoản)
export class LiquiditySiren {
  constructor(options = {}) {
    this.active = false;
    this.alertId = null;
    this.level = 'critical';
    this.durationMs = 15000;
    this.startTime = null;
    this.headline = '🚨 BÁO ĐỘNG ĐỎ CẤP 12: QUÉT THANH KHOẢN HAI ĐẦU!';
    this.subtext = 'Cá mập vào vùng nước trũng. Đề nghị rút dây mạng hoặc ngồi thiền tuyệt đối!';
    this.action = 'wick_hunt';
    this.activeUsersTargeted = 42;
    this.stopLossClicks = new Map(); // userId -> { clicks, achievedBadge }
    this.timer = null;
    this.onAutoResolve = options.onAutoResolve || null;
  }

  trigger(options = {}) {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.active = true;
    this.alertId = `alert_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    this.durationMs = Math.max(5000, Number(options.durationMs) || 15000);
    this.headline = options.headline || '🚨 BÁO ĐỘNG ĐỎ CẤP 12: QUÉT THANH KHOẢN HAI ĐẦU!';
    const reasonText = options.reason ? `Lý do: ${options.reason}. ` : '';
    this.subtext = options.subtext || (reasonText + 'Cá mập vào vùng nước trũng. Đề nghị rút dây mạng hoặc ngồi thiền tuyệt đối!');
    this.activeUsersTargeted = Number(options.activeUsersTargeted) || 42;
    this.stopLossClicks.clear();
    this.startTime = Date.now();

    // Auto resolve after durationMs
    this.timer = setTimeout(() => {
      const peace = this.resolve();
      if (typeof this.onAutoResolve === 'function') {
        this.onAutoResolve(peace);
      }
    }, this.durationMs);

    return {
      alertId: this.alertId,
      level: this.level,
      durationMs: this.durationMs,
      headline: this.headline,
      subtext: this.subtext,
      action: this.action,
      activeUsersTargeted: this.activeUsersTargeted,
      startTime: this.startTime
    };
  }

  recordHoldStopLoss(userId) {
    if (!this.active) {
      return { ok: false, error: 'Không có báo động quét thanh khoản nào đang diễn ra.' };
    }

    const uid = String(userId || 'anonymous');
    let record = this.stopLossClicks.get(uid);
    if (!record) {
      record = { clicks: 0, achievedBadge: false };
      this.stopLossClicks.set(uid, record);
    }
    record.clicks++;
    const achieved = record.clicks >= 15;
    record.achievedBadge = achieved;

    return {
      ok: true,
      userId: uid,
      clicks: record.clicks,
      achievedBadge: achieved,
      points: achieved ? 50 : 0
    };
  }

  resolve() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.active = false;
    const survivorCount = [...this.stopLossClicks.values()].filter(r => r.achievedBadge).length;

    return {
      alertId: this.alertId,
      active: false,
      headline: 'Bão đã tan! Chúc mừng các đạo hữu kiên cường còn sống sót trên bờ!',
      sound: 'bell',
      survivorCount,
      durationMs: 0
    };
  }

  getState() {
    const elapsed = this.startTime ? Date.now() - this.startTime : 0;
    const timeLeftMs = this.active ? Math.max(0, this.durationMs - elapsed) : 0;
    return {
      active: this.active,
      alertId: this.alertId,
      level: this.level,
      durationMs: this.durationMs,
      headline: this.headline,
      subtext: this.subtext,
      action: this.action,
      activeUsersTargeted: this.activeUsersTargeted,
      timeLeftMs
    };
  }

  close() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.active = false;
  }
}

// 4. NewsTicker Engine (Bản Tin Nóng Phố Wall Đu Đỉnh)
export class NewsTicker {
  constructor(options = {}) {
    this.templates = [...NEWS_TEMPLATES];
    this.defaultTraders = ['Hoàng Nam', 'Mai Hoa', 'Trần Tuấn', 'Chiến Thần Xanh', 'Thánh Bắt Đáy', 'Cao Thủ Gồng Lỗ'];
    this.latestFlash = null;
  }

  getTickerItems(activeTraders = [], roomId = 'general') {
    const traders = Array.isArray(activeTraders) && activeTraders.length > 0 ? activeTraders : this.defaultTraders;
    const items = [...MARKET_TICKER_LABELS];

    // Pick 5 random satirical headlines
    const shuffled = [...this.templates].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5);

    for (const tpl of selected) {
      const randomTrader = traders[Math.floor(Math.random() * traders.length)];
      const headline = tpl.replace(/\{trader\}/g, randomTrader).replace(/\{roomId\}/g, roomId);
      items.push(headline);
    }

    return items;
  }

  flashNews(customHeadline = null, traderName = null, durationMs = 6000) {
    const trader = traderName || this.defaultTraders[Math.floor(Math.random() * this.defaultTraders.length)];
    let headline = customHeadline;

    if (!headline) {
      const template = this.templates[Math.floor(Math.random() * this.templates.length)];
      headline = template.replace(/\{trader\}/g, trader).replace(/\{roomId\}/g, 'Xóm Trade');
    } else {
      headline = headline.replace(/\{trader\}/g, trader).replace(/\{roomId\}/g, 'Xóm Trade');
    }

    const newsId = `news_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const flash = {
      newsId,
      mode: 'popup',
      headline,
      traderName: trader,
      durationMs: Number(durationMs) || 6000,
      sound: 'fanfare',
      timestamp: Date.now()
    };

    this.latestFlash = flash;
    return flash;
  }
}

// 5. Consolidated ViralEngine Orchestrator
export class ViralEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.tug = new TugOfWar(options.tug);
    this.wheel = new WheelOfFate(options.wheel);
    this.siren = new LiquiditySiren({
      ...options.siren,
      onAutoResolve: peace => {
        this.emit('siren_resolved', peace);
        this.emit('change');
      }
    });
    this.news = new NewsTicker(options.news);
    this.tickInterval = null;
    this.detectCommentIntent = detectCommentIntent;

    this.startLoop();
  }

  startLoop() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = setInterval(() => {
      if (this.tug.status === 'active') {
        const tickRes = this.tug.tick(0.5);
        if (tickRes && tickRes.winner) {
          // Finished on this tick
          this.emit('tug_result', tickRes);
          this.emit('change');
        } else {
          this.emit('tug_tick', this.tug.getState());
        }
      }
    }, 500);
  }

  getState(activeTraders = [], roomId = 'general') {
    return {
      tug: this.tug.getState(),
      wheel: {
        slots: this.wheel.slots,
        recentSpins: this.wheel.recentSpins
      },
      siren: this.siren.getState(),
      news: {
        ticker: this.news.getTickerItems(activeTraders, roomId),
        latestFlash: this.news.latestFlash
      },
      professorDog: {
        quotes: PROFESSOR_DOG_QUOTES
      }
    };
  }

  cleanup() {
    this.wheel.cleanup();
  }

  close() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.siren.close();
  }
}
