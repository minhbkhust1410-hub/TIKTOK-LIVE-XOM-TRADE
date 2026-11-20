import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createApp } from '../server.js';
import {
  WELCOME_TEMPLATES,
  FOLLOW_TEMPLATES,
  GIFT_TEMPLATES,
  PROF_DOG_TEMPLATES,
  FORTUNE_POEM_TEMPLATES,
  formatWelcomeText,
  formatFollowText,
  formatGiftText,
  formatCoalescedJoins,
  formatCoalescedFollows,
  cleanSpeechText,
  resolveBestVietnameseVoice,
  createVoiceEngine
} from '../public/js/voice-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Vietnamese Voice Engine: 1. Cultural Template Formatting & Diacritics', () => {
  // Check template arrays presence
  assert.ok(WELCOME_TEMPLATES.length >= 4, 'Must have at least 4 welcome templates');
  assert.ok(FOLLOW_TEMPLATES.length >= 3, 'Must have at least 3 follow templates');
  assert.ok(GIFT_TEMPLATES.length >= 3, 'Must have at least 3 gift templates');
  assert.ok(PROF_DOG_TEMPLATES.length >= 5, 'Must have at least 5 Professor Dog spoken templates');
  assert.ok(FORTUNE_POEM_TEMPLATES.length >= 2, 'Must have fortune poem templates');

  // Welcome formatting
  const welcome1 = formatWelcomeText('Nam Khánh');
  assert.ok(welcome1.includes('Nam Khánh'), 'Welcome text must include participant name');
  assert.ok(welcome1.includes('Xóm Trade') || welcome1.includes('Đu Chart') || welcome1.includes('trader') || welcome1.includes('kéo ghế'), 'Must have Xom Trade / Đu Chart flavor');

  // Follow formatting
  const follow1 = formatFollowText('Mai Hoa');
  assert.ok(follow1.includes('Mai Hoa'), 'Follow text must include participant name');
  assert.ok(follow1.includes('theo dõi') || follow1.includes('follow'), 'Must mention follow action');

  // Gift formatting
  const gift1 = formatGiftText('Chiến Thần Long', 'Rose', 5);
  assert.ok(gift1.includes('Chiến Thần Long'), 'Gift text must include donor name');
  assert.ok(gift1.includes('5') || gift1.includes('năm') || gift1.includes('đóa hoa'), 'Must mention quantity');

  // Empty/null safety
  const safeWelcome = formatWelcomeText('');
  assert.ok(safeWelcome.length > 0, 'Must handle empty name gracefully');
});

test('Vietnamese Voice Engine: 2. Smart Burst Coalescing (Debouncing multiple users)', () => {
  // Single user
  const single = formatCoalescedJoins(['Thành Đạt']);
  assert.ok(single.includes('Thành Đạt'), 'Single join uses direct greeting');

  // Two users
  const duo = formatCoalescedJoins(['Nam Khánh', 'Mai Hoa']);
  assert.ok(duo.includes('Nam Khánh và Mai Hoa'), 'Two users combined with "và"');

  // Three or more users
  const trio = formatCoalescedJoins(['Nam Khánh', 'Mai Hoa', 'Trần Tuấn']);
  assert.ok(trio.includes('Nam Khánh, Mai Hoa cùng 1 anh em khác'), '3 users coalesced properly');

  const squad = formatCoalescedJoins(['UserA', 'UserB', 'UserC', 'UserD', 'UserE']);
  assert.ok(squad.includes('UserA, UserB cùng 3 anh em khác'), '5 users coalesced properly');

  // Follow burst coalescing
  const duoFollow = formatCoalescedFollows(['Hoàng Yến', 'Bảo Ngọc']);
  assert.ok(duoFollow.includes('Hoàng Yến và Bảo Ngọc'), 'Two followers combined with "và"');
});

test('Vietnamese Voice Engine: 3. Speech Text Cleaning & Sanitization', () => {
  const dirty = '  **Chào mừng** #NamKhánh 🙏✨! Lệnh _xanh_ 🚀 mướt!  ';
  const cleaned = cleanSpeechText(dirty);
  assert.equal(cleaned, 'Chào mừng NamKhánh ! Lệnh xanh mướt!');
  assert.ok(!cleaned.includes('**'), 'Markdown asterisks must be stripped');
  assert.ok(!cleaned.includes('🙏'), 'Emojis must be stripped for smooth pronunciation');
  assert.ok(!cleaned.includes('🚀'), 'Rocket emoji stripped');
});

test('Vietnamese Voice Engine: 4. Intelligent Voice Resolution Heuristics', () => {
  const mockVoices = [
    { name: 'Microsoft David Desktop - English (United States)', lang: 'en-US', default: true },
    { name: 'Microsoft Zira Desktop - English (United States)', lang: 'en-US' },
    { name: 'Microsoft HoaiMy Online (Natural) - Vietnamese (Vietnam)', lang: 'vi-VN' },
    { name: 'Microsoft NamMinh Online (Natural) - Vietnamese (Vietnam)', lang: 'vi-VN' },
    { name: 'Google Tiếng Việt', lang: 'vi-VN' }
  ];

  // Auto mode prefers natural/online Vietnamese neural voice
  const bestAuto = resolveBestVietnameseVoice(mockVoices, 'auto');
  assert.ok(bestAuto, 'Must find a voice');
  assert.ok(bestAuto.lang.startsWith('vi'), 'Selected voice must be Vietnamese');
  assert.ok(bestAuto.name.includes('HoaiMy') || bestAuto.name.includes('NamMinh'), 'Should pick online natural voice');

  // Female mode preference
  const femaleVoice = resolveBestVietnameseVoice(mockVoices, 'female');
  assert.ok(femaleVoice.name.toLowerCase().includes('hoaimy'), 'Should pick female HoaiMy');

  // Male mode preference
  const maleVoice = resolveBestVietnameseVoice(mockVoices, 'male');
  assert.ok(maleVoice.name.toLowerCase().includes('namminh'), 'Should pick male NamMinh');

  // Fallback when no Vietnamese voice is installed
  const nonViVoices = [
    { name: 'Default English', lang: 'en-US', default: true },
    { name: 'French Voice', lang: 'fr-FR' }
  ];
  const fallback = resolveBestVietnameseVoice(nonViVoices, 'auto');
  assert.equal(fallback.name, 'Default English', 'Should fallback to default voice');
  assert.equal(resolveBestVietnameseVoice([], 'auto'), null, 'Empty list returns null');
});

test('Vietnamese Voice Engine: 5. Cockpit & Overlay DOM Elements Integrity', () => {
  const liveTestHtml = fs.readFileSync(path.join(rootDir, 'public', 'live-test.html'), 'utf8');
  const overlayHtml = fs.readFileSync(path.join(rootDir, 'public', 'overlay.html'), 'utf8');

  // Verify voice engine script in live-test.html
  assert.ok(liveTestHtml.includes('src="/js/voice-engine.js"'), 'Missing voice-engine.js script tag in live-test.html');

  // Verify Card 4C elements in live-test.html
  assert.ok(liveTestHtml.includes('id="ttsStatusBadge"'), 'Missing #ttsStatusBadge');
  assert.ok(liveTestHtml.includes('id="ttsWaveform"'), 'Missing #ttsWaveform');
  assert.ok(liveTestHtml.includes('id="ttsCurrentVoiceLabel"'), 'Missing #ttsCurrentVoiceLabel');
  assert.ok(liveTestHtml.includes('id="ttsCurrentTextDisplay"'), 'Missing #ttsCurrentTextDisplay');
  assert.ok(liveTestHtml.includes('id="ttsQueueBadge"'), 'Missing #ttsQueueBadge');

  // Verify 1-Click TTS Action Buttons in live-test.html
  assert.ok(liveTestHtml.includes('id="btnVoiceTestWelcome"'), 'Missing #btnVoiceTestWelcome');
  assert.ok(liveTestHtml.includes('id="btnVoiceTestFollow"'), 'Missing #btnVoiceTestFollow');
  assert.ok(liveTestHtml.includes('id="btnVoiceTestRose"'), 'Missing #btnVoiceTestRose');
  assert.ok(liveTestHtml.includes('id="btnVoiceTestGrand"'), 'Missing #btnVoiceTestGrand');
  assert.ok(liveTestHtml.includes('id="btnVoiceTestDog"'), 'Missing #btnVoiceTestDog');
  assert.ok(liveTestHtml.includes('id="btnVoiceTestFortune"'), 'Missing #btnVoiceTestFortune');

  // Verify Tuning Controls
  assert.ok(liveTestHtml.includes('id="selectVoiceProfile"'), 'Missing #selectVoiceProfile');
  assert.ok(liveTestHtml.includes('id="selectBrowserVoiceList"'), 'Missing #selectBrowserVoiceList');
  assert.ok(liveTestHtml.includes('id="ttsRateSlider"'), 'Missing #ttsRateSlider');
  assert.ok(liveTestHtml.includes('id="ttsPitchSlider"'), 'Missing #ttsPitchSlider');
  assert.ok(liveTestHtml.includes('id="ttsVolumeSlider"'), 'Missing #ttsVolumeSlider');
  assert.ok(liveTestHtml.includes('id="btnToggleMasterTts"'), 'Missing #btnToggleMasterTts');
  assert.ok(liveTestHtml.includes('id="btnStopTts"'), 'Missing #btnStopTts');

  // Verify Follow trader button in block 4
  assert.ok(liveTestHtml.includes('id="btnFollowTrader"'), 'Missing #btnFollowTrader');

  // Verify Professor Dog elements in overlay
  assert.ok(overlayHtml.includes('id="tvChibiDog"'), 'Missing #tvChibiDog in overlay.html');
});

test('Vietnamese Voice Engine: 6. REST API /api/voice/speak & WebSocket Real-time Broadcast', async () => {
  const app = createApp();
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const port = app.server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  const wsUrl = `ws://127.0.0.1:${port}/ws?role=overlay`;

  const ws = new WebSocket(wsUrl);
  await once(ws, 'open');

  try {
    const receivedMessages = [];
    ws.on('message', data => {
      try {
        receivedMessages.push(JSON.parse(data.toString()));
      } catch {}
    });

    // Send voice broadcast request
    const payload = {
      text: 'A lô a lô! Chào mừng trader Nam Khánh đã kéo ghế vào Động Đu Chart!',
      category: 'welcome',
      nickname: 'Nam Khánh',
      priority: 3
    };

    const res = await fetch(`${baseUrl}/api/voice/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200, 'POST /api/voice/speak must return HTTP 200');
    const json = await res.json();
    assert.equal(json.ok, true);
    assert.equal(json.broadcasted, true);

    // Wait for WebSocket message to arrive
    let voiceBroadcast = null;
    for (let i = 0; i < 30; i++) {
      voiceBroadcast = receivedMessages.find(m => m.type === 'voice_speak');
      if (voiceBroadcast) break;
      await new Promise(r => setTimeout(r, 20));
    }

    assert.ok(voiceBroadcast, 'Connected overlay must receive voice_speak broadcast message');
    assert.equal(voiceBroadcast.data.category, 'welcome');
    assert.equal(voiceBroadcast.data.nickname, 'Nam Khánh');
    assert.ok(voiceBroadcast.data.text.includes('Nam Khánh'));
  } finally {
    ws.close();
    await app.close();
  }
});

test('Vietnamese Voice Engine: 7. Stop & Aborted Audio Do Not Trigger Browser Fallback or Global Cancel', async () => {
  const prevWindow = globalThis.window;
  const prevAudio = globalThis.Audio;
  const prevUtterance = globalThis.SpeechSynthesisUtterance;

  let cancelCalls = 0;
  let speakCalls = 0;
  const createdAudios = [];

  class MockAudio {
    constructor(src) {
      this.src = src;
      this.volume = 1;
      this.duration = NaN;
      this.onended = null;
      this.onerror = null;
      this.onplaying = null;
      this.onloadedmetadata = null;
      createdAudios.push(this);
    }
    play() { return Promise.resolve(); }
    pause() {}
    removeAttribute(attr) { if (attr === 'src') this.src = ''; }
    load() {
      // Simulate Chromium async error firing if onerror wasn't detached before clearing src
      if (!this.src && typeof this.onerror === 'function') {
        this.onerror(new Error('MEDIA_ELEMENT_ERROR: Empty src'));
      }
    }
  }

  try {
    globalThis.Audio = MockAudio;
    globalThis.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
    globalThis.window = {
      speechSynthesis: {
        speaking: false,
        pending: false,
        paused: false,
        getVoices: () => [],
        cancel: () => { cancelCalls += 1; },
        speak: () => { speakCalls += 1; },
        resume: () => {}
      }
    };

    const engine = createVoiceEngine({ enabled: true });
    engine.speakFollow('Mai Hoa', true);
    assert.equal(createdAudios.length, 1);

    // Stopping an active neural audio must NOT fire fallback speakBrowser or global speechSynthesis.cancel()
    engine.stop();
    await new Promise(r => setTimeout(r, 20));
    assert.equal(speakCalls, 0, 'Aborted neural audio must not fall back to browser speech');
    assert.equal(cancelCalls, 0, 'Stopping neural/idle engine must not globally cancel sibling speechSynthesis');

    // Stopping while idle must also avoid touching global speechSynthesis.cancel()
    engine.stop();
    assert.equal(cancelCalls, 0, 'Idle stop must not call global speechSynthesis.cancel()');

    // Overlay primary & embedded mute integration checks
    const overlayJs = fs.readFileSync(path.join(rootDir, 'public', 'js', 'overlay.js'), 'utf8');
    const overlayHtml = fs.readFileSync(path.join(rootDir, 'public', 'overlay.html'), 'utf8');
    const adminHtml = fs.readFileSync(path.join(rootDir, 'public', 'admin.html'), 'utf8');
    const liveTestHtml = fs.readFileSync(path.join(rootDir, 'public', 'live-test.html'), 'utf8');
    const overlayCss = fs.readFileSync(path.join(rootDir, 'public', 'overlay-v2.css'), 'utf8');
    assert.ok(overlayJs.includes('isPrimary() && !embeddedMuted'), 'Overlay voice Proxy must gate on isPrimary() && !embeddedMuted');
    assert.ok(overlayJs.includes('shouldSpeakCelebration'), 'Overlay must deduplicate social celebration TTS');
    assert.ok(overlayJs.includes('autoFeatures?.comedy'), 'Overlay comedy interval must respect autoFeatures.comedy');
    assert.ok(overlayJs.includes('autoFeatures?.legend'), 'Overlay legend interval must respect autoFeatures.legend');
    assert.ok(overlayHtml.includes('overlay.js?v=hang-rong-v8.2'), 'overlay.html must bump overlay.js cache buster');
    assert.ok(overlayHtml.includes('id="butVisitLayer"'), 'overlay.html must render #butVisitLayer');
    assert.ok(!overlayHtml.includes('0866'), 'overlay.html must not expose phone number');
    assert.ok(!adminHtml.includes('id="butPhone"'), 'admin.html must not render phone input');
    assert.ok(adminHtml.includes('id="autoFeatureGrid"'), 'admin.html must render per-feature auto ON/OFF grid');
    assert.match(overlayCss, /\.comedy-top-banner\s*\{[^}]*left:\s*0;\s*right:\s*0;\s*margin:\s*0 auto;/s, 'comedy banner must stay horizontally centered alongside comic-pop scale animation');
    assert.ok(liveTestHtml.includes("type: 'set-embedded-preview', muted: true"), 'live-test.html must mute embedded overlay preview');
    assert.ok(liveTestHtml.includes('id="btnTriggerBut"'), 'live-test.html must include Ông Bụt test button');
    assert.ok(!liveTestHtml.includes('id="inputButPhone"'), 'live-test.html must not render phone input');

    // Ông Bụt lines validation: mentions "hoàn phí" and "bio", never includes phone digits or "backcom"
    const { BUT_REWARD_LINES, BUT_CONTACT_DISPLAY, pickButAppearance, formatButSpeechText } = await import('../public/js/but-lines.js');
    assert.ok(BUT_REWARD_LINES.length >= 12);
    for (const line of BUT_REWARD_LINES) {
      assert.ok(line.toLowerCase().includes('hoàn phí'), `Line missing "hoàn phí": ${line}`);
      assert.ok(line.toLowerCase().includes('bio'), `Line missing "bio": ${line}`);
      assert.ok(!/\d{4,}/.test(line), `Line must not include phone digits: ${line}`);
      assert.ok(!/back\s*com/i.test(line), `Line must not contain backcom: ${line}`);
    }
    const picked = pickButAppearance({ index: 8 });
    assert.equal(picked.contact, BUT_CONTACT_DISPLAY);
    assert.ok(picked.speechText.includes('A đến Z'));
    assert.ok(!/\d{4,}/.test(formatButSpeechText(picked.text)));

    // Tiered gift appreciation and non-rose "Hoa Sen" gift name preservation
    const lotusText = formatGiftText('Tuấn', 'Hoa Sen Chốt Lời', 1, 5);
    assert.ok(lotusText.includes('Hoa Sen Chốt Lời'), 'Hoa Sen gift name must not be rewritten to đóa hoa hồng');
    const grandText = formatGiftText('Chủ Tịch', 'Đại Lễ Kim Cương', 1, 500);
    assert.ok(
      grandText.includes('500') && (grandText.includes('ĐẠI LỄ PHONG THẦN') || grandText.includes('CHẤN ĐỘNG SÀN GIAO DỊCH')),
      '500+ xu gifts must use grand VIP appreciation'
    );
  } finally {
    globalThis.window = prevWindow;
    globalThis.Audio = prevAudio;
    globalThis.SpeechSynthesisUtterance = prevUtterance;
  }
});
