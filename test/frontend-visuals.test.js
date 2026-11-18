import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server.js';
import { once } from 'node:events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Visual Frontend Suite: 1. DOM Elements in public/overlay.html', () => {
  const overlayHtml = fs.readFileSync(path.join(rootDir, 'public', 'overlay.html'), 'utf8');

  // Core layout elements
  assert.ok(overlayHtml.includes('id="stage"'), 'Missing #stage');
  assert.ok(overlayHtml.includes('id="forexChartBoard"'), 'Missing #forexChartBoard');
  assert.ok(overlayHtml.includes('id="tv_chart_container"'), 'Missing #tv_chart_container');
  assert.ok(overlayHtml.includes('id="hall"'), 'Missing #hall (28 seats)');
  assert.ok(overlayHtml.includes('id="fortune"'), 'Missing #fortune');

  // Viral V2 Feature 1: Flash Breaking News Popup
  assert.ok(overlayHtml.includes('id="breakingNewsPopup"'), 'Missing #breakingNewsPopup');
  assert.ok(overlayHtml.includes('id="breakingNewsBody"'), 'Missing #breakingNewsBody');
  assert.ok(overlayHtml.includes('id="breakingNewsTime"'), 'Missing #breakingNewsTime');

  // Viral V2 Feature 2: Tug of War Arena
  assert.ok(overlayHtml.includes('id="tugArena"'), 'Missing #tugArena');
  assert.ok(overlayHtml.includes('id="bullForce"'), 'Missing #bullForce');
  assert.ok(overlayHtml.includes('id="bearForce"'), 'Missing #bearForce');
  assert.ok(overlayHtml.includes('id="tugTimer"'), 'Missing #tugTimer');
  assert.ok(overlayHtml.includes('id="tugChainTrack"'), 'Missing #tugChainTrack');
  assert.ok(overlayHtml.includes('id="tugAmulet"'), 'Missing #tugAmulet');
  assert.ok(overlayHtml.includes('id="baguaPos"'), 'Missing #baguaPos');
  assert.ok(overlayHtml.includes('id="tugVictoryOverlay"'), 'Missing #tugVictoryOverlay');

  // Viral V2 Feature 3: Wheel of Karma
  assert.ok(overlayHtml.includes('id="wheelContainer"'), 'Missing #wheelContainer');
  assert.ok(overlayHtml.includes('id="wheelCanvas"'), 'Missing #wheelCanvas');
  assert.ok(overlayHtml.includes('id="wheelOracle"'), 'Missing #wheelOracle');
  assert.ok(overlayHtml.includes('id="oracleTitle"'), 'Missing #oracleTitle');
  assert.ok(overlayHtml.includes('id="oracleQuote"'), 'Missing #oracleQuote');
  assert.ok(overlayHtml.includes('id="oraclePoints"'), 'Missing #oraclePoints');

  // Viral V2 Feature 4: Liquidity Siren Overlay
  assert.ok(overlayHtml.includes('id="sirenOverlay"'), 'Missing #sirenOverlay');
  assert.ok(overlayHtml.includes('id="sirenHeadline"'), 'Missing #sirenHeadline');
  assert.ok(overlayHtml.includes('id="sirenShark"'), 'Missing #sirenShark');
  assert.ok(overlayHtml.includes('id="sirenDebrisLayer"'), 'Missing #sirenDebrisLayer');
  assert.ok(overlayHtml.includes('id="sirenMinigame"'), 'Missing #sirenMinigame');
  assert.ok(overlayHtml.includes('id="btnStopLoss"'), 'Missing #btnStopLoss');

  // Viral V2 Feature 5: Wall Street Breaking News Ticker Bar
  assert.ok(overlayHtml.includes('id="newsTickerBar"'), 'Missing #newsTickerBar');
  assert.ok(overlayHtml.includes('id="tickerTrack"'), 'Missing #tickerTrack');
});

test('Visual Frontend Suite: 2. CSS Design Tokens & Palette in overlay-v2.css', () => {
  const css = fs.readFileSync(path.join(rootDir, 'public', 'overlay-v2.css'), 'utf8');

  // Check required color palette constants
  assert.ok(css.includes('#24140d'), 'Missing dominant dark wood color #24140d');
  assert.ok(css.includes('#ae854d'), 'Missing secondary antique bronze color #ae854d');
  assert.ok(css.includes('#f3d28a'), 'Missing accent imperial gold color #f3d28a');
  assert.ok(css.includes('#10b981'), 'Missing bull jade green color #10b981');
  assert.ok(css.includes('#ef4444'), 'Missing bear ruby red color #ef4444');
  assert.ok(css.includes('#fff0cb'), 'Missing candle cream color #fff0cb');
  assert.ok(css.includes('#d6bd91'), 'Missing quiet sand color #d6bd91');

  // Check viral CSS classes
  assert.ok(css.includes('.tug-arena'), 'Missing .tug-arena CSS rule');
  assert.ok(css.includes('.tug-bagua-amulet'), 'Missing .tug-bagua-amulet CSS rule');
  assert.ok(css.includes('.wheel-container'), 'Missing .wheel-container CSS rule');
  assert.ok(css.includes('.siren-overlay'), 'Missing .siren-overlay CSS rule');
  assert.ok(css.includes('.news-ticker-bar'), 'Missing .news-ticker-bar CSS rule');
  assert.ok(css.includes('.breaking-news-popup'), 'Missing .breaking-news-popup CSS rule');
});

test('Visual Frontend Suite: 3. Streamer Control Panel (admin.html & admin.js)', () => {
  const adminHtml = fs.readFileSync(path.join(rootDir, 'public', 'admin.html'), 'utf8');
  const adminJs = fs.readFileSync(path.join(rootDir, 'public', 'js', 'admin.js'), 'utf8');

  // Admin HTML elements for Viral V2
  assert.ok(adminHtml.includes('viral-panel'), 'Missing viral-panel in admin.html');
  assert.ok(adminHtml.includes('id="btnAdminTugStart"'), 'Missing #btnAdminTugStart in admin.html');
  assert.ok(adminHtml.includes('id="btnAdminTugReset"'), 'Missing #btnAdminTugReset in admin.html');
  assert.ok(adminHtml.includes('id="btnAdminTugBull50"'), 'Missing #btnAdminTugBull50 in admin.html');
  assert.ok(adminHtml.includes('id="btnAdminTugBear50"'), 'Missing #btnAdminTugBear50 in admin.html');
  assert.ok(adminHtml.includes('id="btnAdminWheelSpin"'), 'Missing #btnAdminWheelSpin in admin.html');
  assert.ok(adminHtml.includes('id="btnAdminSirenTrigger"'), 'Missing #btnAdminSirenTrigger in admin.html');
  assert.ok(adminHtml.includes('id="btnAdminBroadcastNews"'), 'Missing #btnAdminBroadcastNews in admin.html');

  // Admin JS event wiring
  assert.ok(adminJs.includes('btnAdminTugStart'), 'Missing btnAdminTugStart wiring in admin.js');
  assert.ok(adminJs.includes('btnAdminWheelSpin'), 'Missing btnAdminWheelSpin wiring in admin.js');
  assert.ok(adminJs.includes('btnAdminSirenTrigger'), 'Missing btnAdminSirenTrigger wiring in admin.js');
  assert.ok(adminJs.includes('btnAdminBroadcastNews'), 'Missing btnAdminBroadcastNews wiring in admin.js');
  assert.ok(adminJs.includes('renderAdminTug'), 'Missing renderAdminTug in admin.js');
  assert.ok(adminJs.includes('tug_state_broadcast'), 'Missing tug_state_broadcast handling in admin.js');
});

test('Visual Frontend Suite: 4. Web Audio Synthesizer Coverage in overlay.js', () => {
  const overlayJs = fs.readFileSync(path.join(rootDir, 'public', 'js', 'overlay.js'), 'utf8');

  // Verify all required synthesized tones exist
  assert.ok(overlayJs.includes("'wood-click'"), "Missing tone('wood-click') synth implementation");
  assert.ok(overlayJs.includes("'siren'"), "Missing tone('siren') synth implementation");
  assert.ok(overlayJs.includes("'bull-win'"), "Missing tone('bull-win') synth implementation");
  assert.ok(overlayJs.includes("'bear-win'"), "Missing tone('bear-win') synth implementation");
  assert.ok(overlayJs.includes("'breaking-news'"), "Missing tone('breaking-news') synth implementation");

  // Verify real-time broadcast event handlers in overlay.js
  assert.ok(overlayJs.includes('tug_state_broadcast'), 'Missing tug_state_broadcast in overlay.js');
  assert.ok(overlayJs.includes('tug_result_broadcast'), 'Missing tug_result_broadcast in overlay.js');
  assert.ok(overlayJs.includes('wheel_result_broadcast'), 'Missing wheel_result_broadcast in overlay.js');
  assert.ok(overlayJs.includes('siren_alert_broadcast'), 'Missing siren_alert_broadcast in overlay.js');
  assert.ok(overlayJs.includes('siren_resolved_broadcast'), 'Missing siren_resolved_broadcast in overlay.js');
  assert.ok(overlayJs.includes('breaking_news_broadcast'), 'Missing breaking_news_broadcast in overlay.js');
  assert.ok(overlayJs.includes('viral_state'), 'Missing viral_state in overlay.js');

  // Verify Wheel canvas drawing and cubic-bezier easing
  assert.ok(overlayJs.includes('drawWheel'), 'Missing drawWheel in overlay.js');
  assert.ok(overlayJs.includes('cubicBezierEasing'), 'Missing cubicBezierEasing in overlay.js');
});

test('Visual Frontend Suite: 5. HTTP Integration & Static Asset Integrity', async () => {
  const app = createApp();
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const port = app.server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Check /overlay
    const overlayRes = await fetch(`${baseUrl}/overlay`);
    assert.equal(overlayRes.status, 200);
    const overlayText = await overlayRes.text();
    assert.ok(overlayText.includes('tugArena'));
    assert.ok(overlayText.includes('wheelContainer'));
    assert.ok(overlayText.includes('sirenOverlay'));
    assert.ok(overlayText.includes('newsTickerBar'));

    // 2. Check /preview
    const previewRes = await fetch(`${baseUrl}/preview`);
    assert.equal(previewRes.status, 200);

    // 3. Check /admin
    const adminRes = await fetch(`${baseUrl}/admin`);
    assert.equal(adminRes.status, 200);
    const adminText = await adminRes.text();
    assert.ok(adminText.includes('viral-panel'));

    // 4. Check CSS files
    const cssRes = await fetch(`${baseUrl}/overlay-v2.css?v=wooden-v2.7`);
    assert.equal(cssRes.status, 200);
    const cssText = await cssRes.text();
    assert.ok(cssText.includes('--bull-green'));
    assert.ok(cssText.includes('--bear-red'));

    // 5. Check overlay.js file
    const jsRes = await fetch(`${baseUrl}/js/overlay.js?v=wooden-v2.7`);
    assert.equal(jsRes.status, 200);
  } finally {
    await app.close();
  }
});

test('Visual Frontend Suite: 6. Particles Engine: Crypto Coin Sprites (BTC/ETH) & Burst Generation', () => {
  const particlesJs = fs.readFileSync(path.join(rootDir, 'public', 'js', 'particles.js'), 'utf8');

  // Verify coin sprite builder and symbols
  assert.ok(particlesJs.includes('createCoinSprite'), 'Missing createCoinSprite in particles.js');
  assert.ok(particlesJs.includes("'btc'"), 'Missing BTC coin support in particles.js');
  assert.ok(particlesJs.includes("'eth'"), 'Missing ETH coin support in particles.js');
  assert.ok(particlesJs.includes("'₿'"), 'Missing Bitcoin currency symbol ₿ in particles.js');
  assert.ok(particlesJs.includes("'Ξ'"), 'Missing Ethereum currency symbol Ξ in particles.js');
  assert.ok(particlesJs.includes("'$'"), 'Missing Dollar/Gold currency symbol $ in particles.js');

  // Verify pre-rendered sprite properties and 3D depth shadows & sparkle
  assert.ok(particlesJs.includes('this.btcCoinSprite'), 'Missing this.btcCoinSprite');
  assert.ok(particlesJs.includes('this.ethCoinSprite'), 'Missing this.ethCoinSprite');
  assert.ok(particlesJs.includes('this.goldCoinSprite'), 'Missing this.goldCoinSprite');
  assert.ok(particlesJs.includes('this.coinShadowSprite'), 'Missing this.coinShadowSprite');
  assert.ok(particlesJs.includes('this.twinkleSprite'), 'Missing this.twinkleSprite');

  // Verify ambient coin falling in temple with natural aerodynamic motion
  assert.ok(particlesJs.includes('createLotusPetal'), 'Missing createLotusPetal method');
  assert.ok(particlesJs.includes('coinType'), 'Missing coinType property in particle generation');
  assert.ok(particlesJs.includes('flipScale'), 'Missing 3D flipScale tumbling in particles.js');
  assert.ok(particlesJs.includes('twinklePhase'), 'Missing sparkle twinklePhase in particles.js');
});

test('Visual Frontend Suite: 7. Professor Dog (Giáo Sư Cún & Thước Kẻ Trỏ Nến) DOM & Quotes', () => {
  const overlayHtml = fs.readFileSync(path.join(rootDir, 'public', 'overlay.html'), 'utf8');
  const overlayJs = fs.readFileSync(path.join(rootDir, 'public', 'js', 'overlay.js'), 'utf8');
  const overlayCss = fs.readFileSync(path.join(rootDir, 'public', 'overlay-v2.css'), 'utf8');

  // Verify DOM elements in overlay.html
  assert.ok(overlayHtml.includes('id="tvChibiDog"'), 'Missing #tvChibiDog in overlay.html');
  assert.ok(overlayHtml.includes('id="tvChibiDogSpeech"'), 'Missing #tvChibiDogSpeech in overlay.html');
  assert.ok(overlayHtml.includes('class="dog-ruler"'), 'Missing .dog-ruler (wooden pointer ruler) in overlay.html');
  assert.ok(overlayHtml.includes('class="professor-cap"'), 'Missing .professor-cap in overlay.html');
  assert.ok(overlayHtml.includes('class="glasses-glint"'), 'Missing .glasses-glint (intellectual sparkle) in overlay.html');

  // Verify CSS styles in overlay-v2.css
  assert.ok(overlayCss.includes('.tv-chibi-dog'), 'Missing .tv-chibi-dog CSS rule');
  assert.ok(overlayCss.includes('.chibi-dog-speech'), 'Missing .chibi-dog-speech CSS rule');
  assert.ok(overlayCss.includes('.dog-ruler'), 'Missing .dog-ruler CSS animation/rule');
  assert.ok(overlayCss.includes('.glasses-glint'), 'Missing .glasses-glint CSS animation');
  assert.ok(overlayCss.includes('.p-back'), 'Missing .p-back paw trot CSS rule');
  assert.ok(overlayCss.includes('rulerTipPulse'), 'Missing rulerTipPulse CSS animation');

  // Verify TV LED border corner accents
  assert.ok(overlayCss.includes('.tv-led-strip::before'), 'Missing temple corner bracket ::before on .tv-led-strip');
  assert.ok(overlayCss.includes('.tv-led-strip::after'), 'Missing temple corner bracket ::after on .tv-led-strip');

  // Verify JavaScript rotating humorous quotes in overlay.js
  assert.ok(overlayJs.includes('profDogQuotes'), 'Missing profDogQuotes array in overlay.js');
  assert.ok(overlayJs.includes('tvChibiDogSpeech'), 'Missing tvChibiDogSpeech element handling in overlay.js');
  assert.ok(overlayJs.includes('GS. Cún:'), 'Missing Professor Dog speech prefixes');
});

test('Visual Frontend Suite: 8. Route /live-test HTTP 200 & Cockpit UI Integrity', async () => {
  const app = createApp();
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const port = app.server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const res = await fetch(`${baseUrl}/live-test`);
    assert.equal(res.status, 200, 'GET /live-test must return HTTP 200');
    const text = await res.text();
    assert.ok(text.includes('XÓM TRADE · PHÒNG TEST 1 CỬA SỔ') || text.includes('CHÙA ĐU CHART'), 'Missing title in /live-test');
    assert.ok(text.includes('viewSplitBtn'), 'Missing split view button in /live-test');
    assert.ok(text.includes('btnCopyPublicUrl'), 'Missing copy public URL button in /live-test');
    assert.ok(text.includes('toastBox'), 'Missing #toastBox luxury notification in /live-test');
    assert.ok(text.includes('corner-bracket-box'), 'Missing .corner-bracket-box in /live-test');
    assert.ok(text.includes('btnVoiceTestWelcome'), 'Missing #btnVoiceTestWelcome in /live-test');
    assert.ok(text.includes('btnVoiceTestFollow'), 'Missing #btnVoiceTestFollow in /live-test');
    assert.ok(text.includes('btnVoiceTestRose'), 'Missing #btnVoiceTestRose in /live-test');
    assert.ok(text.includes('ttsCurrentVoiceLabel'), 'Missing #ttsCurrentVoiceLabel in /live-test');
  } finally {
    await app.close();
  }
});

test('Visual Frontend Suite: 9. Đạo Tràng Auto-Initialization: Disciples Seated on Boot', async () => {
  const app = createApp();
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const port = app.server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const res = await fetch(`${baseUrl}/api/state`);
    assert.equal(res.status, 200);
    const data = await res.json();

    // Verify hall mode and capacity
    assert.ok(data.hall, 'Missing hall in state snapshot');
    assert.equal(data.hall.capacity, 28, 'Hall capacity must be 28');

    // Verify hall is auto-populated with worshippers/disciples in meditation
    assert.ok(Array.isArray(data.hall.seats), 'hall.seats must be an array');
    const activeSeats = data.hall.seats.filter(Boolean);
    assert.ok(activeSeats.length > 0, 'Temple hall must have disciples seated on initial boot');
    assert.ok(activeSeats.length <= 28, 'Seated disciples cannot exceed 28');
    assert.ok(data.hall.totalParticipants > 0, 'Total hall participants must be greater than 0');

    // Verify leaders exist
    assert.ok(Array.isArray(data.hall.leaderboard), 'hall.leaderboard must be an array');
    assert.ok(data.hall.leaderboard.length > 0, 'Hall must have leaders/donors');

    // Disciples have valid identifiers and names
    const firstSeated = activeSeats[0];
    assert.ok(firstSeated.id, 'Disciples must have an id');
    assert.ok(firstSeated.name, 'Disciples must have a name');
  } finally {
    await app.close();
  }
});

test('Visual Frontend Suite: 10. Anti-Copyright Stealth Shield & Imperceptible Watermark Layer', () => {
  const overlayHtml = fs.readFileSync(path.join(rootDir, 'public', 'overlay.html'), 'utf8');
  const overlayCss = fs.readFileSync(path.join(rootDir, 'public', 'overlay-v2.css'), 'utf8');
  const liveTestHtml = fs.readFileSync(path.join(rootDir, 'public', 'live-test.html'), 'utf8');
  const overlayJs = fs.readFileSync(path.join(rootDir, 'public', 'js', 'overlay.js'), 'utf8');

  // 1. Overlay DOM Elements for Stealth Shield
  assert.ok(overlayHtml.includes('id="stealthShield"'), 'Missing #stealthShield in overlay.html');
  assert.ok(overlayHtml.includes('class="stealth-noise-matrix"'), 'Missing .stealth-noise-matrix in overlay.html');
  assert.ok(overlayHtml.includes('id="stealthWatermarkGrid"'), 'Missing #stealthWatermarkGrid in overlay.html');
  assert.ok(overlayHtml.includes('class="stealth-edge-guard"'), 'Missing .stealth-edge-guard in overlay.html');
  assert.ok(overlayHtml.includes('id="stealthForensicBadge"'), 'Missing #stealthForensicBadge in overlay.html');

  // 2. CSS Rules for sub-perceptual (imperceptible) watermark & hash disruption
  assert.ok(overlayCss.includes('.stealth-shield-layer'), 'Missing .stealth-shield-layer CSS rule');
  assert.ok(overlayCss.includes('.stealth-noise-matrix'), 'Missing .stealth-noise-matrix CSS rule');
  assert.ok(overlayCss.includes('.stealth-watermark-grid'), 'Missing .stealth-watermark-grid CSS rule');
  assert.ok(overlayCss.includes('stealthDrift'), 'Missing stealthDrift CSS keyframe animation');
  assert.ok(overlayCss.includes('.stealth-shield-layer.revealed'), 'Missing .stealth-shield-layer.revealed CSS rule');

  // 3. Cockpit UI Controls in live-test.html
  assert.ok(liveTestHtml.includes('id="btnToggleWatermarkReveal"'), 'Missing #btnToggleWatermarkReveal in live-test.html');
  assert.ok(liveTestHtml.includes('id="sliderWatermarkOpacity"'), 'Missing #sliderWatermarkOpacity in live-test.html');
  assert.ok(liveTestHtml.includes('id="badgeWatermarkOpacity"'), 'Missing #badgeWatermarkOpacity in live-test.html');
  assert.ok(liveTestHtml.includes('id="textWatermarkReveal"'), 'Missing #textWatermarkReveal in live-test.html');

  // 4. Overlay.js PostMessage Integration
  assert.ok(overlayJs.includes('set-stealth-watermark'), 'Missing set-stealth-watermark handler in overlay.js');
  assert.ok(overlayJs.includes('revealWatermark'), 'Missing revealWatermark URL param handler in overlay.js');
});

