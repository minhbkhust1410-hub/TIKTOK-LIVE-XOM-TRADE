// Shared tiers, top-donor ranking limit and the bounded rotating hall viewport.
export const SCENE_VERSION = 'wooden-temple-v2';
export const RUNTIME_REVISION = 'wooden-temple-v2.7';
export const HALL_CAPACITY = 40;
export const VISIBLE_HALL_CAPACITY = 28;
export const PINNED_DONORS = 4;
export const HALL_ROTATION_MS = 10000;
export const GIFT_TIERS = Object.freeze([
  { min: 1, label: 'Bói quẻ nến', action: 'fortune', icon: 'fortune' },
  { min: 3, label: 'Thắp nhang gồng lệnh', action: 'incense', icon: 'incense' },
  { min: 5, label: 'Hoa sen chốt lời', action: 'lotus', icon: 'lotus' },
  { min: 10, label: 'Hoa đăng về bờ', action: 'prayer', icon: 'lantern' },
  { min: 30, label: 'Mâm lễ xả xui', action: 'fruit', icon: 'fruit' },
  { min: 100, label: 'Chuông tỉnh tâm', action: 'bell', icon: 'bell' },
  { min: 500, label: 'Cột xanh chọc trời', action: 'grand', icon: 'halo' },
]);
export const giftTier = coins => GIFT_TIERS.findLast(tier => coins >= tier.min);

export const AUTO_FEATURE_META = Object.freeze([
  { key: 'comedy', label: '🎬 Tiểu phẩm hài tự động' },
  { key: 'legend', label: '🏛️ Huyền thoại phát biểu tự động' },
  { key: 'but', label: '🧙 Ông Bụt Hoàn Phí (~10p tự động)' },
  { key: 'tug', label: '⚔️ Đấu trường Kéo Co tự động' },
  { key: 'wheel', label: '☸️ Vòng Xoay Định Mệnh tự động' },
  { key: 'siren', label: '🚨 Còi Quét Thanh Khoản tự động' },
  { key: 'news', label: '📰 Bản Tin Nóng Phố Wall tự động' },
  { key: 'rituals', label: '🕯️ Nghi thức mẫu tự động' },
  { key: 'crowd', label: '👥 Khách & Chat ảo khi rảnh' },
]);
export const AUTO_FEATURE_KEYS = Object.freeze(AUTO_FEATURE_META.map(item => item.key));
export const DEFAULT_AUTO_FEATURES = Object.freeze(
  Object.fromEntries(AUTO_FEATURE_KEYS.map(key => [key, key !== 'crowd']))
);
export const normalizeAutoFeatures = input => Object.fromEntries(
  AUTO_FEATURE_KEYS.map(key => [key, key === 'crowd' ? input?.[key] === true : input?.[key] !== false])
);

// Rank proceeds from the aisle outwards, alternating left and right.
export const HALL_LAYOUT = Object.freeze(Array.from({ length: VISIBLE_HALL_CAPACITY }, (_, index) => {
  const front = index < 4, offset = front ? index : index - 4;
  const row = front ? 0 : 1 + Math.floor(offset / 6), column = Math.floor(offset % (front ? 4 : 6) / 2), right = offset % 2;
  return { rank: index + 1, row, column, side: right ? 'right' : 'left',
    x: right ? 660 + column * (front ? 165 : 85) : 365 - column * (front ? 165 : 85),
    y: front ? 1190 : 1290 + (row - 1) * 100, scale: front ? 1.08 : .95 + row * .025 };
}));
