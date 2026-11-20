import { ART, createPose } from './temple-art.js?v=hang-rong-v3.2';
import { TempleParticleEngine } from './particles.js?v=hang-rong-v3.1';
import { sampleRitual } from './rituals.js?v=hang-rong-v2.0';
import { createHall } from './hall.js?v=hang-rong-v5.9';
import { createRitualStage } from './ritual-stage.js?v=hang-rong-v2.0';
import { renderRitualBoard } from './ritual-board.js?v=hang-rong-v2.0';
import { createNarration } from './narration.js?v=hang-rong-v2.0';
import { musicURL } from './music-files.js?v=hang-rong-v2.0';
import { createVoiceEngine } from './voice-engine.js?v=voice-queue-v3.7';
import { resolveWsUrl } from './ws-url.js';
import { pickButAppearance, BUT_CONTACT_DISPLAY } from './but-lines.js?v=but-v3';

const $ = id => document.getElementById(id);
const preview = location.pathname === '/preview';
// A phone is usually a viewer, not the OBS encoder. Avoid loading a second
// full TradingView canvas on its smaller GPU/CPU.
const liteMode = matchMedia('(max-width: 700px), (prefers-reduced-motion: reduce)').matches;
document.body.classList.toggle('preview', preview);
document.body.classList.toggle('lite-mode', liteMode);

let sprites = ART.anchors.map((_, i) => {
  const frame = createPose(i, 330, 0);
  frame.classList.toggle('active', i === 3);
  $('sprites').append(frame);
  return frame;
});
const sheet = new Image();
sheet.src = ART.sheet;
// Do not let a slow image decode hold the live connection hostage.  The
// Overlay connects immediately; visuals may finish warming up a moment later.
const decodeImage = img => Promise.race([
  img.decode().catch(() => undefined),
  new Promise(resolve => setTimeout(resolve, 3000))
]);
const ready = Promise.all([sheet, document.querySelector('.background')].map(decodeImage));

const noParticles = new Proxy({}, { get: () => () => {} });
const particles = liteMode ? noParticles : new TempleParticleEngine($('particles'));
particles.setIncenseTips([{ x: 540, y: 768 }]);

const hall = createHall($('hall'));
const ritualStage = createRitualStage($('ritualLayer'));
renderRitualBoard($('ritualTiers'));

// These values are read by fit() during module initialization, so they must
// exist before the first layout pass.
let currentOverlaySymbol = '';
let currentOverlayTimeframe = '';
let lastServerChartKey = '';
let currentChartRatio = 'auto'; // 'auto' | 'standard' | 'cinema'
// Scale up compact TradingView viewport proportionally so candlesticks,
// wicks and axis numbers remain large and readable on vertical phone LIVE streams.
let isUltraSharp = true;

function fit() {
  $('stage').style.transform = `scale(${Math.min(innerWidth / 1080, innerHeight / 1920)})`;
  if (typeof autoAdjustChartAspect === 'function') autoAdjustChartAspect();
}
addEventListener('resize', fit);
fit();

let ws, self, state, viralState, lastJob, sentComplete, noticeId, lastFrame = 0;
let lastOverlayEventId = '', overlayPollTimer = null, overlayPollBusy = false;
const receivedOverlayEventIds = new Set();
const replayableOverlayEvents = new Set([
  'tug_state_broadcast', 'tug_result_broadcast', 'wheel_result_broadcast',
  'siren_alert_broadcast', 'siren_resolved_broadcast', 'breaking_news_broadcast',
  'street_comedy_broadcast', 'trader_legend_broadcast', 'trader_walk_in',
  'but_visit_broadcast', 'thousand_likes_broadcast', 'new_follower_broadcast'
]);

function acceptOverlayEvent(msg) {
  if (!replayableOverlayEvents.has(msg.type) || !msg.eventId) return true;
  if (receivedOverlayEventIds.has(msg.eventId)) return false;
  receivedOverlayEventIds.add(msg.eventId);
  // Bound the de-duplication cache so an all-night stream stays lightweight.
  if (receivedOverlayEventIds.size > 250) receivedOverlayEventIds.delete(receivedOverlayEventIds.values().next().value);
  lastOverlayEventId = msg.eventId;
  return true;
}

async function recoverOverlayEvents() {
  if (overlayPollBusy) return;
  overlayPollBusy = true;
  try {
    const after = lastOverlayEventId ? `?after=${encodeURIComponent(lastOverlayEventId)}` : '';
    const response = await fetch(`/api/overlay/events${after}`, { cache: 'no-store' });
    if (!response.ok) return;
    const payload = await response.json();
    for (const event of payload.events || []) dispatchRealtimeEvent(event);
  } catch {
    // WebSocket will normally deliver instantly; the next short poll retries.
  } finally {
    overlayPollBusy = false;
  }
}

function scheduleOverlayRecovery(delay = 900) {
  clearTimeout(overlayPollTimer);
  overlayPollTimer = setTimeout(async () => {
    await recoverOverlayEvents();
    scheduleOverlayRecovery();
  }, delay);
}

// Used by both the WebSocket fast path and the HTTP recovery path.  The same
// event ID is ignored if both transports happen to deliver it.
function dispatchRealtimeEvent(msg) {
  if (!acceptOverlayEvent(msg)) return false;
  if (msg.type === 'tug_state_broadcast') renderTugState(msg.data);
  else if (msg.type === 'tug_result_broadcast') handleTugResult(msg.data);
  else if (msg.type === 'wheel_result_broadcast') spinWheel(msg.data);
  else if (msg.type === 'siren_alert_broadcast') triggerSiren(msg.data);
  else if (msg.type === 'siren_resolved_broadcast') resolveSiren(msg.data);
  else if (msg.type === 'breaking_news_broadcast') showBreakingNews(msg.data);
  else if (msg.type === 'thousand_likes_broadcast') handleThousandLikesCelebration(msg.data);
  else if (msg.type === 'new_follower_broadcast') handleNewFollowerCelebration(msg.data);
  else if (msg.type === 'street_comedy_broadcast') triggerStreetComedy(msg.data?.scenario || msg.data?.type);
  else if (msg.type === 'trader_legend_broadcast') triggerLegendProclamation(msg.data?.legend || msg.data);
  else if (msg.type === 'trader_walk_in') triggerTraderWalkIn(msg.data);
  else if (msg.type === 'but_visit_broadcast') triggerButVisit(msg.data);
  // Receipt is sent only after the local visual handler has started. This lets
  // the remote controller distinguish “request reached server” from “OBS has
  // actually received and begun showing the command”.
  if (!preview && msg.eventId) send('overlay-rendered', { eventId: msg.eventId, eventType: msg.type });
  return true;
}
let ctx, music, musicPath, lastPhase = '', milestones = new Set();
let ducked = false, sirenDucked = false, voiceDucked = false, lastActivityId = null;

// Sparse, human crowd requests: these are deliberately low-priority so they
// never drown out alerts, gifts, or the host's major show moments.
const CROWD_VOICE_LINES = [
  { voiceMode: 'female', text: 'Anh ơi, xin một kèo an toàn với ạ!' },
  { voiceMode: 'male', text: 'Trưởng thôn cho em xin kèo, em ngồi chờ nãy giờ rồi!' },
  { voiceMode: 'female', text: 'Có kèo nào đẹp thì gọi em với nha!' },
  { voiceMode: 'male', text: 'Cho xin một lệnh nhẹ tay, đừng quét hai đầu!' },
  { voiceMode: 'female', text: 'Em xin kèo xanh thôi, tài khoản em yếu tim lắm!' },
  { voiceMode: 'male', text: 'Anh em cho xin tín hiệu, em hứa đặt stop-loss!' }
];
let crowdVoiceTimer = null;

function triggerCrowdVoiceRequest() {
  if (!isPrimary() || document.hidden || ctx?.state !== 'running') return scheduleCrowdVoiceRequest();
  const line = CROWD_VOICE_LINES[Math.floor(Math.random() * CROWD_VOICE_LINES.length)];
  const seats = [...document.querySelectorAll('#hall .hall-person')];
  const seat = seats[Math.floor(Math.random() * seats.length)];
  if (seat) {
    const speech = seat.querySelector('.trader-speech');
    const gesture = seat.querySelector('.trader-gesture');
    if (speech) speech.textContent = line.text.replace(/^.*?:\s*/, '').replace(' ạ!', '!');
    if (gesture) gesture.textContent = line.voiceMode === 'female' ? '🙋‍♀️' : '🙋‍♂️';
    seat.classList.add('talking', 'gesturing');
    setTimeout(() => { if (speech) speech.textContent = ''; seat.classList.remove('talking', 'gesturing'); }, 6200);
  }
  voiceEngine.speak(line.text, { priority: 5, category: 'crowd-request', voiceMode: line.voiceMode, pitch: line.voiceMode === 'female' ? 1.12 : .94, rate: 1.04 });
  scheduleCrowdVoiceRequest();
}

function scheduleCrowdVoiceRequest() {
  clearTimeout(crowdVoiceTimer);
  crowdVoiceTimer = setTimeout(triggerCrowdVoiceRequest, 28000 + Math.floor(Math.random() * 18000));
}
scheduleCrowdVoiceRequest();

const isPrimary = () => !preview && self && state?.renderer === self;
let wasPrimary = false;
let embeddedMuted = false;

const recentSocialCelebrations = new Map();
function shouldSpeakCelebration(key, cooldownMs = 4500) {
  if (!key) return true;
  const now = Date.now();
  const prev = recentSocialCelebrations.get(key) || 0;
  if (now - prev < cooldownMs) return false;
  recentSocialCelebrations.set(key, now);
  if (recentSocialCelebrations.size > 80) {
    const oldest = recentSocialCelebrations.keys().next().value;
    if (oldest !== undefined) recentSocialCelebrations.delete(oldest);
  }
  return true;
}

const narration = createNarration({
  isPrimary,
  getConfig: () => state?.config,
  onError: id => send('audio-error', { id }),
  onDucking: value => { ducked = value; updateMusic(); }
});

const rawVoiceEngine = createVoiceEngine({
  onDucking: value => { voiceDucked = value; updateMusic(); },
  enabled: true
});
// Only the unlocked primary broadcast overlay owns live speech; secondary tabs
// and muted embedded previews must never start speech (nor kill sibling speech).
const voiceEngine = new Proxy(rawVoiceEngine, {
  get(target, key) {
    const value = target[key];
    if (typeof value !== 'function') return value;
    if (String(key).startsWith('speak')) {
      return (...args) => (ctx?.state === 'running' && isPrimary() && !embeddedMuted ? value.apply(target, args) : false);
    }
    return value.bind(target);
  }
});

function send(type, data = {}) {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, ...data }));
}

async function enableAudio() {
  if (preview) return;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    const isRunning = ctx.state === 'running';
    if ($('enableAudio')) $('enableAudio').hidden = !isRunning;
    if (isPrimary()) {
      send('audio', { enabled: isRunning });
    }
    voiceEngine.unlock();
    updateMusic();
    if (isRunning) tone('bell');
  } catch {
    if ($('enableAudio')) $('enableAudio').hidden = false;
  }
}
if ($('enableAudio')) $('enableAudio').onclick = enableAudio;

// Global interaction unlock & parent message unlock
['click', 'touchstart', 'pointerdown', 'keydown'].forEach(evt => {
  window.addEventListener(evt, () => {
    if (!ctx || ctx.state !== 'running') enableAudio();
    voiceEngine.unlock();
  }, { passive: true });
});

window.addEventListener('message', e => {
  if (e.data === 'enable-audio' || e.data?.type === 'enable-audio') {
    enableAudio();
    voiceEngine.unlock();
  }
  if (e.data?.type === 'voice-speak') {
    const d = e.data;
    if (d.category === 'welcome') voiceEngine.speakWelcome(d.name, true);
    else if (d.category === 'follow') voiceEngine.speakFollow(d.name, true);
    else if (d.category === 'gift') voiceEngine.speakGift(d.name, d.giftName, d.count, d.coins || 0);
    else if (d.category === 'dog') voiceEngine.speakDog(d.quote);
    else voiceEngine.speak(d.text);
  }
  if (e.data?.type === 'set-stealth-watermark') {
    const shield = $('stealthShield');
    const grid = $('stealthWatermarkGrid');
    if (shield) {
      if (e.data.reveal) {
        shield.classList.add('revealed');
      } else {
        shield.classList.remove('revealed');
      }
    }
    if (grid && e.data.opacity != null && !e.data.reveal) {
      grid.style.opacity = e.data.opacity;
    }
  }
  if (e.data?.type === 'set-chart-ratio') {
    setChartRatio(e.data.ratio || 'auto');
  }
  if (e.data?.type === 'set-chart-sharpness') {
    setChartSharpness(!!e.data.sharp);
  }
  if (e.data?.type === 'set-chart-timeframe') {
    updateOverlayTradingView(currentOverlaySymbol || 'OANDA:XAUUSD', e.data.tf || '15', true);
  }
  if (e.data?.type === 'trigger-street-comedy') {
    triggerStreetComedy(e.data.scenario);
  }
  if (e.data?.type === 'trigger-legend-proclamation') {
    triggerLegendProclamation(e.data.legend);
  }
  if (e.data?.type === 'trigger-trader-walk-in') {
    triggerTraderWalkIn(e.data);
  }
  if (e.data?.type === 'trigger-but-visit') {
    triggerButVisit(e.data);
  }
  if (e.data?.type === 'trigger-follower-celebration') {
    handleNewFollowerCelebration(e.data);
  }
  if (e.data?.type === 'trigger-thousand-likes') {
    handleThousandLikesCelebration(e.data);
  }
  if (e.data?.type === 'set-voice-name') {
    if (voiceEngine && typeof voiceEngine.setVoiceByName === 'function') {
      voiceEngine.setVoiceByName(e.data.name);
    }
  }
  if (e.data?.type === 'set-embedded-preview') {
    embeddedMuted = !!e.data.muted;
    if (voiceEngine) {
      voiceEngine.setEnabled(!embeddedMuted && (state?.config?.voiceEnabled ?? true));
    }
    if (embeddedMuted) {
      narration.stop();
      music?.pause();
    } else {
      updateMusic();
    }
  }
});

// Check URL param for watermark reveal
if (new URLSearchParams(location.search).get('revealWatermark') === '1') {
  $('stealthShield')?.classList.add('revealed');
}

// ============================================================================
// Zero-Dependency Web Audio Synthesis Engine (Temple Bells + Cyberpunk FX)
// ============================================================================
function tone(kind = 'bell') {
  if (!ctx || ctx.state !== 'running' || !isPrimary() || embeddedMuted) return;
  const volume = state?.config?.volume ?? 0.8;
  if (volume <= 0) return;
  const t = ctx.currentTime;

  if (kind === 'wood-click') {
    // Short burst noise + bandpass filter (350Hz, Q=12, decay 0.03s)
    try {
      const bufferSize = Math.floor(ctx.sampleRate * 0.035);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.007));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 350;
      filter.Q.value = 12;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(t);
      noise.stop(t + 0.035);
    } catch {}
    return;
  }

  if (kind === 'siren') {
    // Frequency Ramp Sawtooth: 400Hz -> 950Hz -> 400Hz
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.linearRampToValueAtTime(950, t + 0.38);
      osc.frequency.linearRampToValueAtTime(400, t + 0.75);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(volume * 0.28, t + 0.05);
      gain.gain.setValueAtTime(volume * 0.28, t + 0.7);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.85);
    } catch {}
    return;
  }

  if (kind === 'bull-win') {
    // Triumphant ascending arpeggio (E4, G4, B4, E5) + bell/chime harmonics
    const notes = [329.63, 392.00, 493.88, 659.25, 1318.5];
    notes.forEach((freq, idx) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx === notes.length - 1 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.09);
        gain.gain.setValueAtTime(0.0001, t + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(volume * 0.25 / (idx + 1), t + idx * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.09 + (idx === notes.length - 1 ? 1.6 : 0.6));
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + idx * 0.09);
        osc.stop(t + idx * 0.09 + (idx === notes.length - 1 ? 1.7 : 0.7));
      } catch {}
    });
    return;
  }

  if (kind === 'bear-win') {
    // Dramatic descending heavy gong / bass impact: 220Hz -> 140Hz -> 90Hz
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(75, t + 1.2);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, t);
      filter.frequency.exponentialRampToValueAtTime(120, t + 1.2);

      gain.gain.setValueAtTime(volume * 0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.0);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 2.1);
    } catch {}
    return;
  }

  if (kind === 'breaking-news' || kind === 'fanfare') {
    // TV news fanfare triad (G4, C5, E5, G5)
    const freqs = [392.00, 523.25, 659.25, 783.99];
    freqs.forEach((freq, idx) => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.08);
        gain.gain.setValueAtTime(0.0001, t + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(volume * 0.22, t + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.08 + 0.7);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + idx * 0.08);
        osc.stop(t + idx * 0.08 + 0.75);
      } catch {}
    });
    return;
  }

  if (kind === 'broken-glass') {
    try {
      const bufferSize = Math.floor(ctx.sampleRate * 0.28);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.04));
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2200;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume * 0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(t);
      noise.stop(t + 0.28);
    } catch {}
    return;
  }

  if (kind === 'chime') {
    for (const [i, f] of [880, 1320, 1760].entries()) {
      try {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(volume * 0.15 / (i + 1), t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t);
        o.stop(t + 0.9);
      } catch {}
    }
    return;
  }

  if (kind === 'gong') {
    const gongFreqs = [140, 280, 420, 560];
    for (const [i, f] of gongFreqs.entries()) {
      try {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = i === 0 ? 'sine' : 'triangle';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(volume * 0.22 / (i + 1), t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 4.2);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t);
        o.stop(t + 4.5);
      } catch {}
    }
    return;
  }

  if (kind === 'chicken') {
    try {
      for (let c = 0; c < 3; c++) {
        const delay = c * 0.16;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(680 - c * 50, t + delay);
        o.frequency.exponentialRampToValueAtTime(320, t + delay + 0.13);
        g.gain.setValueAtTime(0.0001, t + delay);
        g.gain.exponentialRampToValueAtTime(volume * 0.16, t + delay + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.14);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t + delay);
        o.stop(t + delay + 0.15);
      }
    } catch {}
    return;
  }

  if (kind === 'dog_bark') {
    try {
      for (let b = 0; b < 2; b++) {
        const delay = b * 0.20;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(260, t + delay);
        o.frequency.exponentialRampToValueAtTime(140, t + delay + 0.14);
        g.gain.setValueAtTime(0.0001, t + delay);
        g.gain.exponentialRampToValueAtTime(volume * 0.18, t + delay + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.15);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(t + delay);
        o.stop(t + delay + 0.16);
      }
    } catch {}
    return;
  }

  if (kind === 'slapstick_run') {
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(280, t);
      o.frequency.linearRampToValueAtTime(850, t + 0.4);
      o.frequency.linearRampToValueAtTime(220, t + 0.8);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(volume * 0.18, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.9);
    } catch {}
    return;
  }

  // Default: Bell (Temple Great Bell)
  const bellFreqs = kind !== 'like' ? [220, 445, 665, 1120] : [450, 760];
  for (const [i, f] of bellFreqs.entries()) {
    try {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(volume * (kind !== 'like' ? .11 : .2) / (i + 1), t + .01);
      g.gain.exponentialRampToValueAtTime(.0001, t + (kind !== 'like' ? 3.5 : .18));
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      o.stop(t + (kind !== 'like' ? 4 : .2));
    } catch {}
  }
}

function updateMusic() {
  const filename = state?.config?.musicFile;
  // Background audio is an HTMLAudioElement and can be allowed to autoplay by
  // OBS even before Web Audio is unlocked.  Do not unnecessarily wait for an
  // AudioContext: try immediately, then reveal the explicit unlock button
  // only if Chromium rejects autoplay.
  if (!filename || embeddedMuted || preview) {
    music?.pause();
    return;
  }
  if (musicPath !== filename) {
    music?.pause();
    if (music) { music.removeAttribute('src'); music.load(); }
    music = new Audio(musicURL(filename));
    music.loop = true;
    musicPath = filename;
    music.onerror = () => {
      if ($('connection')) {
        $('connection').hidden = false;
        $('connection').textContent = 'Không phát được nhạc nền. Kiểm tra file và chọn lại bài trong admin.';
      }
    };
  }
  // Audio ducking priority: Siren drops to 15%, regular ducking (fortune/TTS) drops to 30%
  const isDucking = sirenDucked || ducked || voiceDucked;
  const duckMultiplier = sirenDucked ? 0.15 : (isDucking ? 0.316 : 1);
  const baseVol = (state?.config?.musicVolume != null) ? state.config.musicVolume : 0.35;
  music.volume = Math.max(0, Math.min(1, baseVol * duckMultiplier));
  if (music.paused) {
    music.play().then(() => {
      if ($('enableAudio')) $('enableAudio').hidden = true;
    }).catch(() => {
      if ($('enableAudio')) $('enableAudio').hidden = false;
    });
  }
}

const safeImage = value => {
  try {
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol) ? u.href : '';
  } catch {
    return '';
  }
};

function setJob(job) {
  narration.setJob(job);
  document.body.classList.remove('reading-fortune', 'thanking-donor');
  $('donationThanks').hidden = true;
  $('walker').hidden = !job;
  for (const key of ['fortune', 'lantern', 'ceremony']) $(key).hidden = true;
  ritualStage(null);
  hall.animate(null);
  milestones = new Set();
  lastPhase = '';
  if (!job) return;

  if (job.thanks) {
    const thanks = job.thanks;
    $('thanksName').textContent = thanks.nickname;
    $('thanksCoins').textContent = `${Number(thanks.coins).toLocaleString('vi-VN')} xu`;
    $('thanksGift').textContent = `${thanks.giftName} ×${thanks.quantity}${job.simulated ? ' · Tương tác thử' : ''}`;
    const initial = $('thanksInitial'), avatar = $('thanksAvatar');
    initial.textContent = Array.from(thanks.nickname)[0] || '♡';
    initial.hidden = false;
    const image = safeImage(thanks.avatar);
    avatar.hidden = !image;
    avatar.onerror = () => { avatar.hidden = true; initial.hidden = false; };
    if (image) { avatar.src = image; initial.hidden = true; } else avatar.removeAttribute('src');
  }

  $('name').textContent = job.nickname;
  $('action').textContent = `${state.actions[job.action]}${job.kind === 'gift' ? ` · ${job.giftName} ×${job.quantity}` : ''}${job.simulated ? ' · Thử' : ''}`;
  $('wish').textContent = '';
  $('initial').textContent = job.nickname.slice(0, 1).toUpperCase();
  $('initial').hidden = false;
  const src = safeImage(job.avatar);
  $('avatar').hidden = !src;
  if (src) { $('avatar').src = src; $('initial').hidden = true; }
  $('avatar').onerror = () => { $('avatar').hidden = true; $('initial').hidden = false; };
  $('lanternText').textContent = job.comment || 'Bình an';

  if (job.fortune) {
    $('fortuneNumber').textContent = `LỜI XĂM SỐ ${job.fortune.number}`;
    $('fortuneTitle').textContent = job.fortune.title;
    $('fortunePoem').textContent = job.fortune.text;
    $('fortuneText').textContent = job.fortune.message;
    $('fortuneRecipient').textContent = `Gửi ${job.nickname}`;
  }
  $('ceremonyName').textContent = job.nickname;
}

function render(s) {
  const previousRenderer = state?.renderer;
  state = s;
  $('title').textContent = s.config.sceneTitle;
  $('channel').textContent = s.source.status === 'connected' ? '@' + s.source.username : 'Hữu duyên gặp gỡ';
  $('top').replaceChildren();
  const leaders = s.hall?.leaderboard || [];
  $('rankingTitle').textContent = s.hall?.mode === 'demo' ? 'TOP MÔ PHỎNG' : 'Tấm lòng thành';
  $('ritualBoard').hidden = !s.config.showRitualBoard;
  $('ranking').hidden = !s.config.showLeaderboard;
  $('sessionTotal').textContent = s.hall?.mode === 'demo' ? 'Xóm Trade mô phỏng' : `${s.hall?.totalCoins.toLocaleString('vi-VN') || 0} xu trong phiên`;
  hall.render(s.hall);
  const totalReal = s.hall?.totalParticipants || 0;
  $('hallRoster').textContent = s.hall?.mode === 'demo'
    ? `Xóm Trade mô phỏng · ${totalReal} người`
    : totalReal > 0
      ? `Xóm Trade LIVE · ${totalReal} khách${s.hall?.rotationPages > 1 ? ` · Nhóm ${s.hall.rotationPage}/${s.hall.rotationPages}` : ''}`
      : 'Xóm Trade · Đang đón khách TikTok LIVE';

  const activity = s.interactions?.current;
  $('interactionName').textContent = activity?.nickname || '';
  $('interactionText').textContent = activity?.text || '';
  $('interactionCount').textContent = activity?.count > 1 ? `${activity.count} tương tác được ghi nhận` : '';

  // Trigger Intelligent Voice Narration for Live Interactions
  if (activity && activity.id !== lastActivityId) {
    lastActivityId = activity.id;
    if (activity.kind === 'follow') {
      handleNewFollowerCelebration({ nickname: activity.nickname });
    } else if (activity.kind === 'like' && Number(activity.count) >= 1000) {
      handleThousandLikesCelebration({ nickname: activity.nickname, likeCount: activity.count });
    } else if (s.config?.voiceEnabled !== false) {
      if (activity.kind === 'join') {
        voiceEngine.speakWelcome(activity.nickname);
      } else if (activity.kind === 'gift') {
        voiceEngine.speakGift(activity.nickname, activity.giftName || 'Hoa Hồng', activity.quantity || activity.count || 1, activity.coins || s.notice?.coins || 0);
      }
    }
  }

  if (!leaders.length) {
    const p = document.createElement('p');
    p.textContent = 'Chưa có người tặng quà';
    $('top').append(p);
  }
  leaders.slice(0, 4).forEach((u, i) => {
    const row = document.createElement('div');
    row.className = 'rank-row';
    const name = document.createElement('span'), points = document.createElement('b');
    name.textContent = `${i + 1}. ${u.name}`;
    points.textContent = `${u.coins.toLocaleString('vi-VN')} xu`;
    row.append(name, points);
    $('top').append(row);
  });

  $('nextName').textContent = s.queue[0]?.nickname || 'Chờ người hữu duyên';
  $('waiting').textContent = `${s.queue.length} lượt chờ${s.paused ? ' · Tạm dừng' : ''}`;

  if (s.current?.id !== lastJob) {
    lastJob = s.current?.id;
    sentComplete = null;
    setJob(s.current);
  }

  if (s.notice && s.notice.id !== noticeId) {
    noticeId = s.notice.id;
    $('giftNotice').replaceChildren();
    const title = document.createElement('strong'), detail = document.createElement('small');
    title.textContent = `${s.notice.nickname} · ${s.notice.giftName} ×${s.notice.quantity}${s.notice.coins > 0 ? ` (+${s.notice.coins} xu)` : ''}`;
    detail.textContent = s.notice.simulated ? 'Tương tác thử' : 'Cảm ơn tấm lòng của bạn';
    $('giftNotice').append(title, detail);
    if (s.config?.voiceEnabled !== false && (!activity || activity.kind !== 'gift')) {
      voiceEngine.speakGift(s.notice.nickname, s.notice.giftName, s.notice.quantity, s.notice.coins || 0);
    }
  }

  if (s.config?.voiceEnabled !== undefined) voiceEngine.setEnabled(!embeddedMuted && s.config.voiceEnabled);
  if (s.config?.voiceVolume !== undefined) voiceEngine.setVolume(s.config.voiceVolume);

  if ($('enableAudio') && (!ctx || ctx.state !== 'running')) $('enableAudio').hidden = false;
  const currentlyPrimary = isPrimary();
  if (previousRenderer !== s.renderer && currentlyPrimary) enableAudio();
  if (!currentlyPrimary) {
    narration.stop();
    const vst = voiceEngine.getState?.();
    if (wasPrimary || vst?.isSpeaking || (vst?.queueLength || 0) > 0) {
      voiceEngine.stop();
    }
  }
  wasPrimary = currentlyPrimary;
  updateMusic();
  const serverChartSymbol = s.config.chartSymbol || 'OANDA:XAUUSD';
  const serverChartTf = s.config.chartTimeframe || '15';
  const serverChartKey = `${serverChartSymbol}:${serverChartTf}`;
  if (serverChartKey !== lastServerChartKey) {
    lastServerChartKey = serverChartKey;
    updateOverlayTradingView(serverChartSymbol, serverChartTf);
  }
}

function autoAdjustChartAspect() {
  const board = $('forexChartBoard');
  const tvFrame = $('tv_chart_container');
  const chip = $('chartAspectChip');
  if (!board || !tvFrame) return;

  board.classList.toggle('sharp-ultra', isUltraSharp);
  board.classList.toggle('ratio-cinema', currentChartRatio === 'cinema');
  board.classList.toggle('ratio-standard', currentChartRatio === 'standard');

  const boardHeight = currentChartRatio === 'cinema'
    ? 740
    : currentChartRatio === 'standard'
      ? 620
      : 700;
  board.style.height = `${boardHeight}px`;

  const compactViewport = innerWidth < 700 || (innerHeight / Math.max(innerWidth, 1)) > 1.35;
  const chartZoom = compactViewport
    ? (isUltraSharp ? 2.25 : 1.75)
    : (isUltraSharp ? 2.0 : 1.55);
  board.style.setProperty('--chart-zoom', String(chartZoom));

  const boardTop = 74;
  const tugTop = boardTop + boardHeight + 10;
  const tugHeight = 148;
  const panelTop = tugTop + tugHeight + 10;
  const tugArena = $('tugArena');
  const ritualBoard = document.querySelector('.ritual-board');
  const rankingBoard = $('ranking') || document.querySelector('.ranking');
  if (tugArena) tugArena.style.top = `${tugTop}px`;
  if (ritualBoard) ritualBoard.style.top = `${panelTop}px`;
  if (rankingBoard) rankingBoard.style.top = `${panelTop}px`;

  if (chip) {
    const modeLabel = currentChartRatio === 'cinema'
      ? 'MỞ RỘNG'
      : currentChartRatio === 'standard'
        ? 'TIÊU CHUẨN'
        : 'TỰ CÂN ĐỐI';
    chip.textContent = `🔍 ${chartZoom.toFixed(2)}× · ${modeLabel}`;
  }
  // The flex column owns this height: this prevents a few-pixel downward
  // overflow when the board header or border is scaled by OBS.
  tvFrame.style.height = 'auto';
}

function setChartRatio(ratio = 'auto') {
  currentChartRatio = ratio;
  autoAdjustChartAspect();
}

function setChartSharpness(sharp = true) {
  isUltraSharp = sharp;
  autoAdjustChartAspect();
}

window.setChartRatio = setChartRatio;
window.setChartSharpness = setChartSharpness;

function updateOverlayTradingView(symbol = 'OANDA:XAUUSD', tf = '15', force = false) {
  const container = $('tv_chart_container');
  if (!container) return;

  const symbolNames = {
    'FX:EURUSD': 'EUR/USD',
    'FX:GBPUSD': 'GBP/USD',
    'FX:USDJPY': 'USD/JPY',
    'OANDA:XAUUSD': 'VÀNG (XAU/USD)'
  };
  const tfText = String(tf) === '1D'
    ? '1D'
    : String(tf) === '240'
      ? '4H'
      : String(tf) === '60'
        ? '1H'
        : `${tf}M`;
  if ($('forexBoardTitle')) {
    $('forexBoardTitle').textContent = `📺 ĐẠI MÀN CHIẾU NẾN · ${symbolNames[symbol] || symbol} (${tfText})`;
  }

  autoAdjustChartAspect();

  if (!force && currentOverlaySymbol === symbol && currentOverlayTimeframe === tf) {
    if (container.querySelector('iframe')) return;
  }
  currentOverlaySymbol = symbol;
  currentOverlayTimeframe = tf;

  // Omit &range= so TradingView renders its natural, zoomed-in candle density
  // across all symbols and timeframes instead of cramming 1D–5D of bars in.
  const chartFeedSymbol = symbol;
  const directEmbedUrl = `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(chartFeedSymbol)}&interval=${tf}&theme=dark&style=1&timezone=Asia%2FHo_Chi_Minh&locale=vi_VN&backgroundColor=%23131722&hide_side_toolbar=1&hide_top_toolbar=1&hide_legend=1&allow_symbol_change=0&save_image=0&withdateranges=0`;

  const existingIframe = container.querySelector('iframe');
  if (existingIframe) {
    if (existingIframe.src !== directEmbedUrl) {
      existingIframe.src = directEmbedUrl;
    }
  } else {
    container.replaceChildren();
    const iframe = document.createElement('iframe');
    iframe.id = 'tv_widget_iframe';
    iframe.src = directEmbedUrl;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = '0';
    iframe.style.display = 'block';
    iframe.setAttribute('allowtransparency', 'true');
    iframe.setAttribute('scrolling', 'no');
    container.appendChild(iframe);
  }
}

// Real XAU/USD spot reference.  Never fabricate a tick: the server fetches a
// cached keyless spot source and this renderer labels stale/unavailable data.
let currentGoldPrice = null;
let marketBias = 0;
let lastTugState = null;

async function refreshLiveGoldPrice() {
  const priceEl = $('forexCurrentPrice');
  const diffEl = $('forexPriceDiff');
  const pillEl = $('forexLivePricePill');
  const statusEl = $('forexStatusTag');
  if (!priceEl || !diffEl) return;
  try {
    const response = await fetch('/api/market/xauusd', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const quote = await response.json();
    const price = Number(quote?.price);
    if (!Number.isFinite(price) || price <= 0) throw new Error('Chưa có giá XAU/USD thực');

    const delta = Number.isFinite(Number(quote.change)) ? Number(quote.change) : null;
    const diffPct = Number.isFinite(Number(quote.changePercent)) ? Number(quote.changePercent) : null;
    const isUp = delta === null || delta === 0 ? null : delta > 0;
    const status = quote.status === 'fresh' ? 'fresh' : 'stale';
    currentGoldPrice = price;
    priceEl.textContent = price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    diffEl.textContent = delta === null
      ? '• VỪA ĐỒNG BỘ'
      : delta === 0
        ? '• KHÔNG ĐỔI / PHIÊN'
        : `${isUp ? '▲ +' : '▼ '}${Math.abs(delta).toFixed(2)} · ${isUp ? '+' : ''}${diffPct.toFixed(3)}% PHIÊN`;
    diffEl.className = `price-diff ${isUp === false ? 'bear' : 'bull'}`;
    if (statusEl) statusEl.textContent = status === 'fresh' ? '● XAU SPOT · 30s' : '⚠ XAU SPOT · DỮ LIỆU CŨ';
    if (pillEl) {
      pillEl.title = `XAU/USD spot · nguồn ${quote.source || 'xaus.com'} · ${quote.asOf || 'đang cập nhật'}`;
      pillEl.classList.toggle('tick-up', isUp === true && delta !== 0);
      pillEl.classList.toggle('tick-down', isUp === false && delta !== 0);
    }

    const direction = isUp === false ? 'bear' : 'bull';
    const strength = delta === null ? 0 : Math.min(100, Math.round(Math.abs(delta) / Math.max(price * 0.00025, 0.01) * 100));
    marketBias = Math.max(-18, Math.min(18, marketBias * .45 + (direction === 'bull' ? 1 : -1) * strength * .24));
    const arena = $('tugArena');
    const signal = $('tugMarketSignal');
    if (arena) {
      arena.dataset.market = direction;
      arena.classList.toggle('market-fomo', strength >= 72);
    }
    if (signal) signal.textContent = delta === null
      ? '● XAU/USD SPOT ĐÃ ĐỒNG BỘ · CHỜ TICK KẾ TIẾP'
      : delta === 0
        ? '● XAU/USD SPOT ĐI NGANG · KHÔNG CÓ TICK MỚI'
      : `${direction === 'bull' ? '🟢 XAU SPOT TĂNG' : '🔴 XAU SPOT GIẢM'} · ${Math.abs(delta).toFixed(2)} USD / PHIÊN`;
    if (lastTugState) renderTugState(lastTugState, true);
  } catch (error) {
    priceEl.textContent = '—';
    diffEl.textContent = 'ĐANG CHỜ XAU/USD SPOT';
    diffEl.className = 'price-diff bear';
    if (statusEl) statusEl.textContent = '⚠ CHƯA CÓ DỮ LIỆU THỰC';
    if (pillEl) pillEl.title = 'Chưa nhận được giá XAU/USD spot — không hiển thị giá mô phỏng.';
  }
}
refreshLiveGoldPrice();
setInterval(refreshLiveGoldPrice, 12000);

// ============================================================================
// 1. Bull vs Bear Tug of War (Kéo Co Đại Chiến) Controller
// ============================================================================
let victoryOverlayTimer = null;
function renderTugState(tug, visualOnly = false) {
  if (!tug) return;
  lastTugState = tug;

  const bullPower = Math.round(tug.bullPower || 0);
  const bearPower = Math.round(tug.bearPower || 0);
  const timeLeft = Math.max(0, Math.round(tug.timeLeftSec || 0));
  const ropePos = Number(tug.ropePosition || 0);
  if (tug.status === 'active' && !visualOnly) {
    // Final seconds feel visibly tighter even before the result is announced.
    hall.setMood(timeLeft <= 9 ? 'tense' : (ropePos >= 0 ? 'tug-bull' : 'tug-bear'), 3600);
  }

  if ($('bullForce')) $('bullForce').textContent = `Lực: ${bullPower.toLocaleString('vi-VN')} kg`;
  if ($('bearForce')) $('bearForce').textContent = `Lực: ${bearPower.toLocaleString('vi-VN')} kg`;

  if ($('tugTimer')) {
    $('tugTimer').textContent = tug.status === 'active' ? `${timeLeft}s` : (tug.status === 'finished' ? 'HẾT GIỜ' : 'CHỜ HIỆP');
  }

  // Dual power gauges
  const totalPower = bullPower + bearPower;
  let bullPct = 50, bearPct = 50;
  if (totalPower > 0) {
    bullPct = Math.round((bullPower / totalPower) * 100);
    bearPct = 100 - bullPct;
  }
  // Candle momentum nudges the rendered contest; real gift/comment scores
  // remain authoritative on the server and take priority in the base values.
  const visualNudge = Math.round(marketBias * .24);
  bullPct = Math.max(5, Math.min(95, bullPct + visualNudge));
  bearPct = 100 - bullPct;
  if ($('bullGauge')) $('bullGauge').style.width = `${bullPct}%`;
  if ($('bearGauge')) $('bearGauge').style.width = `${bearPct}%`;

  // Bronze Chain Track & Bagua Amulet Offset
  // Range: -100% to +100% maps to -380px to +380px
  const maxPixelOffset = 380;
  const visualRopePos = Math.max(-100, Math.min(100, ropePos + marketBias));
  const pixelOffset = (visualRopePos / 100) * maxPixelOffset;
  if ($('tugAmulet')) {
    $('tugAmulet').style.setProperty('--rope-offset', `${pixelOffset}px`);
  }
  if ($('baguaPos')) {
    $('baguaPos').textContent = `${visualRopePos > 0 ? '+' : ''}${Math.round(visualRopePos)}%`;
  }

  // Mascot dynamic scale based on power
  if ($('bullMascot') && $('bearMascot')) {
    const bullScale = 1 + Math.min(0.4, (bullPower / (bearPower + 100)) * 0.3);
    const bearScale = 1 + Math.min(0.4, (bearPower / (bullPower + 100)) * 0.3);
    $('bullMascot').style.transform = `scale(${bullScale})`;
    $('bearMascot').style.transform = `scale(${bearScale})`;
  }

  // Action toast banner
  if (tug.lastAction && $('tugActionText') && !visualOnly) {
    const act = tug.lastAction;
    $('tugActionText').textContent = `${act.nickname || 'Đạo hữu'}: +${act.powerAdded}kg (${act.label || (act.side === 'bull' ? 'Long' : 'Short')})`;
  }
}

function handleTugResult(res) {
  if (!res) return;
  const overlay = $('tugVictoryOverlay');
  if (!overlay) return;

  clearTimeout(victoryOverlayTimer);
  hall.setMood('celebrate', 7600);
  overlay.hidden = false;
  overlay.classList.remove('bull-victory', 'bear-victory', 'draw-victory');

  if (res.winner === 'bull') {
    overlay.classList.add('bull-victory');
    $('victoryIcon').textContent = '🐂';
    $('victoryHeadline').textContent = res.headline || 'BÒ HÚC BAY KHÁNG CỰ! NẾN XANH DỰNG CỘT!';
    tone('bull-win');
    particles.spawnGrandCeremonyRain();
  } else if (res.winner === 'bear') {
    overlay.classList.add('bear-victory');
    $('victoryIcon').textContent = '🐻';
    $('victoryHeadline').textContent = res.headline || 'GẤU TÁT SẬP BÀN CỜ! NẾN ĐỎ CẮM THẲNG XUỐNG!';
    tone('bear-win');
    particles.spawnBellWave(540, 750, 6);
  } else {
    overlay.classList.add('draw-victory');
    $('victoryIcon').textContent = '🕯️';
    $('victoryHeadline').textContent = res.headline || 'HAI PHE HÒA NHOÀI! RỦ NHAU RA ĐÊ HÓNG MÁT!';
    tone('bell');
  }

  if (res.mvp) {
    const titleTag = res.mvp.title ? `[${res.mvp.title}] ` : '';
    $('victoryMvp').textContent = `Phong Thần MVP: ${titleTag}${res.mvp.nickname} (+${Number(res.mvp.contributedPower || 0).toLocaleString()}kg)`;
  }

  victoryOverlayTimer = setTimeout(() => {
    overlay.hidden = true;
  }, 7500);
}

// ============================================================================
// 2. Wheel of Financial Karma (Vòng Xoay Định Mệnh Gồng Lỗ)
// ============================================================================
const WHEEL_SLOT_COUNT = 8;
const WHEEL_SLOTS_DATA = [
  { index: 0, title: 'X100 Đòn Bẩy', sub: 'Margin Call', color: '#4a1512', textColor: '#ffb3ba' },
  { index: 1, title: 'Gồng Lỗ', sub: 'Bất Tử', color: '#27170e', textColor: '#f3d28a' },
  { index: 2, title: 'Cắt Ngay', sub: 'Đáy Sàn', color: '#392113', textColor: '#ffe0b2' },
  { index: 3, title: 'Chốt Non', sub: '1 Pip', color: '#442a17', textColor: '#fff0cb' },
  { index: 4, title: 'Bơm Oxy', sub: 'Thần Tốc', color: '#162e24', textColor: '#a7f3d0' },
  { index: 5, title: 'Về Bờ', sub: 'Trong Mơ', color: '#2a1a1f', textColor: '#e9d5ff' },
  { index: 6, title: 'Tâm Bất Biến', sub: 'An Nhiên', color: '#3f2915', textColor: '#fde68a' },
  { index: 7, title: 'Cột Xanh', sub: 'Chọc Nóc', color: '#144633', textColor: '#6ee7b7' }
];

let currentWheelAngle = 0;
let wheelAnimationId = null;
let wheelDismissTimer = null;

function drawWheel(angle = 0) {
  const canvas = $('wheelCanvas');
  if (!canvas) return;
  const ctx2 = canvas.getContext('2d');
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 8;

  ctx2.clearRect(0, 0, size, size);
  ctx2.save();
  ctx2.translate(center, center);
  ctx2.rotate((angle * Math.PI) / 180);

  const arc = (Math.PI * 2) / WHEEL_SLOT_COUNT;

  // Draw 8 sectors
  for (let i = 0; i < WHEEL_SLOT_COUNT; i++) {
    const slot = WHEEL_SLOTS_DATA[i];
    const startAngle = i * arc;
    const endAngle = startAngle + arc;

    ctx2.beginPath();
    ctx2.moveTo(0, 0);
    ctx2.arc(0, 0, radius, startAngle, endAngle);
    ctx2.closePath();

    ctx2.fillStyle = slot.color;
    ctx2.fill();

    // Antique bronze sector border
    ctx2.strokeStyle = '#ae854d';
    ctx2.lineWidth = 2.5;
    ctx2.stroke();

    // Slot labels
    ctx2.save();
    ctx2.rotate(startAngle + arc / 2);
    ctx2.textAlign = 'right';
    ctx2.fillStyle = slot.textColor || '#fff0cb';
    ctx2.font = 'bold 18px Georgia, serif';
    ctx2.fillText(slot.title, radius - 26, -5);
    ctx2.font = '14px "JetBrains Mono", monospace';
    ctx2.fillStyle = '#f3d28a';
    ctx2.fillText(slot.sub, radius - 26, 17);
    ctx2.restore();
  }

  // Outer bronze rim with studs
  ctx2.beginPath();
  ctx2.arc(0, 0, radius, 0, Math.PI * 2);
  ctx2.strokeStyle = '#f3d28a';
  ctx2.lineWidth = 5;
  ctx2.stroke();

  // Central Bagua hub
  ctx2.beginPath();
  ctx2.arc(0, 0, 48, 0, Math.PI * 2);
  ctx2.fillStyle = '#24140d';
  ctx2.fill();
  ctx2.strokeStyle = '#ae854d';
  ctx2.lineWidth = 4;
  ctx2.stroke();

  ctx2.font = '32px serif';
  ctx2.textAlign = 'center';
  ctx2.textBaseline = 'middle';
  ctx2.fillText('☯️', 0, 2);

  ctx2.restore();
}

function cubicBezierEasing(t, p1x = 0.15, p1y = 0.9, p2x = 0.25, p2y = 1.0) {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  function sampleX(u) { return ((ax * u + bx) * u + cx) * u; }
  function sampleY(u) { return ((ay * u + by) * u + cy) * u; }

  let u = t;
  for (let i = 0; i < 6; i++) {
    const x2 = sampleX(u) - t;
    if (Math.abs(x2) < 1e-4) break;
    const d2 = (3 * ax * u + 2 * bx) * u + cx;
    if (Math.abs(d2) < 1e-4) break;
    u -= x2 / d2;
  }
  return sampleY(Math.max(0, Math.min(1, u)));
}

function spinWheel(result) {
  if (!result) return;
  const container = $('wheelContainer');
  if (!container) return;

  clearTimeout(wheelDismissTimer);
  if (wheelAnimationId) cancelAnimationFrame(wheelAnimationId);

  container.hidden = false;
  $('wheelOracle').hidden = true;

  // The pointer is at top (12 o'clock / -90° / 270°).
  // Slot i center is at i * 45° + 22.5°.
  // When rotated counter-clockwise by (angle - 270°), slot center aligns with pointer!
  const targetAngle = Number(result.finalAngle || 1800);
  const startAngle = currentWheelAngle % 360;
  const totalDelta = targetAngle - startAngle;
  const durationMs = 4500;
  const startTime = performance.now();
  let lastSector = Math.floor(startAngle / 45);

  function animateSpin(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / durationMs);
    const eased = cubicBezierEasing(progress);
    const angle = startAngle + totalDelta * eased;

    // Detect sector notch crossing to play wood-click sound
    const currentSector = Math.floor(angle / 45);
    if (currentSector !== lastSector) {
      lastSector = currentSector;
      tone('wood-click');
    }

    currentWheelAngle = angle;
    // Rotate canvas so slot aligns under top pointer (270°)
    drawWheel(-angle + 270);

    if (progress < 1) {
      wheelAnimationId = requestAnimationFrame(animateSpin);
    } else {
      wheelAnimationId = null;
      // Revealed oracle result
      const oracle = $('wheelOracle');
      if (oracle) {
        oracle.hidden = false;
        $('oracleTitle').textContent = result.title || 'Vận Mệnh Đã Định';
        $('oracleQuote').textContent = `"${result.quote || 'Nhân quả tuần hoàn, nến xanh rồi sẽ tới!'}"`;
        $('oracleTrader').textContent = `Trader: ${result.nickname || 'Đạo Hữu'}`;
        const pts = Number(result.pointsAwarded || 0);
        $('oraclePoints').textContent = `${pts >= 0 ? '+' : ''}${pts} pts`;
      }
      tone(result.soundEffect || 'bell');

      wheelDismissTimer = setTimeout(() => {
        container.hidden = true;
      }, 6500);
    }
  }
  wheelAnimationId = requestAnimationFrame(animateSpin);
}

// Initial wheel canvas render
drawWheel(0);

// ============================================================================
// 3. Liquidity Hunt Siren (Còi Báo Động Quét Thanh Khoản)
// ============================================================================
let sirenAutoResolveTimer = null;
let sirenSynthInterval = null;
let stopLossLocalClicks = 0;

function spawnSirenDebris() {
  const layer = $('sirenDebrisLayer');
  if (!layer) return;
  layer.replaceChildren();

  const icons = ['🩴', '👒', '🩴', '📜', '👒'];
  for (let i = 0; i < 14; i++) {
    const el = document.createElement('div');
    el.className = 'siren-debris';
    el.textContent = icons[i % icons.length];
    const startX = Math.random() * 1080;
    const startY = Math.random() * 1920;
    const dx = (Math.random() - 0.5) * 800;
    const dy = (Math.random() - 0.5) * 800;
    const rot = (Math.random() * 720 - 360);
    const dur = 1.8 + Math.random() * 2.2;
    el.style.left = `${startX}px`;
    el.style.top = `${startY}px`;
    el.style.setProperty('--dx', `${dx}px`);
    el.style.setProperty('--dy', `${dy}px`);
    el.style.setProperty('--rot', `${rot}deg`);
    el.style.animationDuration = `${dur}s`;
    layer.append(el);
  }
}

function triggerSiren(alert) {
  if (!alert) return;
  const overlay = $('sirenOverlay');
  if (!overlay) return;

  clearTimeout(sirenAutoResolveTimer);
  if (sirenSynthInterval) clearInterval(sirenSynthInterval);

  overlay.hidden = false;
  hall.setMood('panic', Number(alert.durationMs || 15000));
  sirenDucked = true;
  updateMusic();

  if ($('sirenHeadline')) {
    $('sirenHeadline').textContent = alert.headline || '[BÁO ĐỘNG ĐỎ CẤP 12] CÁ MẬP QUÉT THANH KHOẢN HAI ĐẦU!';
  }
  if ($('sirenSubtext')) {
    $('sirenSubtext').textContent = alert.subtext || 'RÚT DÂY MẠNG GẤP · KHÔNG BẮT ĐÁY · NGỒI YÊN GIỮ TÂM!';
  }

  stopLossLocalClicks = 0;
  if ($('minigameClicks')) {
    $('minigameClicks').textContent = 'Đã giữ: 0/15 lần (Nhận Bàn Tay Kim Cương +50đ)';
  }

  spawnSirenDebris();

  // Siren audio loop
  tone('siren');
  sirenSynthInterval = setInterval(() => {
    tone('siren');
  }, 1200);

  const durationMs = Number(alert.durationMs || 15000);
  sirenAutoResolveTimer = setTimeout(() => {
    resolveSiren();
  }, durationMs);
}

function resolveSiren(peace) {
  const overlay = $('sirenOverlay');
  if (overlay) overlay.hidden = true;

  clearTimeout(sirenAutoResolveTimer);
  if (sirenSynthInterval) {
    clearInterval(sirenSynthInterval);
    sirenSynthInterval = null;
  }

  sirenDucked = false;
  hall.setMood('celebrate', 2200);
  updateMusic();
  tone('bell');

  if (peace?.headline) {
    showBreakingNews({
      headline: peace.headline,
      sound: 'bell',
      durationMs: 5000
    });
  }
}

// Stop Loss minigame button handler
if ($('btnStopLoss')) {
  $('btnStopLoss').onclick = () => {
    stopLossLocalClicks++;
    tone('chime');
    send('siren_stop_loss', { userId: self || 'overlay' });
    if ($('minigameClicks')) {
      if (stopLossLocalClicks >= 15) {
        $('minigameClicks').textContent = '💎 BÀN TAY KIM CƯƠNG ĐẠT ĐƯỢC! (+50 Điểm Kỷ Luật) 💎';
        $('minigameClicks').style.color = '#10b981';
      } else {
        $('minigameClicks').textContent = `Đã giữ: ${stopLossLocalClicks}/15 lần`;
      }
    }
  };
}

// ============================================================================
// 4. Wall Street Breaking News & Continuous Ticker Bar
// ============================================================================
let breakingNewsTimer = null;
function showBreakingNews(news) {
  if (!news) return;
  const popup = $('breakingNewsPopup');
  if (!popup) return;

  clearTimeout(breakingNewsTimer);
  popup.hidden = false;
  hall.setMood('news', Number(news.durationMs || 6000));

  if ($('breakingNewsBody')) {
    $('breakingNewsBody').textContent = news.headline || 'Bản tin tài chính chấn động!';
  }
  if ($('breakingNewsTime')) {
    $('breakingNewsTime').textContent = new Date().toLocaleTimeString('vi-VN');
  }

  tone(news.sound || 'breaking-news');

  // Also prepend to ticker track
  addTickerItem(news.headline);

  const dur = Number(news.durationMs || 6000);
  breakingNewsTimer = setTimeout(() => {
    popup.hidden = true;
  }, dur);
}

function addTickerItem(text) {
  if (!text || !$('tickerTrack')) return;
  const item = document.createElement('span');
  item.className = 'ticker-item';
  item.textContent = text;
  $('tickerTrack').prepend(item);
  // Keep track bounded
  while ($('tickerTrack').children.length > 20) {
    $('tickerTrack').lastElementChild.remove();
  }
}

function renderTickerItems(items = []) {
  const track = $('tickerTrack');
  if (!track || !items.length) return;
  track.replaceChildren();
  items.forEach(text => {
    const item = document.createElement('span');
    item.className = 'ticker-item';
    item.textContent = text;
    track.append(item);
  });
}

// ============================================================================
// 5. High-Impact Social Celebrations (Follower Greeting & 1000+ Likes Feast)
// ============================================================================
let thousandLikesTimeout = null;
function handleThousandLikesCelebration(data) {
  const name = data?.nickname || 'Trader Bản Lĩnh';
  const count = Number(data?.likeCount || 1000);
  const popup = $('thousandLikesPopup');
  if (!popup) return;

  $('likesDonorName').textContent = name;
  $('likesCountBadge').textContent = `+${count.toLocaleString('vi-VN')} TIM`;
  popup.hidden = false;
  popup.classList.add('active');

  // Trigger grand colorful heart fountain across stage
  if (particles && typeof particles.spawnHeartFountain === 'function') {
    particles.spawnHeartFountain(540, 1350, 36);
  }

  // Chime bell & speak polite, joyful thank-you TTS (deduplicated across broadcast + activity state)
  tone('like');
  if (voiceEngine && typeof voiceEngine.speakThousandLikes === 'function' && shouldSpeakCelebration(`likes:${name}:${count}`)) {
    voiceEngine.speakThousandLikes(name, count);
  }

  if (thousandLikesTimeout) clearTimeout(thousandLikesTimeout);
  thousandLikesTimeout = setTimeout(() => {
    popup.classList.remove('active');
    setTimeout(() => { popup.hidden = true; }, 600);
  }, 5000);
}

let followerTimeout = null;
function handleNewFollowerCelebration(data) {
  const name = data?.nickname || 'Trader Mới';
  const popup = $('newFollowerPopup');
  if (!popup) return;

  $('followerName').textContent = name;
  popup.hidden = false;
  popup.classList.add('active');

  // Pleasant bell tone
  tone('like');

  // Follower voice greeting (deduplicated across broadcast + activity state)
  if (voiceEngine && typeof voiceEngine.speakFollow === 'function' && shouldSpeakCelebration(`follow:${name}`)) {
    voiceEngine.speakFollow(name, true);
  }

  if (followerTimeout) clearTimeout(followerTimeout);
  followerTimeout = setTimeout(() => {
    popup.classList.remove('active');
    setTimeout(() => { popup.hidden = true; }, 500);
  }, 4500);
}

// ============================================================================
// 5B. Smooth Sequential Trader Walk-in (Từng người đi vào phố thị)
// ============================================================================
const walkInQueue = [];
let isWalkInActive = false;
let walkInAnimFrame = null;
let guestEntranceTimer = null;

function showGuestEntrance(data = {}) {
  const cue = $('guestEntrance');
  if (!cue) return;
  $('guestEntranceName').textContent = data.nickname || data.name || 'Trader mới';
  $('guestEntranceText').textContent = data.actionText || 'đang kéo ghế vào Xóm Trade';
  clearTimeout(guestEntranceTimer);
  cue.hidden = false;
  // Restart the animation for back-to-back arrivals.
  cue.style.animation = 'none';
  void cue.offsetWidth;
  cue.style.animation = '';
  hall.setMood('welcome', 3500);
  guestEntranceTimer = setTimeout(() => { cue.hidden = true; }, 4300);
}

function triggerTraderWalkIn(data = {}) {
  if (!data) return;
  showGuestEntrance(data);
  walkInQueue.push(data);
  if (!isWalkInActive && (!state || !state.current)) {
    processNextTraderWalkIn();
  }
}

function processNextTraderWalkIn() {
  if (walkInQueue.length === 0) {
    isWalkInActive = false;
    return;
  }
  // If a server ritual job is actively rendering, hold queue
  if (state && state.current) {
    setTimeout(processNextTraderWalkIn, 800);
    return;
  }

  isWalkInActive = true;
  const item = walkInQueue.shift();
  const name = (item.nickname || item.name || 'Trader Bản Lĩnh').trim();
  const actionText = item.actionText || 'Kéo ghế vào Xóm Trade · Chuẩn bị vào lệnh';
  const wish = item.wish || 'Chúc anh em gồng lệnh xanh mướt!';

  const walker = $('walker');
  const spritesContainer = $('sprites');
  const nameEl = $('name');
  const actionEl = $('action');
  const wishEl = $('wish');
  const avatarEl = $('avatar');
  const initialEl = $('initial');

  if (!walker || !spritesContainer) {
    isWalkInActive = false;
    setTimeout(processNextTraderWalkIn, 400);
    return;
  }

  // Calculate variant
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i) | 0;
  const variant = Math.abs(hash) % 12;

  // Build character sprites
  spritesContainer.replaceChildren();
  const walkSprites = [];
  for (let i = 0; i < 8; i++) {
    const frame = createPose(i, 330, variant);
    if (i === 0 || i === 3) frame.classList.add('active');
    spritesContainer.append(frame);
    walkSprites.push(frame);
  }

  if (nameEl) nameEl.textContent = name;
  if (actionEl) actionEl.textContent = actionText;
  if (wishEl) wishEl.textContent = wish;
  if (initialEl) {
    initialEl.textContent = name.slice(0, 1).toUpperCase();
    initialEl.hidden = false;
  }
  if (avatarEl) {
    if (item.avatar) {
      avatarEl.src = item.avatar;
      avatarEl.hidden = false;
      if (initialEl) initialEl.hidden = true;
    } else {
      avatarEl.hidden = true;
      if (initialEl) initialEl.hidden = false;
    }
  }

  walker.hidden = false;
  walker.removeAttribute('hidden');
  walker.style.display = 'block';

  const startTime = performance.now();
  const walkDuration = 2200; // 2.2s walking forward along the street
  const totalDuration = 4200; // 4.2s total presentation

  function animateWalk(now) {
    // If a server job arrives, release walker to server frame()
    if (state && state.current) {
      isWalkInActive = false;
      return;
    }

    const elapsed = now - startTime;
    if (elapsed >= totalDuration) {
      walker.hidden = true;
      walker.style.display = 'none';
      isWalkInActive = false;
      // Stagger entrance: 400ms pause before next person walks in
      setTimeout(processNextTraderWalkIn, 400);
      return;
    }

    const t = Math.min(1, elapsed / walkDuration);
    // Smooth quadratic ease-out approach from y: 1560 down to y: 1000
    const approach = 1 - Math.pow(1 - t, 2.5);
    const y = 1560 - approach * 560;
    const scale = 1.15 - approach * 0.15;
    const opacity = elapsed < 300 ? (elapsed / 300) : (elapsed > totalDuration - 600 ? (totalDuration - elapsed) / 600 : 1);
    const bob = t < 1 ? Math.sin(elapsed / 160 * Math.PI) * 4 : 0;

    walker.style.top = `${y + bob}px`;
    walker.style.transform = `translateX(-50%) scale(${scale})`;
    walker.style.opacity = Math.max(0, Math.min(1, opacity));

    const isWalking = t < 1;
    const poseIndex = isWalking ? (Math.floor(elapsed / 250) % 2 === 0 ? 0 : 1) : 3;
    walkSprites.forEach((sp, idx) => sp.classList.toggle('active', idx === poseIndex));

    walkInAnimFrame = requestAnimationFrame(animateWalk);
  }

  walkInAnimFrame = requestAnimationFrame(animateWalk);
}

// ============================================================================
// 6. Street Market Comedy Slapstick & Solemn Trader Legend Proclamation
// ============================================================================
const COMEDY_SCENARIOS = [
  {
    type: 'wife_chase',
    chaserName: 'Vợ Sư Tử',
    chaserEmoji: '👩‍🦰🧹',
    runnerName: 'Chồng Gồng Lỗ',
    runnerEmoji: '🏃‍♂️💨',
    dialogue: 'Đứng lại! Đã bảo đừng có nhồi lệnh x100 rồi mà không nghe!',
    shout: 'Cháy tài khoản thì ra đê mà ngủ nghe chưa!! 🧹💥',
    direction: 'rtl',
    particle: 'broom',
    sound: 'chicken',
    actor: 'Vợ Sư Tử'
  },
  {
    type: 'chicken_dog',
    chaserName: 'Chó Vàng Đu Đỉnh',
    chaserEmoji: '🐕💨',
    runnerName: 'Đàn Gà Cháy Lệnh',
    runnerEmoji: '🐔🐔🐔',
    dialogue: 'Gâu gâu! Cứu với! Nến đỏ quét thanh lý gà chó bay loạn xạ rồi!',
    shout: 'Cục ta cục tác! Chạy ngay đi trước khi cá mập nuốt chửng! 🐔💥',
    direction: 'ltr',
    particle: 'chicken',
    sound: 'chicken',
    actor: 'Bác Ba Chợ Lớn'
  },
  {
    type: 'tea_debt',
    chaserName: 'Bà Chủ Quán Nước',
    chaserEmoji: '👵🩴',
    runnerName: 'Thánh All-in',
    runnerEmoji: '🏃‍♂️💦',
    dialogue: 'Này ông kia! Uống hết 3 ấm trà đá gồng lỗ định quịt nợ à!',
    shout: 'Trả 15 nghìn tiền trà đá rồi hãy mơ làm triệu phú USD! 🩴💨',
    direction: 'rtl',
    particle: 'slipper',
    sound: 'slapstick_run',
    actor: 'Bà Bảy Trà Đá'
  },
  {
    type: 'modem_rescue',
    chaserName: 'Kỹ Thuật Viễn Thông',
    chaserEmoji: '👨‍🔧🔌',
    runnerName: 'Trader Nghiện Cào Phím',
    runnerEmoji: '🏃‍♂️⚡',
    dialogue: 'Cắt mạng! Cắt Wi-Fi khẩn cấp để cứu tài khoản cho ông này!',
    shout: 'Rút phích cắm ngay! Rút modem là phương pháp stop-loss tối thượng! ⚡🔌',
    direction: 'ltr',
    particle: 'zap',
    sound: 'dog_bark',
    actor: 'Anh Ba Cáp Quang'
  }
];

const TRADER_LEGENDS = [
  {
    author: 'CZ Binance',
    title: 'Đồng sáng lập & Cựu CEO Binance',
    quote: 'If you cannot hold, you will not be rich! Nếu các vị không có bản lĩnh gồng lệnh qua giông bão, đừng bao giờ mơ mộng chạm tay vào đỉnh cao tài chính! Hãy ghi nhớ quy tắc số 4: Bỏ ngoài tai mọi FUD và bảo vệ tài khoản!',
    badge: '💎'
  },
  {
    author: 'Jesse Livermore',
    title: 'Huyền thoại Phố Wall · Đại hiệp Đầu cơ',
    quote: 'Tiền kiếm được trên thị trường tài chính là nhờ vào sự kiên nhẫn ngồi yên chờ đợi thời cơ, chứ tuyệt đối không phải do cào phím mỗi phút mỗi giây! Đừng bao giờ tranh cãi với bảng giá, thị trường không bao giờ sai!',
    badge: '📜'
  },
  {
    author: 'George Soros',
    title: 'Phù thủy Quản lý Quỹ · Bậc thầy Vĩ mô',
    quote: 'Trong giao dịch, việc các bạn đúng hay sai hoàn toàn không quan trọng! Điều cốt tử là khi đúng các bạn kiếm được bao nhiêu tiền, và khi sai các bạn chịu mất bao nhiêu pip!',
    badge: '🎯'
  },
  {
    author: 'Warren Buffett',
    title: 'Nhà tiên tri xứ Omaha · Chủ tịch Berkshire Hathaway',
    quote: 'Tôi xin long trọng nhắc lại hai chân lý bất biến: Nguyên tắc số 1 là không bao giờ để cháy sạch vốn. Nguyên tắc số 2 là khi chuẩn bị nhồi lệnh thì hãy mở lại nguyên tắc số 1!',
    badge: '🏛️'
  },
  {
    author: 'Satoshi Nakamoto',
    title: 'Nhà sáng lập Bitcoin · Bậc thầy Ẩn danh',
    quote: 'Nếu các bạn không hiểu hoặc không tin vào bản chất của mạng lưới phi tập trung, tôi thành thật không có đủ thời gian để đứng đây giải thích cho các bạn đâu!',
    badge: '⚡'
  },
  {
    author: 'Jerome Powell',
    title: 'Chủ tịch Cục Dự trữ Liên bang Mỹ (FED)',
    quote: 'Chúng tôi sẽ kiên quyết theo dõi dữ liệu kinh tế và duy trì lãi suất ở mức hạn chế cho đến khi lạm phát được kiểm soát. Các vị hãy chuẩn bị tinh thần đón nhận những đợt rung lắc!',
    badge: '🦅'
  }
];

let comedyTimeout = null;
let isComedyRunning = false;

function triggerStreetComedy(typeName = null) {
  const layer = $('streetComedyLayer');
  const track = $('comedyTrack');
  if (!layer || !track) return;

  // Clear previous comedy animation immediately so clicking always plays!
  if (comedyTimeout) {
    clearTimeout(comedyTimeout);
    comedyTimeout = null;
  }
  isComedyRunning = false;

  const scenario = COMEDY_SCENARIOS.find(s => s.type === typeName) ||
    COMEDY_SCENARIOS[Math.floor(Math.random() * COMEDY_SCENARIOS.length)];

  isComedyRunning = true;
  hall.setMood('comedy', 6400);
  layer.hidden = false;
  layer.removeAttribute('hidden');
  layer.style.display = 'block';
  track.replaceChildren();

  // Populate top comic banner
  const banner = $('comedyTopBanner');
  const shoutEl = $('comedyBannerShout');
  const actorBadge = $('comedyActorBadge');
  if (banner && shoutEl) {
    banner.hidden = false;
    banner.removeAttribute('hidden');
    shoutEl.textContent = `"${scenario.shout}"`;
    if (actorBadge) actorBadge.textContent = `${scenario.chaserEmoji} ${scenario.chaserName} vs ${scenario.runnerEmoji} ${scenario.runnerName}`;
  }

  const runnerGroup = document.createElement('div');
  runnerGroup.className = `comedy-runner-group run-${scenario.direction || 'rtl'}`;

  const isRtl = scenario.direction !== 'ltr';
  const firstEmoji = isRtl ? scenario.chaserEmoji : scenario.runnerEmoji;
  const firstName = isRtl ? scenario.chaserName : scenario.runnerName;
  const firstBubble = isRtl ? scenario.shout : scenario.dialogue;

  const secondEmoji = isRtl ? scenario.runnerEmoji : scenario.chaserEmoji;
  const secondName = isRtl ? scenario.runnerName : scenario.chaserName;
  const secondBubble = isRtl ? scenario.dialogue : scenario.shout;

  runnerGroup.innerHTML = `
    <div class="runner-unit ${scenario.type.includes('wife') ? 'wife-unit' : ''}">
      <div class="comedy-speech-bubble shout">${firstBubble}</div>
      <div class="runner-sprite extra-large">${firstEmoji}</div>
      <div class="runner-name-tag">${firstName}</div>
    </div>
    <div class="runner-unit ${scenario.type.includes('chicken') ? 'chicken-unit' : ''}">
      <div class="comedy-speech-bubble">${secondBubble}</div>
      <div class="runner-sprite extra-large">${secondEmoji}</div>
      <div class="runner-name-tag">${secondName}</div>
    </div>
  `;

  track.appendChild(runnerGroup);

  // Audio effects
  try {
    tone(scenario.sound || 'slapstick_run');
    setTimeout(() => { try { tone(scenario.sound || 'chicken'); } catch {} }, 1200);
  } catch {}

  // Particle bursts
  try {
    if (particles && typeof particles.spawnComedyBursts === 'function') {
      particles.spawnComedyBursts(scenario.particle, 540, 1380, 24);
      setTimeout(() => {
        try { particles.spawnComedyBursts(scenario.particle, isRtl ? 380 : 700, 1350, 18); } catch {}
      }, 1400);
    }
  } catch {}

  // Voice speech with lively slapstick comedic delivery (passing numeric pitch)
  try {
    if (voiceEngine && typeof voiceEngine.speakComedyDialogue === 'function') {
      voiceEngine.speakComedyDialogue(scenario.shout, 1.15, 1.08);
    }
  } catch (err) {
    console.warn('Voice comedy error:', err);
  }

  comedyTimeout = setTimeout(() => {
    track.replaceChildren();
    if (banner) banner.hidden = true;
    layer.hidden = true;
    isComedyRunning = false;
  }, 6400);
}

let legendPopupTimeout = null;
function triggerLegendProclamation(legendData = null) {
  const popup = $('legendQuotePopup');
  if (!popup) return;

  if (legendPopupTimeout) {
    clearTimeout(legendPopupTimeout);
    legendPopupTimeout = null;
  }

  const legend = (legendData && legendData.author) ? legendData :
    TRADER_LEGENDS[Math.floor(Math.random() * TRADER_LEGENDS.length)];

  $('legendAuthorTitle').textContent = `${legend.badge || '💎'} ${(legend.author || '').toUpperCase()}`;
  $('legendAuthorRole').textContent = legend.title || 'Huyền Thoại Giao Dịch';
  $('legendQuoteContent').textContent = `"${legend.quote}"`;

  popup.hidden = false;
  popup.removeAttribute('hidden');
  popup.style.display = 'block';
  popup.classList.add('active');

  // Solemn grand temple gong tone for deadpan gravity
  try { tone('gong'); } catch {}

  // Speak with solemn official deadpan voice
  try {
    if (voiceEngine && typeof voiceEngine.speakTraderLegend === 'function') {
      voiceEngine.speakTraderLegend(legend);
    }
  } catch (err) {
    console.warn('Voice legend error:', err);
  }

  legendPopupTimeout = setTimeout(() => {
    popup.classList.remove('active');
    setTimeout(() => {
      popup.hidden = true;
      popup.style.display = 'none';
    }, 700);
  }, 9000);
}

let butVisitTimeout = null;
function triggerButVisit(data = null) {
  const layer = $('butVisitLayer');
  const track = $('butRunnerTrack');
  if (!layer || !track) return;

  if (butVisitTimeout) {
    clearTimeout(butVisitTimeout);
    butVisitTimeout = null;
  }

  const line = (data && data.text)
    ? { text: data.text, speechText: data.speechText || data.text, contact: data.contact || BUT_CONTACT_DISPLAY }
    : pickButAppearance();

  if ($('butSpeechText')) $('butSpeechText').textContent = `"${line.text}"`;
  const pillEl = $('butPhonePill');
  if (pillEl) {
    pillEl.textContent = '📌 Liên hệ hoàn phí: ';
    const strong = document.createElement('strong');
    strong.textContent = line.contact || BUT_CONTACT_DISPLAY;
    pillEl.append(strong);
  }

  layer.hidden = false;
  layer.removeAttribute('hidden');
  layer.style.display = 'block';
  track.classList.remove('patrolling');
  void track.offsetWidth;
  track.classList.add('patrolling');
  hall.setMood('celebrate', 9600);

  try { tone('bell'); } catch {}
  try {
    if (particles && typeof particles.spawnComedyBursts === 'function') {
      particles.spawnComedyBursts('🪙', 540, 1280, 22);
    }
  } catch {}
  try {
    if (voiceEngine && typeof voiceEngine.speakBut === 'function') {
      voiceEngine.speakBut(line.speechText || line.text);
    }
  } catch {}

  butVisitTimeout = setTimeout(() => {
    track.classList.remove('patrolling');
    layer.hidden = true;
    layer.style.display = '';
    butVisitTimeout = null;
  }, 9800);
}

window.triggerButVisit = triggerButVisit;

window.triggerStreetComedy = triggerStreetComedy;
window.triggerLegendProclamation = triggerLegendProclamation;

// Brief encouragement between the larger legend popups.  These are clearly
// labelled as lessons "in the spirit of" each trader, not invented quotes.
const LEGEND_WHISPERS = [
  { author: 'Jesse Livermore', text: 'Kiên nhẫn chờ cơ hội rõ ràng. Đừng tranh cãi với bảng giá.' },
  { author: 'Paul Tudor Jones', text: 'Bảo vệ vốn trước. Lợi nhuận là phần thưởng của kỷ luật.' },
  { author: 'Mark Douglas', text: 'Đây là trò chơi xác suất. Một lệnh không quyết định cả hành trình.' },
  { author: 'Ed Seykota', text: 'Xu hướng là người bạn, nhưng quản trị rủi ro mới là dây an toàn.' },
  { author: 'Warren Buffett', text: 'Đừng để một quyết định vội vàng làm tổn thương số vốn đã gây dựng.' },
  { author: 'Xóm Trade', text: 'Bình tĩnh quan sát, vào lệnh có kế hoạch, và để tài khoản sống sót qua mọi phiên.' }
];
let legendWhisperIndex = 0;
function shareLegendWhisper() {
  if (document.hidden || state?.config?.autoFeatures?.legend === false) return;
  const item = LEGEND_WHISPERS[legendWhisperIndex++ % LEGEND_WHISPERS.length];
  addTickerItem(`💬 ${item.author}: ${item.text}`);
  try {
    voiceEngine?.speakTraderLegend?.({ voiceText: `Lời nhắc theo tinh thần ${item.author}. ${item.text}` });
  } catch (error) {
    console.warn('Legend whisper voice error:', error);
  }
}
setTimeout(shareLegendWhisper, 45000);
setInterval(shareLegendWhisper, 105000);

// Autonomous periodic triggers for background street atmosphere
setInterval(() => {
  if (!document.hidden && state?.config?.autoFeatures?.comedy !== false) {
    triggerStreetComedy();
  }
}, 65000 + Math.floor(Math.random() * 25000));

setInterval(() => {
  if (!document.hidden && state?.config?.autoFeatures?.legend !== false) {
    triggerLegendProclamation();
  }
}, 130000 + Math.floor(Math.random() * 30000));

let activeWalkerJobId = null;
function checkWalkerVariant(job) {
  if (!job || job.id === activeWalkerJobId) return;
  activeWalkerJobId = job.id;
  let hash = 0;
  const str = String(job.userId || job.nickname || job.id || '');
  for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i) | 0;
  const variant = Math.abs(hash) % 12;
  $('sprites').replaceChildren();
  sprites.length = 0;
  for (let i = 0; i < 8; i++) {
    const frame = createPose(i, 330, variant);
    if (i === 0 || i === 3) frame.classList.add('active');
    $('sprites').append(frame);
    sprites.push(frame);
  }
}

// ============================================================================
// Animation Loop (30-60 FPS)
// ============================================================================
function frame(now) {
  requestAnimationFrame(frame);
  if (now - lastFrame < 1000 / 30) return;
  lastFrame = now;
  if (!state) return;

  // Gift notice
  $('giftNotice').hidden = !state.notice || !!state.notice.jobId || Date.now() - state.notice.time > 4500;

  const job = state.current, activity = state.interactions?.current;
  const blocked = !!job && (job.action === 'fortune' || job.action === 'grand' || Date.now() - job.startedAt < (job.ritualStartDelay || 0));
  $('interactionBubble').hidden = !activity || blocked || Date.now() >= activity.startedAt + activity.duration;

  if (!job) return;

  const t = Math.max(0, Date.now() - job.startedAt), scene = sampleRitual(job, t);
  $('donationThanks').hidden = !scene.thanking;
  document.body.classList.toggle('thanking-donor', scene.thanking);
  if (scene.thanking) {
    $('walker').hidden = true;
    for (const key of ['fortune', 'lantern', 'ceremony']) $(key).hidden = true;
    document.body.classList.remove('reading-fortune');
    ritualStage(null);
    hall.animate(null);
    return;
  }

  checkWalkerVariant(job);
  $('walker').hidden = false;
  if (!milestones.has('start')) {
    milestones.add('start');
    if (scene.ritualTime < 1500) {
      if (isPrimary()) tone();
      if (job.action === 'incense') particles.spawnIncenseBurst(540, 790);
      if (job.action === 'grand') particles.spawnGrandCeremonyRain();
    }
  }

  narration.sample(job, t, ctx?.state === 'running');
  sprites.forEach((img, i) => img.classList.toggle('active', i === scene.pose));
  $('walker').style.top = `${scene.y + (scene.walking ? Math.sin(t / 400 * Math.PI) * 2.5 : 0)}px`;
  $('walker').style.opacity = scene.opacity;
  $('walker').style.transform = `translateX(-50%) scale(${scene.scale})`;

  if (lastPhase !== scene.phase) {
    lastPhase = scene.phase;
    $('action').textContent = scene.phase + (job.kind === 'gift' ? ` · ${job.giftName} ×${job.quantity}` : '') + (job.simulated ? ' · Thử' : '');
  }

  $('halo').style.opacity = scene.grand ? String(.6 + Math.sin(t / 350) * .3) : '.4';
  $('fortune').hidden = !scene.card;
  $('ceremony').hidden = !scene.banner;
  document.body.classList.toggle('reading-fortune', scene.card);
  $('lantern').hidden = !scene.lantern;
  $('lantern').style.top = `${1250 - scene.lanternRise * 800}px`;
  $('lantern').style.opacity = 1 - Math.max(0, scene.lanternRise - .8) * 5;

  ritualStage(scene);
  hall.animate(scene.groupTime);

  if (scene.groupTime !== null && !milestones.has('group')) {
    milestones.add('group');
    tone();
    particles.spawnBellWave(540, 750, 4);
  }
  if (scene.bell) {
    for (const [index, at] of [2400, 4200, 6000].entries()) {
      if (scene.ritualTime >= at && !milestones.has('bell-' + index)) {
        milestones.add('bell-' + index);
        tone();
        particles.spawnBellWave(540, 850, 3);
      }
    }
  }
  if (scene.lotusOpen > .5 && job.action === 'lotus' && !milestones.has('lotus')) {
    milestones.add('lotus');
    particles.spawnIncenseBurst(540, 880);
  }
  if (t >= job.duration && isPrimary() && sentComplete !== job.id) {
    sentComplete = job.id;
    send('complete', { id: job.id });
  }
}
requestAnimationFrame(frame);

// ============================================================================
// WebSocket Connection & Realtime Event Synchronization
// ============================================================================
async function connect() {
  const wsUrl = await resolveWsUrl(`/ws?role=${preview ? 'preview' : 'overlay'}`);
  ws = new WebSocket(wsUrl);

  ws.onmessage = async e => {
    try {
      const msg = JSON.parse(e.data);

      if (msg.type === 'hello') {
        self = msg.data.id;
        // Register immediately.  OBS may take several seconds to decode
        // sprites/chart assets; the server must not drop host commands during
        // that visual warm-up.
        if (!preview) send('ready');
        try {
          await ready;
          // Do not synthesize a fake user gesture here. updateMusic() tries
          // normal autoplay and reveals the unlock button only when needed.
          if (isPrimary()) updateMusic();
          $('connection').hidden = true;
        } catch {
          $('connection').hidden = false;
          $('connection').textContent = 'Thiếu ảnh cảnh/nhân vật. Chưa nhận lượt. Kiểm tra public/assets rồi tải lại.';
        }
      }

      if (msg.type === 'state') render(msg.data);

      // Visual commands use an event ID and can be recovered by HTTP after a
      // reconnect.  Handle them once here, then skip the legacy branches.
      if (replayableOverlayEvents.has(msg.type)) {
        dispatchRealtimeEvent(msg);
        return;
      }

      if (msg.type === 'effect') {
        tone(msg.data.kind);
        particles.spawnBellWave();
      }

      // Viral V2 Realtime Broadcast Events
      if (msg.type === 'tug_state_broadcast') {
        renderTugState(msg.data);
      }

      if (msg.type === 'tug_result_broadcast') {
        handleTugResult(msg.data);
      }

      if (msg.type === 'wheel_result_broadcast') {
        spinWheel(msg.data);
      }

      if (msg.type === 'siren_alert_broadcast') {
        triggerSiren(msg.data);
      }

      if (msg.type === 'siren_resolved_broadcast') {
        resolveSiren(msg.data);
      }

      if (msg.type === 'breaking_news_broadcast') {
        showBreakingNews(msg.data);
      }

      if (msg.type === 'thousand_likes_broadcast') {
        handleThousandLikesCelebration(msg.data);
      }

      if (msg.type === 'new_follower_broadcast') {
        handleNewFollowerCelebration(msg.data);
      }

      if (msg.type === 'street_comedy_broadcast') {
        triggerStreetComedy(msg.data?.scenario || msg.data?.type);
      }

      if (msg.type === 'trader_legend_broadcast') {
        triggerLegendProclamation(msg.data?.legend || msg.data);
      }

      if (msg.type === 'trader_walk_in') {
        triggerTraderWalkIn(msg.data);
      }

      if (msg.type === 'but_visit_broadcast') {
        triggerButVisit(msg.data);
      }

      if (msg.type === 'voice_speak') {
        const d = msg.data || {};
        if (d.category === 'welcome' || d.category === 'join') {
          voiceEngine.speakWelcome(d.nickname || d.text, true);
        } else if (d.category === 'follow') {
          voiceEngine.speakFollow(d.nickname || d.text, true);
        } else if (d.category === 'gift') {
          voiceEngine.speakGift(d.nickname, d.giftName || 'Hoa Hồng', d.count || 1, d.coins || 0);
        } else if (d.category === 'dog') {
          voiceEngine.speakDog(d.quote || d.text);
        } else if (d.category === 'fortune') {
          voiceEngine.speakFortune(d.text);
        } else {
          voiceEngine.speak(d.text, d.options || {});
        }
      }

      if (msg.type === 'viral_state') {
        viralState = msg.data;
        if (viralState?.tug) renderTugState(viralState.tug);
        if (viralState?.news?.ticker) renderTickerItems(viralState.news.ticker);
      }
    } catch (err) {
      console.warn('WS message parse error:', err);
    }
  };

  ws.onclose = () => {
    wasPrimary = false;
    narration.stop();
    const vst = voiceEngine.getState?.();
    if (vst?.isSpeaking || (vst?.queueLength || 0) > 0) {
      voiceEngine.stop();
    }
    music?.pause();
    $('walker').hidden = true;
    $('donationThanks').hidden = true;
    $('interactionBubble').hidden = true;
    document.body.classList.remove('reading-fortune', 'thanking-donor');
    lastJob = undefined;
    $('connection').hidden = false;
    $('connection').textContent = 'Mất kết nối tool · Đang thử lại';
    setTimeout(connect, 700);
  };

  ws.onerror = () => {
    // onclose performs the reconnect; declaring the handler avoids an
    // uncaught Browser Source error from interrupting the display loop.
  };
}
connect();
recoverOverlayEvents();
scheduleOverlayRecovery();

// ============================================================================
// Giáo Sư Cún Chibi: Luân chuyển lời thoại giảng bài & châm biếm PTKT
// ============================================================================
const profDogQuotes = [
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
let profQuoteIndex = 0;
function advanceProfDogQuote() {
  const speech = document.getElementById('tvChibiDogSpeech');
  if (speech) {
    profQuoteIndex = (profQuoteIndex + 1) % profDogQuotes.length;
    speech.textContent = profDogQuotes[profQuoteIndex];
  }
}
setInterval(advanceProfDogQuote, 4500);

// Allow clicking on Professor Dog to immediately advance quote with click sound
const dogEl = document.getElementById('tvChibiDog');
if (dogEl) {
  dogEl.style.cursor = 'pointer';
  dogEl.title = 'Bấm vào Giáo Sư Cún để nghe lời phán tiếp theo!';
  dogEl.onclick = () => {
    advanceProfDogQuote();
    tone('wood-click');
    if (state?.config?.voiceEnabled !== false) {
      voiceEngine.speakDog(profDogQuotes[profQuoteIndex]);
    }
  };
}
