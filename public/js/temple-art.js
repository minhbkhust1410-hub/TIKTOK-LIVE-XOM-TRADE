// Calibrated against the original, unmodified 1254 × 1254 ImageGen sheet.
// Cell bounds clip adjacent poses. Ground anchors keep a constant world scale
// instead of stretching a prostrating person up to standing height.
export const ART = {
  background: '/assets/wooden-temple-v1/background.png',
  sheet: '/assets/wooden-temple-v1/devotee-sheet.png',
  width: 1254, height: 1254, columns: 4, rows: 2,
  standingHeight: 561,
  anchors: [
    [156.8, 595], [156.8, 595], [156.8, 595], [156.8, 595],
    [156.8, 595], [156.8, 595], [156.8, 595], [156.8, 595],
  ],
  // Twelve crowd traders plus five meme-style traders.
  tradersCount: 17,
  specialTraders: {
    12: '/assets/hang_rong_traders/trader_masked_monk-v1.png',
    13: '/assets/hang_rong_traders/trader_prayer_bull-v1.png',
    14: '/assets/hang_rong_traders/trader_bull_monk-v1.png',
    15: '/assets/hang_rong_traders/trader_prayer_chicken-v1.png',
    16: '/assets/hang_rong_traders/trader_zen_bull-v1.png'
  },
};

export function createPose(index, standingHeight = 330, variant = null) {
  const frame = document.createElement('span');
  frame.className = 'sprite-cell';
  frame.dataset.pose = index;
  frame.setAttribute('aria-hidden', 'true');

  const requestedVariant = variant !== null && variant !== undefined
    ? Math.abs(Number(variant))
    : Math.abs(Number(index));
  const specialAsset = ART.specialTraders[requestedVariant];
  const v = specialAsset ? requestedVariant : requestedVariant % ART.tradersCount;

  frame.dataset.variant = v;
  const isWalker = standingHeight > 150;
  const w = isWalker ? Math.round(standingHeight * 0.72) : (specialAsset ? 165 : 108);
  const h = isWalker ? Math.round(standingHeight * 0.95) : 148;
  Object.assign(frame.style, {
    width: `${w}px`,
    height: `${h}px`,
    left: `calc(50% - ${Math.round(w / 2)}px)`,
    bottom: isWalker ? '0px' : '-8px',
    backgroundImage: `url("${specialAsset || `/assets/hang_rong_traders/trader_${v}.png`}")`,
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center bottom',
  });
  return frame;
}
