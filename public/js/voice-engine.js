/**
 * VIETNAMESE INTELLIGENT VOICE ENGINE (TTS) FOR TIKTOK LIVE OVERLAY & COCKPIT
 * ============================================================================
 * Architecture:
 * - W3C Web Speech API (window.speechSynthesis) with native Vietnamese voices.
 * - Intelligent voice resolution: prioritizes Natural/Online Vietnamese neural voices (vi-VN).
 * - Multi-gender & character voice profiles: Temple Priestess (Female), Zen Master (Male), Professor Dog (High pitch).
 * - Smart Priority Queue with Anti-Flood & Debounce Coalescing:
 *     Priority 1: Gift / Rose / Donation (Urgent, can preempt/duck)
 *     Priority 2: Follow (High priority)
 *     Priority 3: Join / Guest welcome (Debounced & coalesced for viral bursts)
 *     Priority 4: Professor Dog / Idle commentary (Background only)
 * - Web Audio BGM Ducking: automatically signals ducking start/end to dip background music.
 * - Audio Chime Fallback: harmonic Web Audio synthesis when TTS is unsupported.
 */

// --- Cultural & Sarcastic Xóm Trade / Động Đu Chart Livestream Templates ---
export const WELCOME_TEMPLATES = [
  'A lô a lô! Chào mừng trader {name} đã kéo ghế vào Động Đu Chart Xóm Trade!',
  'Nhiệt liệt chào đón cao thủ {name} đã gia nhập Xóm Trade Động Đu Chart, chuẩn bị vào lệnh!',
  'Hoan hô anh em {name} vừa ghé thăm Động Đu Chart, kéo ghế ngồi đàng hoàng chúc gồng lệnh xanh mướt!',
  'Động Đu Chart xin chào {name}, chúc anh em tâm bất biến giữa dòng nến vạn biến!',
  'Chào mừng {name} đã kéo ghế vào Xóm Trade, trà đá thuốc lào sẵn sàng, cùng nhau soi chart!'
];

export const FOLLOW_TEMPLATES = [
  'Cảm ơn trader {name} đã bấm theo dõi kênh! Chúc anh em gồng lệnh tất thắng, xanh tài khoản!',
  'Cả Xóm Trade cảm ơn {name} vừa bấm follow Động Đu Chart, chúc vào lệnh chuẩn từng pip!',
  'Trưởng thôn cảm ơn người anh em {name} đã theo dõi kênh, lệnh nào chốt cũng ngay đỉnh!',
  'Tuyệt vời quá! Cảm ơn {name} đã follow Động Đu Chart, né sạch bão giá, bú đẫm lợi nhuận!',
  'Chào mừng bạn {name} đã theo dõi Động Đu Chart! Chúc bạn trade đâu thắng đó, vạn dặm bình an!'
];

export const THOUSAND_LIKES_TEMPLATES = [
  'Cả Xóm Trade xin gửi lời cảm ơn chân thành tới bạn {name} đã thả hơn {count} tim trợ lực cho anh em! Năng lượng dồi dào, chúc bạn vào lệnh chuẩn từng pip, chốt lời rực rỡ và luôn ngập tràn niềm vui!',
  'Tuyệt vời quá! Trân trọng cảm ơn {name} đã gửi tặng hơn {count} tim yêu thương cho Động Đu Chart! Chúc tài khoản của bạn luôn xanh mướt, né sạch bão giá và gặt hái thành công lớn!',
  'Xóm Trade vạn lời cảm ơn bạn {name} với hơn {count} tim tuyệt đỉnh! Có bạn đồng hành thì nến xanh chọc trời, chúc bạn trade đâu thắng đó!',
  'Cảm ơn người bạn tri kỷ {name} đã thả hơn {count} tim tiếp sức cho cả xóm! Chúc bạn tâm luôn tĩnh, lệnh luôn xanh, tài lộc dồi dào!'
];

export const GIFT_TEMPLATES = [
  'Cả Xóm Trade xin cảm ơn anh em {name} đã bắn {count} {giftName}, uy lực ngút ngàn!',
  'Trưởng thôn cảm ơn tấm lòng của {name} đã gửi tặng {count} {giftName}, chúc gồng lãi bất tử!',
  'Rực rỡ quá! Cảm ơn {count} {giftName} từ {name}, chúc anh em tài lộc dồi dào, bú đẫm pip!',
  'Cảm ơn đại gia {name} đã gửi {count} {giftName} cổ vũ Xóm Trade, lệnh nào cũng thắng lớn!'
];

export const GIFT_TIER_TEMPLATES = [
  {
    minCoins: 500,
    templates: [
      'ĐẠI LỄ PHONG THẦN! Ngưỡng mộ chủ tịch {name} vừa bùng nổ {count} {giftName} trị giá {coins} xu! Cả Xóm Trade đồng thanh chúc đại gia chốt lãi chọc nóc!',
      'CHẤN ĐỘNG SÀN GIAO DỊCH! Đại gia {name} vừa tung {count} {giftName} với {coins} xu vàng rực rỡ, lực gồng lệnh tăng tối đa!'
    ]
  },
  {
    minCoins: 100,
    templates: [
      'Rung chuông ngân vang! Trân trọng cảm ơn đại gia {name} vừa tiếp lửa {count} {giftName} trị giá {coins} xu cho anh em Xóm Trade!',
      'Đỉnh cao phong độ! Siêu đại gia {name} vừa gửi {count} {giftName} tiếp thêm {coins} xu, chúc bạn lệnh nào cũng xanh mướt!'
    ]
  },
  {
    minCoins: 10,
    templates: [
      'Xóm Trade cảm ơn {name} đã gửi tặng {count} {giftName} kèm {coins} xu lấy vía chốt lời rực rỡ!',
      'Lộc về rồi! Cảm ơn hảo huynh đệ {name} vừa ủng hộ {count} {giftName} tương đương {coins} xu, nến xanh mở lối!'
    ]
  }
];

export const COALESCED_JOIN_TEMPLATES = [
  'Chào mừng {names} và các anh em mới đã kéo ghế vào Động Đu Chart cùng trade!',
  'Xóm Trade nồng nhiệt chào đón {names} cùng kéo ghế ngồi soi chart, săn sóng lớn!',
  'Động Đu Chart xin chào {names} và anh em vừa vào phòng live, cùng nhau gồng lệnh!'
];

export const COALESCED_FOLLOW_TEMPLATES = [
  'Cảm ơn {names} đã cùng nhấn theo dõi Động Đu Chart! Chúc cả xóm vạn sự như ý!',
  'Cả xóm cảm ơn {names} vừa follow kênh! Chúc anh em gồng lệnh xanh mướt, chốt lời rực rỡ!'
];

export const PROF_DOG_TEMPLATES = [
  'Trưởng thôn Cún phán: Jesse Livermore dạy rồi, tiền kiếm được từ việc kiên nhẫn ngồi chờ, chứ không phải cào phím vào lệnh liên tục!',
  'Trưởng thôn Cún phán: CZ Binance dặn rồi, If you cannot hold, you will not be rich! Không gồng được thì đừng mơ làm đại gia!',
  'Trưởng thôn Cún phán: Jesse Livermore bảo: Đừng bao giờ cãi nhau với bảng nến! Thị trường không bao giờ sai, chỉ có trò là sai!',
  'Trưởng thôn Cún phán: CZ dặn con số 4 thần thánh! Bỏ qua mọi FUD và tiếng ồn cá mập, tập trung soi chart và bảo vệ tài khoản!',
  'Trưởng thôn Cún phán: George Soros dạy: Đúng hay sai không quan trọng, quan trọng là lúc đúng ăn bao nhiêu pip, lúc sai mất bao nhiêu!',
  'Trưởng thôn Cún phán: Paul Tudor Jones bảo: Losers average losers! Gồng lỗ là dở rồi, lại còn nhồi thêm lệnh là chuẩn bị ra đảo!',
  'Trưởng thôn Cún phán: Warren Buffett dạy: Nguyên tắc số 1 là không để cháy tài khoản, nguyên tắc số 2 là xem lại nguyên tắc số 1!',
  'Trưởng thôn Cún phán: Satoshi Nakamoto nhắn: Nếu anh em không hiểu hoặc không tin, tôi không có thời gian giải thích đâu!',
  'Trưởng thôn Cún phán: Mark Minervini dạy: Thà cắt lỗ nhỏ như muỗi cắn mười pip, còn hơn để cá mập cắn đứt cả tài khoản!',
  'Trưởng thôn Cún phán: Thầy bảo nến búa rút chân, các ông lại tưởng búa đập vỡ tài khoản!',
  'Trưởng thôn Cún phán: Sóng Elliot đếm một hai ba bốn năm, đếm xong tiền ví về số không!',
  'Trưởng thôn Cún phán: Phân kỳ RSI ba đoạn rõ mồn một, mà anh em vẫn cố cãi thầy nhồi lệnh!',
  'Trưởng thôn Cún phán: Cản MA hai trăm cứng như bê tông, đâm đầu vào chỉ có mẻ trán thôi!',
  'Trưởng thôn Cún phán: Cắt lỗ ngay đáy chuẩn sách giáo khoa, vừa buông tay là nến dựng cột!',
  'Trưởng thôn Cún phán: Chốt non không chấm năm pip ăn bát mì tôm, nhìn nến bay tiếp một trăm pip mà rớt nước mắt!',
  'Trưởng thôn Cún phán: Kéo ghế vào Xóm Trade mà gồng lỗ bất tử là cụ tổ quở đấy nhé!'
];

export const FORTUNE_POEM_TEMPLATES = [
  'Lời dạy số {number} từ huyền thoại Jesse Livermore: {title}. Thị trường không bao giờ sai, chỉ có ý kiến của trader là sai. Tiền kiếm được là nhờ kiên nhẫn ngồi yên trên ghế trade.',
  'Lời khuyên số {number} từ CZ Binance: {title}. If you can not hold, you will not be rich. Luôn nhớ quy tắc số 4: bỏ ngoài tai mọi FUD và tiếng ồn, tập trung bảo vệ tài khoản.',
  'Lời dạy số {number} từ bậc thầy George Soros: {title}. Đúng hay sai không quyết định thành bại. Quyết định nằm ở việc bạn kiếm được bao nhiêu khi đúng và mất bao nhiêu khi sai.',
  'Lời dạy số {number} từ Warren Buffett: {title}. Nguyên tắc số một: không bao giờ để cháy tài khoản. Nguyên tắc số hai: đừng bao giờ quên nguyên tắc một.',
  'Lời cảnh báo số {number} từ Paul Tudor Jones: {title}. Losers average losers! Đừng bao giờ bình quân giá xuống khi đang gồng lỗ. Bảo vệ vốn là sinh mạng của trader.',
  'Quẻ số {number}: {title}. Nến xanh mở lối đón xuân sang. Thong dong chốt lãi dạ hân hoan. Kéo ghế vững vàng đừng nao núng. Vạn sự hanh thông lộc ngút ngàn.',
  'Quẻ số {number}: {title}. Sóng gió thương trường mặc bão giông. Kéo ghế ngồi trade tựa gương trong. Lệnh thuận xu hướng âu thời thế. Rực rỡ hoa tiêu đắc vạn đồng.'
];

export const TRADER_LEGENDS_QUOTES = [
  { author: 'Jesse Livermore', text: 'Tiền kiếm được từ việc kiên nhẫn ngồi chờ, không phải từ việc cào phím vào lệnh liên tục!' },
  { author: 'CZ Binance', text: 'If you can not hold, you will not be rich! Không gồng được thì đừng mơ làm đại gia!' },
  { author: 'Jesse Livermore', text: 'Đừng bao giờ tranh cãi với bảng nến. Thị trường luôn luôn đúng, kẻ sai luôn là chính bạn!' },
  { author: 'CZ Binance', text: 'Số 4 thần thánh: Hãy bỏ qua FUD và mọi tiếng ồn thị trường, tập trung quản trị vốn và soi chart!' },
  { author: 'George Soros', text: 'Đúng hay sai không quan trọng, quan trọng là lúc đúng ăn được bao nhiêu và lúc sai mất bao nhiêu!' },
  { author: 'Warren Buffett', text: 'Nguyên tắc số 1: Không bao giờ để cháy tài khoản. Nguyên tắc số 2: Đừng quên nguyên tắc số 1!' },
  { author: 'Paul Tudor Jones', text: 'Losers average losers - Đừng bao giờ nhồi thêm lệnh khi đang gồng lỗ!' },
  { author: 'Satoshi Nakamoto', text: 'Nếu anh em không tin hoặc không hiểu, tôi thực sự không có thời gian giải thích đâu!' },
  { author: 'Mark Minervini', text: 'Cắt lỗ nhỏ và nhanh là chiếc áo giáp duy nhất của trader trên chiến trường tài chính!' }
];

// Pure Template Formatting Helpers (unit-testable in Node)
export function getRandomItem(arr) {
  if (!arr || !arr.length) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

export function formatWelcomeText(nickname) {
  const tpl = getRandomItem(WELCOME_TEMPLATES);
  return tpl.replace('{name}', nickname || 'Huynh Đệ');
}

export function formatFollowText(nickname) {
  const tpl = getRandomItem(FOLLOW_TEMPLATES);
  return tpl.replace('{name}', nickname || 'Huynh Đệ');
}

export function formatThousandLikesText(nickname, count = 1000) {
  const tpl = getRandomItem(THOUSAND_LIKES_TEMPLATES);
  const formattedCount = Number(count).toLocaleString('vi-VN');
  return tpl.replace('{name}', nickname || 'Huynh Đệ').replace('{count}', formattedCount);
}

export function formatSolemnLegendText(author = '', text = '') {
  const a = String(author).toLowerCase();
  if (a.includes('cz') || a.includes('triệu')) {
    return `Tôi là Triệu Trường Bằng, hay còn gọi là CZ Binance! Tôi xin trịnh trọng truyền đạt tới toàn thể anh em Xóm Trade: If you cannot hold, you will not be rich! Không gồng được thì đừng mơ làm đại gia! Hãy luôn ghi nhớ điều số 4!`;
  }
  if (a.includes('livermore')) {
    return `Tôi là Jesse Livermore, đại hiệp đầu cơ phố Wall! Tôi xin nghiêm túc căn dặn các con bạc khát nước: Tiền kiếm được từ việc kiên nhẫn ngồi yên chờ đợi, không phải cào phím mỗi phút! Đừng bao giờ cãi lại bảng nến!`;
  }
  if (a.includes('soros')) {
    return `Tôi là George Soros, kẻ bẻ gãy ngân hàng trung ương! Hãy lắng nghe chân lý tối thượng này: Đúng hay sai không quan trọng, quan trọng là lúc đúng anh em ăn bao nhiêu tiền, và lúc sai có chịu cắt lỗ hay không!`;
  }
  if (a.includes('buffett')) {
    return `Tôi là Warren Buffett, nhà tiên tri xứ Omaha! Tôi xin long trọng nhắc nhở anh em Xóm Trade hai nguyên tắc vàng: Nguyên tắc 1, tuyệt đối không để cháy tài khoản! Nguyên tắc 2, đừng bao giờ quên nguyên tắc 1!`;
  }
  if (a.includes('powell') || a.includes('fed')) {
    return `Tôi là Jerome Powell, Chủ tịch Cục Dự trữ Liên bang Mỹ FED! Tôi xin nghiêm túc tuyên bố: Thấy toàn thể anh em trader Việt Nam vừa All-in lệnh Buy, chúng tôi quyết định hoãn giảm lãi suất!`;
  }
  if (a.includes('satoshi')) {
    return `Tôi là Satoshi Nakamoto, cha đẻ ẩn danh của Bitcoin! Tôi xin nghiêm nghị thông báo: Nếu anh em không tin hoặc không hiểu, tôi thực sự không có thời gian giải thích đâu!`;
  }
  if (a.includes('paul') || a.includes('tudor')) {
    return `Tôi là Paul Tudor Jones, bậc thầy phòng hộ rủi ro! Tôi xin nghiêm khắc cảnh báo: Kẻ thua lỗ mới nhồi thêm lệnh khi đang gồng lỗ! Losers average losers!`;
  }
  return `Tôi là ${author}! Tôi xin nghiêm túc và trịnh trọng truyền dạy tới anh em: ${text}`;
}

export function formatGiftText(nickname, giftName = 'bông hoa', count = 1, coins = 0) {
  const name = nickname || 'Đại Gia';
  const rawName = String(giftName || 'bông hoa').trim();
  const normalizedGift = rawName.toLowerCase();
  const isRose = normalizedGift === 'rose' || normalizedGift.includes('hoa hồng') || normalizedGift.includes('hoa hong');
  const gift = isRose ? 'đóa hoa hồng' : rawName;
  const totalCoins = Math.max(0, Number(coins) || 0);
  const tier = GIFT_TIER_TEMPLATES.find(t => totalCoins >= t.minCoins);
  const tpl = getRandomItem(tier ? tier.templates : GIFT_TEMPLATES);
  return tpl
    .replace('{name}', name)
    .replace('{giftName}', gift)
    .replace('{count}', count > 1 ? count : 'một')
    .replace('{coins}', totalCoins.toLocaleString('vi-VN'));
}

export function formatCoalescedJoins(names) {
  if (!names || !names.length) return '';
  if (names.length === 1) return formatWelcomeText(names[0]);
  const formattedNames = names.length === 2 ? `${names[0]} và ${names[1]}` : `${names[0]}, ${names[1]} cùng ${names.length - 2} anh em khác`;
  const tpl = getRandomItem(COALESCED_JOIN_TEMPLATES);
  return tpl.replace('{names}', formattedNames);
}

export function formatCoalescedFollows(names) {
  if (!names || !names.length) return '';
  if (names.length === 1) return formatFollowText(names[0]);
  const formattedNames = names.length === 2 ? `${names[0]} và ${names[1]}` : `${names[0]}, ${names[1]} cùng ${names.length - 2} anh em khác`;
  const tpl = getRandomItem(COALESCED_FOLLOW_TEMPLATES);
  return tpl.replace('{names}', formattedNames);
}

export function cleanSpeechText(text) {
  if (!text) return '';
  // Clean emoji, special markdown asterisks and repetitive punctuation for smooth speech
  return text
    .replace(/[#*_`~]/g, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Intelligent Voice Resolution Heuristics
 * Analyzes available browser speech synthesis voices to find the most natural Vietnamese voice.
 */
export function resolveBestVietnameseVoice(voices = [], mode = 'auto') {
  if (!voices || !voices.length) return null;

  // Filter Vietnamese voices
  const viVoices = voices.filter(v => {
    const lang = (v.lang || '').toLowerCase();
    const name = (v.name || '').toLowerCase();
    return lang.startsWith('vi') || lang.includes('vn') || name.includes('vietnam') || name.includes('tiếng việt');
  });

  if (!viVoices.length) {
    // If no Vietnamese voice is available, return default voice
    return voices.find(v => v.default) || voices[0];
  }

  // If female preferred
  if (mode === 'female') {
    const female = viVoices.find(v => {
      const name = v.name.toLowerCase();
      return name.includes('hoaimy') || name.includes('linh') || name.includes('mai') || name.includes('female') || name.includes('nữ');
    });
    if (female) return female;
  }

  // If male preferred
  if (mode === 'male') {
    const male = viVoices.find(v => {
      const name = v.name.toLowerCase().replace(/vietnam|việt nam/g, '');
      return name.includes('namminh') || name.includes('minh') || name.includes('male') || /\bnam\b/.test(name);
    });
    if (male) return male;
  }

  // Auto mode: Ưu tiên tuyệt đối giọng chuẩn ban đầu (Microsoft Hoài My Online Natural / Google Tiếng Việt)
  const hoaiMy = viVoices.find(v => v.name.toLowerCase().includes('hoaimy'));
  if (hoaiMy) return hoaiMy;

  const googleVi = viVoices.find(v => {
    const n = v.name.toLowerCase();
    return n.includes('google') && (n.includes('tiếng việt') || n.includes('vietnam') || (v.lang && v.lang.toLowerCase().startsWith('vi')));
  });
  if (googleVi) return googleVi;

  const naturalVi = viVoices.find(v => {
    const name = v.name.toLowerCase();
    return name.includes('natural') || name.includes('online') || name.includes('neural');
  });
  if (naturalVi) return naturalVi;

  return viVoices[0];
}

/**
 * Main Factory: createVoiceEngine
 */
export function createVoiceEngine(options = {}) {
  const {
    onDucking = () => {},
    onStateChange = () => {},
    audioContext = null,
    defaultVolume = 0.9,
    defaultRate = 1.0,
    defaultPitch = 1.0,
    enabled = true
  } = options;

  let isEnabled = enabled;
  let volume = defaultVolume;
  let rate = defaultRate;
  let pitch = defaultPitch;
  let voiceMode = 'auto'; // 'auto' | 'female' | 'male' | 'dog'
  let engineMode = 'neural'; // 'neural' (Microsoft Edge Neural via /api/tts) | 'browser' (window.speechSynthesis)
  let activeUtterance = null;
  let activeAudio = null;
  let audioWatchdogTimer = null;
  let isSpeaking = false;
  let currentSpeechText = '';
  let currentSpeechCategory = '';
  let currentSpeechPriority = 3;

  function cleanupAudioElement(audio) {
    if (!audio) return;
    audio.__cancelled = true;
    audio.onended = null;
    audio.onerror = null;
    audio.onplaying = null;
    audio.onloadedmetadata = null;
    try {
      audio.pause();
      if (typeof audio.removeAttribute === 'function') audio.removeAttribute('src');
      else audio.src = '';
      if (typeof audio.load === 'function') audio.load();
    } catch {}
  }

  function clearSpeechWatchdog() {
    if (audioWatchdogTimer) {
      clearTimeout(audioWatchdogTimer);
      audioWatchdogTimer = null;
    }
  }

  // Priority Queue: Array of { id, text, priority, category, rate, pitch, onEnd }
  // Priority: 1 = Gift, 2 = Follow, 3 = Join, 4 = Dog/Idle
  const queue = [];

  // Debouncing / Coalescing buffers
  const pendingJoins = [];
  let joinDebounceTimer = null;
  const pendingFollows = [];
  let followDebounceTimer = null;

  // Synthesis voices
  let availableVoices = [];
  let selectedVoice = null;
  let manualVoiceName = null;
  let lastSpokenText = '';
  let lastSpokenTime = 0;

  function loadVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      availableVoices = window.speechSynthesis.getVoices() || [];
      if (manualVoiceName) {
        selectedVoice = availableVoices.find(v => v.name === manualVoiceName) || resolveBestVietnameseVoice(availableVoices, voiceMode);
      } else {
        selectedVoice = resolveBestVietnameseVoice(availableVoices, voiceMode);
      }
      notifyState();
    } catch (e) {
      console.warn('VoiceEngine loadVoices error:', e);
    }
  }

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }

  function notifyState() {
    let resolvedName = 'Hệ thống tự động';
    if (engineMode === 'neural') {
      resolvedName = voiceMode === 'male' 
        ? 'Microsoft Nam Minh (Neural - Nam)' 
        : 'Microsoft Hoài My (Neural - Nữ)';
    } else if (selectedVoice) {
      resolvedName = `${selectedVoice.name} (${selectedVoice.lang})`;
    }
    onStateChange({
      enabled: isEnabled,
      engine: engineMode,
      isSpeaking,
      currentText: currentSpeechText,
      queueLength: queue.length,
      voiceName: resolvedName,
      voiceCount: availableVoices.length,
      mode: voiceMode,
      volume,
      rate,
      pitch
    });
  }

  function triggerFallbackTone(category) {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = audioContext || new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq = category === 'gift' ? 880 : category === 'follow' ? 660 : 523.25;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.15);

      gain.gain.setValueAtTime(0.3 * volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } catch {}
  }

  function processQueue() {
    if (!isEnabled || isSpeaking || queue.length === 0) return;

    // Sort queue by priority ascending (1 = highest priority)
    queue.sort((a, b) => a.priority - b.priority);
    const item = queue.shift();
    if (!item) return;

    const cleanedText = cleanSpeechText(item.text);
    if (!cleanedText) {
      processQueue();
      return;
    }

    // Chống trùng lặp câu nói trong vòng 2.5s (tránh echo / chồng chéo tiếng)
    const now = Date.now();
    if (cleanedText === lastSpokenText && (now - lastSpokenTime) < 2500) {
      setTimeout(processQueue, 50);
      return;
    }
    lastSpokenText = cleanedText;
    lastSpokenTime = now;

    if (engineMode === 'neural' && typeof Audio !== 'undefined') {
      speakNeural(item, cleanedText);
    } else {
      speakBrowser(item, cleanedText);
    }
  }

  function speakNeural(item, cleanedText) {
    try {
      onDucking(true);
      isSpeaking = true;
      currentSpeechText = cleanedText;
      currentSpeechCategory = item.category || '';
      currentSpeechPriority = item.priority ?? 3;

      let voiceParam = 'hoaimy';
      if (item.voiceMode === 'male' || voiceMode === 'male' || (manualVoiceName && /nam/i.test(manualVoiceName))) {
        voiceParam = 'namminh';
      }

      const audioUrl = `/api/tts?text=${encodeURIComponent(cleanedText)}&voice=${encodeURIComponent(voiceParam)}`;

      if (activeAudio) {
        cleanupAudioElement(activeAudio);
        activeAudio = null;
      }

      const audio = new Audio(audioUrl);
      activeAudio = audio;
      audio.volume = Math.max(0, Math.min(1, volume));
      let completed = false;
      let fallbackStarted = false;
      let playbackStarted = false;

      const scheduleWatchdog = (ms, onExpire) => {
        clearSpeechWatchdog();
        audioWatchdogTimer = setTimeout(() => {
          audioWatchdogTimer = null;
          if (!completed && !audio.__cancelled && activeAudio === audio) {
            onExpire();
          }
        }, ms);
      };

      const finishSpeech = () => {
        if (completed || audio.__cancelled) return;
        completed = true;
        clearSpeechWatchdog();
        audio.onended = audio.onerror = audio.onplaying = audio.onloadedmetadata = null;
        if (activeAudio === audio) {
          activeAudio = null;
          isSpeaking = false;
          currentSpeechText = '';
          currentSpeechCategory = '';
          currentSpeechPriority = 3;
        }
        if (queue.length === 0) onDucking(false);
        notifyState();
        if (item.onEnd) item.onEnd();
        setTimeout(processQueue, 200);
      };

      // Both HTMLAudio's onerror and play().catch() can fire for the same
      // blocked/failed request.  Allow exactly one Browser-TTS fallback or
      // the same sentence is spoken twice on top of itself.
      const fallbackToBrowser = error => {
        if (fallbackStarted || completed || audio.__cancelled) return;
        fallbackStarted = true;
        console.warn('[VoiceEngine] Neural TTS fallback:', error);
        clearSpeechWatchdog();
        cleanupAudioElement(audio);
        if (activeAudio === audio) activeAudio = null;
        speakBrowser(item, cleanedText);
      };

      const armPlaybackWatchdog = () => {
        // Arm playback duration once streaming actually begins so network TTS
        // synthesis latency never truncates an active sentence mid-speech.
        const durationMs = (Number.isFinite(audio.duration) && audio.duration > 0)
          ? Math.ceil(audio.duration * 1000) + 4000
          : Math.max(8000, cleanedText.length * 200 + 5000);
        scheduleWatchdog(durationMs, () => {
          console.warn('[VoiceEngine] Audio playback watchdog timer fired, clearing speech');
          cleanupAudioElement(audio);
          finishSpeech();
        });
      };

      audio.onended = finishSpeech;
      audio.onerror = fallbackToBrowser;
      audio.onloadedmetadata = () => {
        if (playbackStarted) armPlaybackWatchdog();
      };
      audio.onplaying = () => {
        playbackStarted = true;
        armPlaybackWatchdog();
      };

      // Allow slow network/upstream Edge + Google fallback synthesis before falling back locally.
      scheduleWatchdog(18000, () => fallbackToBrowser(new Error('Audio load timeout')));

      // Soft harmonic chime for priority 1 & 2
      if (item.priority <= 2) {
        triggerFallbackTone(item.category);
      }

      notifyState();
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(fallbackToBrowser);
      }
    } catch (err) {
      console.warn('[VoiceEngine] speakNeural exception, falling back:', err);
      activeAudio = null;
      speakBrowser(item, cleanedText);
    }
  }

  function speakBrowser(item, cleanedText) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      isSpeaking = false;
      onDucking(false);
      notifyState();
      setTimeout(processQueue, 100);
      return;
    }

    try {
      onDucking(true);
      isSpeaking = true;
      currentSpeechText = cleanedText;
      currentSpeechCategory = item.category || '';
      currentSpeechPriority = item.priority ?? 3;

      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(cleanedText);
      activeUtterance = utterance;

      let voiceToUse = null;
      if (manualVoiceName) {
        voiceToUse = availableVoices.find(v => v.name === manualVoiceName);
      }
      if (!voiceToUse) {
        voiceToUse = resolveBestVietnameseVoice(availableVoices, item.voiceMode || voiceMode);
      }
      if (voiceToUse) utterance.voice = voiceToUse;

      utterance.volume = Math.max(0, Math.min(1, volume));
      utterance.rate = Math.max(0.7, Math.min(1.8, Number(item.rate) || rate || 1.0));
      utterance.pitch = Math.max(0.5, Math.min(1.8, Number(item.pitch) || pitch || 1.0));
      utterance.lang = voiceToUse?.lang || 'vi-VN';

      let completed = false;
      const finishSpeech = () => {
        if (completed || utterance.__cancelled) return;
        completed = true;
        if (activeUtterance === utterance) {
          activeUtterance = null;
          isSpeaking = false;
          currentSpeechText = '';
          currentSpeechCategory = '';
          currentSpeechPriority = 3;
        }
        if (queue.length === 0) onDucking(false);
        notifyState();
        if (item.onEnd) item.onEnd();
        setTimeout(processQueue, 250);
      };

      utterance.onend = finishSpeech;
      utterance.onpause = () => {
        if (!utterance.__cancelled) {
          try { window.speechSynthesis.resume(); } catch {}
        }
      };
      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        finishSpeech();
      };

      if (item.priority <= 2) {
        triggerFallbackTone(item.category);
      }

      notifyState();
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('VoiceEngine speakBrowser error:', err);
      isSpeaking = false;
      onDucking(false);
      notifyState();
      setTimeout(processQueue, 100);
    }
  }

  function enqueue(text, options = {}) {
    if (!isEnabled || !text) return;

    const priority = options.priority != null ? options.priority : 3;
    const category = options.category || 'general';

    // If a priority 1 (Gift) arrives while a low-priority chatter (Dog / Crowd >= 4)
    // is currently speaking via Web Speech, yield immediately without cutting off higher-priority speech.
    if (priority === 1 && isSpeaking && activeUtterance && currentSpeechPriority >= 4) {
      const oldUtterance = activeUtterance;
      oldUtterance.__cancelled = true;
      oldUtterance.onend = null;
      oldUtterance.onerror = null;
      activeUtterance = null;
      try {
        window.speechSynthesis.cancel();
      } catch {}
      isSpeaking = false;
      currentSpeechText = '';
      currentSpeechCategory = '';
      currentSpeechPriority = 3;
    }

    // Narration is a single presenter: discard background chatter first when
    // a meaningful event arrives, rather than letting it form a long backlog.
    if (priority <= 2) {
      for (let i = queue.length - 1; i >= 0; i--) {
        if (queue[i].priority >= 4 || ['dog', 'crowd-request', 'join'].includes(queue[i].category)) queue.splice(i, 1);
      }
    }

    // Do not queue several idle/crowd lines; the most recent one is enough.
    if (['dog', 'crowd-request'].includes(category)) {
      if (currentSpeechCategory === category || queue.some(q => q.category === category)) return;
    }

    // Limit queue size to avoid latency buildup.
    if (queue.length >= 4) {
      // Remove oldest low priority item
      const lowIndex = queue.findLastIndex(q => q.priority >= 3);
      if (lowIndex >= 0) queue.splice(lowIndex, 1);
    }

    // Tránh xếp trùng lặp câu nói nếu câu đó đang chờ trong hàng đợi
    if (queue.some(q => q.text === text)) return;

    queue.push({
      id: Math.random().toString(36).slice(2),
      text,
      priority,
      category,
      rate: options.rate ?? rate ?? 1.0,
      pitch: options.pitch ?? pitch ?? 1.0,
      voiceMode: options.voiceMode,
      onEnd: options.onEnd
    });

    notifyState();
    if (!isSpeaking) processQueue();
  }

  // --- Public Specialized Voice Methods (Giữ vững chuẩn giọng tự nhiên ban đầu) ---

  /**
   * Speak Welcome for Guests Joining (with intelligent burst coalescing)
   */
  function speakWelcome(nickname, immediate = false) {
    const cleanName = (nickname || 'Huynh Đệ').trim();
    if (immediate) {
      enqueue(formatWelcomeText(cleanName), { priority: 3, category: 'join', pitch: 1.0, rate: 1.0 });
      return;
    }

    pendingJoins.push(cleanName);
    if (joinDebounceTimer) clearTimeout(joinDebounceTimer);
    joinDebounceTimer = setTimeout(() => {
      const names = [...pendingJoins];
      pendingJoins.length = 0;
      const text = formatCoalescedJoins(names);
      enqueue(text, { priority: 3, category: 'join', pitch: 1.0, rate: 1.0 });
    }, 1800);
  }

  /**
   * Speak Follow appreciation (with burst coalescing)
   */
  function speakFollow(nickname, immediate = false) {
    const cleanName = (nickname || 'Huynh Đệ').trim();
    if (immediate) {
      enqueue(formatFollowText(cleanName), { priority: 2, category: 'follow', pitch: 1.0, rate: 1.0 });
      return;
    }

    pendingFollows.push(cleanName);
    if (followDebounceTimer) clearTimeout(followDebounceTimer);
    followDebounceTimer = setTimeout(() => {
      const names = [...pendingFollows];
      pendingFollows.length = 0;
      const text = formatCoalescedFollows(names);
      enqueue(text, { priority: 2, category: 'follow', pitch: 1.0, rate: 1.0 });
    }, 1200);
  }

  /**
   * Speak 1000+ Likes Grand Appreciation (Polite, joyful, respectful)
   */
  function speakThousandLikes(nickname, count = 1000) {
    const text = formatThousandLikesText(nickname, count);
    enqueue(text, { priority: 1, category: 'likes', pitch: 1.0, rate: 1.0 });
  }

  /**
   * Speak Gift appreciation (Urgent priority 1, tailored by coin tier)
   */
  function speakGift(nickname, giftName = 'Hoa Hồng', count = 1, coins = 0) {
    const text = formatGiftText(nickname, giftName, count, coins);
    enqueue(text, { priority: 1, category: 'gift', pitch: 1.0, rate: 1.0 });
  }

  /**
   * Speak Professor Dog Quip (Background priority 4, natural smooth tone)
   */
  function speakDog(quote) {
    const text = quote || getRandomItem(PROF_DOG_TEMPLATES);
    enqueue(text, { priority: 4, category: 'dog', pitch: 1.0, rate: 1.0 });
  }

  /**
   * Speak Fortune Poem (Reverent, serene cadence)
   */
  function speakFortune(fortuneData) {
    let poem = '';
    if (typeof fortuneData === 'string') {
      poem = fortuneData;
    } else if (fortuneData?.text) {
      poem = `Lời xăm số ${fortuneData.number || ''}: ${fortuneData.title || ''}. ${fortuneData.text}`;
    } else {
      const tpl = getRandomItem(FORTUNE_POEM_TEMPLATES);
      poem = tpl.replace('{number}', '68').replace('{title}', 'Lộc Phát Toàn Gia');
    }
    enqueue(poem, { priority: 2, category: 'fortune', pitch: 1.0, rate: 0.98 });
  }

  /**
   * Speak Famous Trader Legend Quote (Jesse Livermore, CZ, Soros, Buffett)
   */
  function speakTraderLegend(legendData) {
    let quote = '';
    if (typeof legendData === 'string') {
      quote = formatSolemnLegendText('Huyền Thoại', legendData);
    } else if (legendData?.voiceText) {
      quote = legendData.voiceText;
    } else if (legendData?.author && legendData?.text) {
      quote = formatSolemnLegendText(legendData.author, legendData.text);
    } else {
      const item = getRandomItem(TRADER_LEGENDS_QUOTES);
      quote = formatSolemnLegendText(item.author, item.text);
    }
    enqueue(quote, { priority: 2, category: 'legend', voiceMode: 'male', pitch: 1.0, rate: 0.98 });
  }

  /**
   * Speak lively comedy street dialogue
   */
  function speakComedyDialogue(text, options = {}) {
    const isOptionsObj = typeof options === 'object' && options !== null;
    const vMode = isOptionsObj ? (options.voiceMode || 'auto') : 'auto';
    enqueue(text, { priority: 1, category: 'comedy', voiceMode: vMode, pitch: 1.0, rate: 1.0 });
  }

  function stop() {
    queue.length = 0;
    pendingJoins.length = 0;
    pendingFollows.length = 0;
    if (joinDebounceTimer) { clearTimeout(joinDebounceTimer); joinDebounceTimer = null; }
    if (followDebounceTimer) { clearTimeout(followDebounceTimer); followDebounceTimer = null; }
    clearSpeechWatchdog();
    if (activeAudio) {
      cleanupAudioElement(activeAudio);
      activeAudio = null;
    }
    const hadUtterance = !!activeUtterance;
    if (activeUtterance) {
      activeUtterance.__cancelled = true;
      activeUtterance.onend = null;
      activeUtterance.onerror = null;
      activeUtterance.onpause = null;
      activeUtterance = null;
    }
    // Only cancel global Web Speech if this engine actually owns an utterance;
    // otherwise an idle/secondary overlay tab would cut off speech in sibling frames.
    if (hadUtterance && typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
      } catch {}
    }
    isSpeaking = false;
    currentSpeechText = '';
    currentSpeechCategory = '';
    currentSpeechPriority = 3;
    onDucking(false);
    notifyState();
  }

  function unlock() {
    if (typeof window === 'undefined') return;
    try {
      if (window.speechSynthesis) {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        loadVoices();
      }
    } catch {}
  }

  return {
    speak: enqueue,
    speakWelcome,
    speakFollow,
    speakGift,
    speakThousandLikes,
    speakDog,
    speakFortune,
    speakTraderLegend,
    speakComedyDialogue,
    stop,
    unlock,
    setEngine: (eng) => { engineMode = eng === 'browser' ? 'browser' : 'neural'; notifyState(); },
    getEngine: () => engineMode,
    setVolume: (v) => {
      volume = Math.max(0, Math.min(1, v));
      if (activeAudio) activeAudio.volume = volume;
      notifyState();
    },
    setRate: (r) => { rate = Math.max(0.7, Math.min(1.8, r)); notifyState(); },
    setPitch: (p) => { pitch = Math.max(0.5, Math.min(1.8, p)); notifyState(); },
    setVoiceMode: (mode) => { voiceMode = mode; selectedVoice = resolveBestVietnameseVoice(availableVoices, mode); notifyState(); },
    setVoiceByName: (name) => {
      manualVoiceName = name || null;
      if (name) {
        const found = availableVoices.find(v => v.name === name);
        if (found) selectedVoice = found;
      } else {
        selectedVoice = resolveBestVietnameseVoice(availableVoices, voiceMode);
      }
      notifyState();
    },
    setEnabled: (flag) => {
      const nextEnabled = !!flag;
      const changed = nextEnabled !== isEnabled;
      isEnabled = nextEnabled;
      if (!isEnabled && (isSpeaking || queue.length > 0 || activeAudio || activeUtterance)) {
        stop();
        return;
      }
      if (changed) notifyState();
    },
    getVoices: () => availableVoices,
    getState: () => {
      let resolvedName = 'Hệ thống tự động';
      if (engineMode === 'neural') {
        resolvedName = voiceMode === 'male' 
          ? 'Microsoft Nam Minh (Neural - Nam)' 
          : 'Microsoft Hoài My (Neural - Nữ)';
      } else if (selectedVoice) {
        resolvedName = `${selectedVoice.name} (${selectedVoice.lang})`;
      }
      return {
        enabled: isEnabled,
        engine: engineMode,
        isSpeaking,
        currentText: currentSpeechText,
        queueLength: queue.length,
        voiceName: resolvedName,
        mode: voiceMode,
        volume,
        rate,
        pitch
      };
    },
    refreshVoices: loadVoices
  };
}

if (typeof window !== 'undefined') {
  window.createVoiceEngine = createVoiceEngine;
  window.cleanSpeechText = cleanSpeechText;
  window.formatWelcomeText = formatWelcomeText;
  window.formatFollowText = formatFollowText;
  window.formatGiftText = formatGiftText;
  window.formatThousandLikesText = formatThousandLikesText;
  window.formatSolemnLegendText = formatSolemnLegendText;
  window.TRADER_LEGENDS_QUOTES = TRADER_LEGENDS_QUOTES;
}
