import express from 'express';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { spawn } from 'node:child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { LiveEngine, validateConfig, migrateConfig, normalizeEvent, ACTIONS } from './src/core.js';
import { JsonStore } from './src/store.js';
import { TikTokSource, parseTikTokSessionLine } from './src/tiktok.js';
import { listMusic } from './src/music.js';
import { RoomManager, SUPPORTED_SYMBOLS, SUPPORTED_TIMEFRAMES } from './src/rooms.js';
import { ScoreLedger, ACTIONS as FOREX_ACTIONS } from './src/score.js';
import { ViralEngine, detectCommentIntent, detectSirenRescueIntent } from './src/viral-engine.js';
import { AmbientEngine } from './src/ambient.js';
import { getOrSynthesizeTts, VOICES, prewarmTtsCache } from './src/tts-engine.js';
import { pickButAppearance } from './public/js/but-lines.js';

const GIFT_TUG_POWER_TIERS = [
  { minCoins: 500, power: 1000, defaultName: 'Đại Lễ Kim Cương' },
  { minCoins: 100, power: 450, defaultName: 'Chuông Ngân' },
  { minCoins: 30, power: 200, defaultName: 'Mâm Lễ Thần Tài' },
  { minCoins: 10, power: 90, defaultName: 'Hoa Đăng Rực Sáng' },
  { minCoins: 5, power: 45, defaultName: 'Hoa Sen Chốt Lời' },
  { minCoins: 3, power: 25, defaultName: 'Nhang Khấn Lệnh' },
  { minCoins: 1, power: 10, defaultName: 'Quẻ Nến Mở Lộc' },
];

function resolveGiftTierMeta(totalCoins) {
  return GIFT_TUG_POWER_TIERS.find(t => totalCoins >= t.minCoins) || GIFT_TUG_POWER_TIERS[GIFT_TUG_POWER_TIERS.length - 1];
}

function setBoundedMap(map, key, value, maxSize = 5000) {
  if (!key) return;
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  if (map.size > maxSize) map.delete(map.keys().next().value);
}

const root = path.dirname(fileURLToPath(import.meta.url));
export function createApp({ dataDir = process.env.TILITA_DATA_DIR || path.join(root, 'data') } = {}) {
  const defaults = JSON.parse(fs.readFileSync(path.join(root, 'config/default.json'), 'utf8'));
  const store = new JsonStore(dataDir);
  // A capability URL for the remote live operator.  It is intentionally
  // separate from /admin: the remote person can trigger show effects but
  // cannot alter TikTok, files, settings, or the rest of the application.
  let remoteControl = store.read('remote-control', null);
  if (!remoteControl || !/^[a-f0-9]{32}$/i.test(remoteControl.token || '')) {
    remoteControl = { token: randomUUID().replace(/-/g, '') };
    try { store.write('remote-control', remoteControl); } catch { /* Local Admin can regenerate after fixing storage. */ }
  }
  const remoteControlPath = `/remote-control/${remoteControl.token}`;
  let config = store.read('config', defaults);
  try {
    const oldVersion = config.sceneVersion !== 'wooden-temple-v2';
    // Validate before migration so malformed files cannot be silently replaced.
    validateConfig(config);
    if (oldVersion && !store.blocked.has('config')) {
      const original = path.join(dataDir, 'config.json'), backup = path.join(dataDir, 'config-before-v2.json');
      if (fs.existsSync(original) && !fs.existsSync(backup)) fs.copyFileSync(original, backup);
    }
    config = validateConfig(migrateConfig(config));
    if (oldVersion && !store.blocked.has('config')) store.write('config', config);
  } catch (e) { store.blocked.add('config'); store.errors.push(`Cấu hình không hợp lệ: ${e.message} File được giữ nguyên.`); config = defaults; }
  // Every new live session opens on the gold screen. The operator can still
  // switch pairs in Admin during a session, but a restart returns to XAU/USD 15M.
  if (config.chartSymbol !== 'OANDA:XAUUSD' || config.chartTimeframe !== '15') {
    config = { ...config, chartSymbol: 'OANDA:XAUUSD', chartTimeframe: '15' };
    if (!store.blocked.has('config')) store.write('config', config);
  }
  let stats = store.read('stats', { users: {}, totalGifts: 0, totalCoins: 0 });
  if (!stats || !stats.users || Array.isArray(stats.users) || typeof stats.users !== 'object' || !Number.isFinite(stats.totalGifts) || !Number.isFinite(stats.totalCoins) || Object.values(stats.users).some(u => !u || !Number.isFinite(u.coins) || !Number.isFinite(u.gifts))) {
    store.blocked.add('stats'); store.errors.push('Thống kê không hợp lệ; file gốc được giữ nguyên.'); stats = { users: {}, totalGifts: 0, totalCoins: 0 };
  }
  const scoreLedger = new ScoreLedger(dataDir);
  const roomManager = new RoomManager(scoreLedger);
  const engine = new LiveEngine(config, stats);
  const viralEngine = new ViralEngine();
  const app = express(); app.set('trust proxy', 1); const server = http.createServer(app); const wss = new WebSocketServer({ noServer: true, maxPayload: 16384 });
  const clients = new Map(); let source;
  // XAU/USD quote deliberately follows the same TradingView OANDA:XAUUSD feed as
  // the displayed chart, so the large header quote does not drift from it.
  let goldSpot = { status: 'loading', symbol: 'XAU/USD', price: null, change: null, changePercent: null, asOf: null, source: 'TradingView OANDA:XAUUSD', fetchedAt: null, error: null };
  async function refreshGoldSpot() {
    try {
      const response = await fetch('https://scanner.tradingview.com/cfd/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'XomTrade-Live/1.0 (+local OBS overlay)' },
        body: JSON.stringify({
          symbols: { tickers: ['OANDA:XAUUSD'], query: { types: [] } },
          columns: ['close', 'change', 'change_abs', 'description']
        }),
        signal: AbortSignal.timeout(9000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const rawFeed = data?.data?.[0]?.d || [];
      // Scanner normally returns an array; tolerate the whitespace-delimited
      // form returned by a few TradingView CDN nodes as well.
      const feed = Array.isArray(rawFeed) ? rawFeed : String(rawFeed).split(/\s+/);
      const price = Number(feed[0]);
      if (!Number.isFinite(price) || price <= 0) throw new Error('Giá XAU/USD không hợp lệ');
      goldSpot = {
        status: 'fresh',
        symbol: 'XAU/USD',
        price: +price.toFixed(3),
        change: Number.isFinite(Number(feed[2])) ? +Number(feed[2]).toFixed(3) : null,
        changePercent: Number.isFinite(Number(feed[1])) ? +Number(feed[1]).toFixed(3) : null,
        asOf: new Date().toISOString(),
        source: 'TradingView OANDA:XAUUSD',
        fetchedAt: Date.now(),
        error: null
      };
    } catch (error) {
      goldSpot = { ...goldSpot, status: goldSpot.price ? 'stale' : 'unavailable', error: error.message, fetchedAt: Date.now() };
    }
  }
  refreshGoldSpot();
  const goldSpotTimer = setInterval(refreshGoldSpot, 30000);
  // Short-lived command journal.  A Browser Source can reconnect while OBS is
  // changing scenes or while a remote connection is briefly slow.  Keeping
  // the recent visual commands means a late Overlay still receives the active
  // siren/news/wheel instead of silently missing it.
  const overlayJournal = [];
  // A remote operator needs proof that an OBS Overlay actually handled a
  // command, rather than only proof that the HTTP request reached this server.
  // Keep a small, short-lived receipt ledger keyed by the visual event ID.
  const overlayReceipts = new Map();
  const retainedOverlayEvents = new Set([
    'tug_state_broadcast', 'tug_result_broadcast', 'wheel_result_broadcast',
    'siren_alert_broadcast', 'siren_resolved_broadcast', 'breaking_news_broadcast',
    'street_comedy_broadcast', 'trader_legend_broadcast', 'trader_walk_in',
    'but_visit_broadcast', 'thousand_likes_broadcast', 'new_follower_broadcast'
  ]);
  const eventLifetime = (type, data) => {
    if (type === 'siren_alert_broadcast') return Math.max(15000, Math.min(60000, Number(data?.durationMs) || 15000));
    if (type === 'tug_state_broadcast') return 120000;
    if (type === 'tug_result_broadcast') return 18000;
    if (type === 'wheel_result_broadcast') return 14000;
    return 12000;
  };
  const pruneOverlayJournal = () => {
    const now = Date.now();
    while (overlayJournal.length && overlayJournal[0].expiresAt <= now) overlayJournal.shift();
    for (const [eventId, receipt] of overlayReceipts) {
      if (receipt.expiresAt <= now) overlayReceipts.delete(eventId);
    }
  };
  const acknowledgeOverlayEvent = (eventId, client) => {
    const receipt = overlayReceipts.get(String(eventId || ''));
    if (!receipt) return;
    receipt.renderedAt = Date.now();
    receipt.rendererId = client.id;
  };
  const replayOverlayJournal = ws => {
    pruneOverlayJournal();
    for (const event of overlayJournal) {
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(JSON.stringify(event)); } catch {}
      }
    }
  };
  const sessionMetrics = {
    realLikes: 0,
    simLikes: 0,
    followers: new Set(),
    userLikes: new Map(),
    userSides: new Map(),
  };
  const snapshot = () => ({
    ...engine.snapshot(),
    source: source?.state || {},
    tiktokSessions: source?.getPublicSessionState() || { mode: 'auto', accounts: [] },
    actions: ACTIONS,
    audioReady: [...clients.values()].some(c => c.id === engine.renderer && c.audio),
    clients: [...clients].filter(([, c]) => c.ready && c.role === 'overlay').length,
    sessionStats: {
      totalLikes: sessionMetrics.realLikes,
      simLikes: sessionMetrics.simLikes,
      followersCount: sessionMetrics.followers.size,
    },
  });
  const broadcast = (type = 'state', data = snapshot()) => { for (const ws of clients.keys()) if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, data })); };
  const broadcastAll = (type, data) => {
    pruneOverlayJournal();
    const event = retainedOverlayEvents.has(type)
      ? { type, data, eventId: randomUUID(), emittedAt: Date.now(), expiresAt: Date.now() + eventLifetime(type, data) }
      : { type, data };
    if (retainedOverlayEvents.has(type)) {
      // Tug ticks arrive every second.  They are state, not a sequence of
      // animations, so retaining only the newest tick keeps recovery quick
      // and leaves room for high-impact host commands.
      if (type === 'tug_state_broadcast') {
        for (let i = overlayJournal.length - 1; i >= 0; i--) {
          if (overlayJournal[i].type === type) overlayJournal.splice(i, 1);
        }
      }
      overlayJournal.push(event);
      if (overlayJournal.length > 80) overlayJournal.splice(0, overlayJournal.length - 80);
      overlayReceipts.set(event.eventId, {
        eventId: event.eventId,
        type,
        emittedAt: event.emittedAt,
        expiresAt: event.expiresAt,
        renderedAt: null,
        rendererId: null
      });
      if (overlayReceipts.size > 120) overlayReceipts.delete(overlayReceipts.keys().next().value);
    }
    const payload = JSON.stringify(event);
    for (const ws of wss.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        try { ws.send(payload); } catch {}
      }
    }
    return event;
  };
  viralEngine.on('tug_tick', state => broadcastAll('tug_state_broadcast', state));
  viralEngine.on('tug_state', state => broadcastAll('tug_state_broadcast', state));
  viralEngine.on('tug_result', result => broadcastAll('tug_result_broadcast', result));
  viralEngine.on('wheel_result', result => broadcastAll('wheel_result_broadcast', result));
  viralEngine.on('siren_alert', alert => broadcastAll('siren_alert_broadcast', alert));
  viralEngine.on('siren_resolved', peace => broadcastAll('siren_resolved_broadcast', peace));
  viralEngine.on('breaking_news', news => broadcastAll('breaking_news_broadcast', news));
  viralEngine.on('change', () => broadcastAll('viral_state', viralEngine.getState()));

  let ambientEngine;
  const broadcastTugUpdate = (pullRes) => {
    if (!pullRes?.ok) return;
    if (pullRes.finished && pullRes.result) broadcastAll('tug_result_broadcast', pullRes.result);
    else broadcastAll('tug_state_broadcast', viralEngine.tug.getState());
  };
  const applySirenRescueTap = (e) => {
    if (!viralEngine.siren.active) return;
    const uid = String(e.userId || e.nickname || 'anonymous');
    const stopRes = viralEngine.siren.recordHoldStopLoss(uid);
    if (stopRes?.achievedBadge && !e.simulated && scoreLedger) {
      try {
        const stored = scoreLedger.touchUser(uid, e.nickname, e.avatar);
        if (stored) {
          stored.score += 50;
          scoreLedger.save();
        }
      } catch {}
    }
    if (stopRes?.ok) {
      broadcastAll('siren_click_ack', stopRes);
    }
  };

  // Wrap engine.ingest to track cumulative milestones and wire TikTok interactions into viral games
  const origIngest = engine.ingest.bind(engine);
  engine.ingest = function(e, manualAction) {
    const userSideKey = e ? String(e.userId || e.nickname || '') : '';
    const commentSide = e?.kind === 'comment' && e.comment ? detectCommentIntent(e.comment) : null;
    if (commentSide && userSideKey) {
      setBoundedMap(sessionMetrics.userSides, userSideKey, commentSide);
    }

    const result = origIngest(e, manualAction);
    const rejectedStatuses = new Set(['duplicate', 'combo', 'missing-id', 'invalid-like', 'not-accepting']);
    if (!e || rejectedStatuses.has(result?.status)) return result;

    if (!e.simulated) {
      ambientEngine?.recordRealActivity();
    }

    if (e.kind === 'like' && Number(e.likeCount) > 0) {
      const likeKey = `${e.simulated ? 'sim' : 'real'}:${e.room || ''}:${e.userId || e.nickname}`;
      const added = Number(e.likeCount);
      const prevTotal = sessionMetrics.userLikes.get(likeKey) || 0;
      const nextTotal = prevTotal + added;
      setBoundedMap(sessionMetrics.userLikes, likeKey, nextTotal);
      if (e.simulated) sessionMetrics.simLikes += added;
      else sessionMetrics.realLikes += added;

      const prevMilestone = Math.floor(prevTotal / 1000);
      const nextMilestone = Math.floor(nextTotal / 1000);
      if (nextMilestone > prevMilestone) {
        broadcastAll('thousand_likes_broadcast', {
          userId: e.userId,
          nickname: e.nickname,
          avatar: e.avatar,
          likeCount: nextMilestone * 1000,
          totalLikes: nextTotal,
        });
      }
      applySirenRescueTap(e);
    }

    if (e.kind === 'follow') {
      const followerKey = `${e.simulated ? 'sim' : 'real'}:${e.userId || e.nickname}`;
      sessionMetrics.followers.add(followerKey);
      if (sessionMetrics.followers.size > 10000) {
        sessionMetrics.followers.delete(sessionMetrics.followers.values().next().value);
      }
      broadcastAll('new_follower_broadcast', {
        userId: e.userId,
        nickname: e.nickname,
        avatar: e.avatar,
        followerCount: sessionMetrics.followers.size,
      });
      const side = sessionMetrics.userSides.get(userSideKey) || 'bull';
      broadcastTugUpdate(viralEngine.tug.pull(side, 5, {
        userId: e.userId,
        nickname: e.nickname,
        avatar: e.avatar,
        label: 'Theo dõi kênh (+5kg)',
      }, 'follow'));
    }

    if (e.kind === 'comment' && e.comment) {
      if (commentSide) {
        broadcastTugUpdate(viralEngine.tug.pull(commentSide, 1, {
          userId: e.userId,
          nickname: e.nickname,
          avatar: e.avatar,
          label: commentSide === 'bull' ? 'Bò Húc (Comment)' : 'Gấu Tát (Comment)',
        }, 'comment'));
      }
      if (detectSirenRescueIntent(e.comment)) {
        applySirenRescueTap(e);
      }
    }

    if (e.kind === 'gift') {
      const totalCoins = Math.max(0, Number(e.coins || 0) * Math.max(1, Number(e.quantity || 1)));
      if (totalCoins >= 1) {
        const tierMeta = resolveGiftTierMeta(totalCoins);
        const side = sessionMetrics.userSides.get(userSideKey) || 'bull';
        broadcastTugUpdate(viralEngine.tug.pull(side, tierMeta.power, {
          userId: e.userId,
          nickname: e.nickname,
          avatar: e.avatar,
          label: `${e.giftName || tierMeta.defaultName} (${totalCoins} xu)`,
        }, 'gift'));
        if (!e.simulated && scoreLedger && e.userId) {
          try {
            const stored = scoreLedger.touchUser(e.userId, e.nickname, e.avatar);
            if (stored) {
              stored.score += totalCoins;
              scoreLedger.save();
            }
          } catch {}
        }
      }
    }

    return result;
  };
  let broadcastTimer=null,closing=false;
  const changed = () => { if(!closing && !broadcastTimer) broadcastTimer=setTimeout(()=>{broadcastTimer=null;broadcast();},80); };
  let tiktokSessions = store.read('tiktok-sessions', null);
  if (!tiktokSessions || !Array.isArray(tiktokSessions.accounts)) {
    const seedPath = path.join(root, 'data', 'tiktok-sessions.json');
    if (fs.existsSync(seedPath)) {
      try { tiktokSessions = JSON.parse(fs.readFileSync(seedPath, 'utf8')); } catch {}
    }
    if (!tiktokSessions || !Array.isArray(tiktokSessions.accounts)) {
      tiktokSessions = { mode: 'auto', accounts: [] };
    }
  }
  const saveTikTokSessions = () => {
    try {
      if (!store.blocked.has('tiktok-sessions')) {
        store.write('tiktok-sessions', source.sessionConfig);
      }
    } catch {}
  };
  source = new TikTokSource(engine, changed, tiktokSessions);
  ambientEngine = new AmbientEngine({
    engine,
    roomManager,
    viralEngine,
    source,
    scoreLedger,
    options: {
      autoStartTug: true,
      autoShow: true
    },
    onBroadcast: broadcastAll
  });
  engine.on('change', changed); engine.on('effect', data => broadcast('effect', data));
  let persistenceError = '';
  engine.on('stats', () => { try { store.write('stats', engine.stats); } catch (e) { if (e.message !== persistenceError) { persistenceError = e.message; engine.log('error', e.message); } } });
  store.errors.forEach(e => engine.log('error', e));
  // Same-origin and Host validation protect the loopback control API from other websites.
  const customAllowed = (process.env.ALLOWED_HOSTS || '').split(',').map(h => h.trim().toLowerCase()).filter(Boolean);
  // The Quick Tunnel forwards this explicit host header. It gets a read-only
  // overlay surface; local Admin stays on 127.0.0.1 and is never public.
  const remoteOverlayHost = 'overlay-remote.local';
  const isPrivateIp = host => /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|127\.)/.test(host);
  const isTunnelHost = host => /(\.serveousercontent\.com|\.loca\.lt|\.lhr\.life|\.ngrok-free\.app|\.trycloudflare\.com)$/i.test(host);
  const isCloudRuntime = Boolean(process.env.K_SERVICE || process.env.CLOUD_RUN_JOB || process.env.RENDER);
  const isCloudHost = host => /\.(?:web\.app|firebaseapp\.com|hosted\.app|a\.run\.app|run\.app|onrender\.com)$/i.test(host);
  const getDirectHost = req => (req.headers.host || '').split(':')[0].toLowerCase();
  const getReqHost = req => (req.headers['x-forwarded-host'] || req.headers.host || '').split(':')[0].toLowerCase();
  const isRemoteOverlayRequest = req => getDirectHost(req) === remoteOverlayHost;
  const hasRemoteControlToken = req => {
    const supplied = String(req.get('x-remote-control-token') || req.body?.token || '');
    const expected = String(remoteControl.token);
    return supplied.length === expected.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
  };
  const validHost = req => {
    const host = getReqHost(req);
    return ['127.0.0.1', 'localhost', remoteOverlayHost].includes(host)
      || isPrivateIp(host)
      || isTunnelHost(host)
      || (isCloudRuntime && isCloudHost(host))
      || customAllowed.includes(host)
      || customAllowed.includes('*');
  };
  const validOrigin = req => {
    if (!req.headers.origin) return true;
    try {
      const u = new URL(req.headers.origin);
      const originHost = u.hostname.toLowerCase();
      const reqHost = getReqHost(req);
      if (originHost === reqHost) return true;
      if (['127.0.0.1', 'localhost'].includes(originHost) && ['127.0.0.1', 'localhost'].includes(reqHost)) return true;
      if (isTunnelHost(originHost) && (isTunnelHost(reqHost) || ['127.0.0.1', 'localhost'].includes(reqHost) || isRemoteOverlayRequest(req))) return true;
      if (isCloudRuntime && isCloudHost(originHost) && (isCloudHost(reqHost) || isCloudHost(getDirectHost(req)))) return true;
      return false;
    } catch {
      return false;
    }
  };
  app.use((req, res, next) => { if (!validHost(req) || !validOrigin(req)) return res.status(403).json({ error: 'Chỉ chấp nhận truy cập từ trang local hoặc host được cấp quyền của tool.' }); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer'); next(); });
  app.use(express.json({ limit: '100kb' }));
  app.use((req, res, next) => {
    if (!isRemoteOverlayRequest(req)) return next();
    // Public tunnel is deliberately display-only: no Admin, control pages,
    // simulation endpoints, configuration, or write API calls.
    const remoteControlPage = req.path === remoteControlPath;
    const remoteControlApi = req.path.startsWith('/api/remote-control/') && hasRemoteControlToken(req);
    if (!remoteControlPage && !remoteControlApi && (!['GET', 'HEAD'].includes(req.method) || ['/admin', '/live-test', '/cockpit', '/test', '/demo'].includes(req.path) || req.path.startsWith('/api/') && !['/api/state', '/api/viral/state', '/api/overlay/events', '/api/news/ticker', '/api/market/xauusd', '/api/fortunes', '/api/tts', '/api/tts/voices'].includes(req.path))) {
      return res.status(403).json({ error: 'Link công khai chỉ phục vụ màn hình OBS.' });
    }
    next();
  });
  app.get('/', (_req, res) => {
    const indexPath = path.join(root, 'public', 'index.html');
    if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
    res.redirect('/admin');
  });
  app.get('/room/:roomId', (_req, res) => {
    const indexPath = path.join(root, 'public', 'index.html');
    if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
    res.redirect('/admin');
  });
  const routeFiles = {
    admin: 'admin.html',
    demo: 'demo.html',
    overlay: 'overlay.html',
    preview: 'overlay.html',
    'live-test': 'live-test.html',
    cockpit: 'live-test.html',
    test: 'live-test.html'
  };
  for (const route of Object.keys(routeFiles)) {
    app.get('/' + route, (_req, res) => res.sendFile(path.join(root, 'public', routeFiles[route])));
  }
  app.get(remoteControlPath, (_req, res) => res.sendFile(path.join(root, 'public', 'remote-control.html')));
  app.get('/api/app-info', (_req, res) => res.json({
    title: process.env.APP_TITLE || 'Đu Chart Online',
    symbols: SUPPORTED_SYMBOLS,
    timeframes: SUPPORTED_TIMEFRAMES,
    actions: FOREX_ACTIONS,
    wsOrigin: process.env.PUBLIC_WS_ORIGIN || (process.env.RENDER_EXTERNAL_HOSTNAME ? `wss://${process.env.RENDER_EXTERNAL_HOSTNAME}` : '')
  }));
  app.get('/api/rooms', (_req, res) => {
    const list = [...roomManager.rooms.values()].map(r => roomManager.getRoomSnapshot(r.id));
    res.json(list);
  });
  app.get('/api/rooms/:roomId', (req, res) => {
    const snap = roomManager.getRoomSnapshot(req.params.roomId);
    if (!snap) return res.status(404).json({ error: 'Phòng không tồn tại.' });
    res.json(snap);
  });
  app.get('/api/leaderboard', (_req, res) => res.json(scoreLedger.getLeaderboard(20)));
  app.post('/api/action', (req, res, next) => {
    try {
      const { roomId = 'general', userId, actionId } = req.body;
      const result = scoreLedger.recordAction(userId, actionId);
      roomManager.broadcastToRoom(roomId, {
        type: 'action_broadcast',
        data: result
      });
      const snapshot = roomManager.getRoomSnapshot(roomId);
      if (snapshot) {
        roomManager.broadcastToRoom(roomId, {
          type: 'presence_updated',
          data: snapshot
        });
      }
      if (actionId === 'incense') {
        const userProfile = scoreLedger.getUser(userId);
        const pullRes = viralEngine.tug.pull('bull', 15, {
          userId,
          nickname: userProfile?.name || 'Trader',
          avatar: userProfile?.avatar || '',
          label: 'Thắp Nhang Gồng Buy'
        }, 'action');
        if (pullRes?.ok) broadcastAll('tug_state_broadcast', viralEngine.tug.getState());
        try {
          const evtId = randomUUID();
          engine.ingest(normalizeEvent('gift', {
            user: { userId, nickname: userProfile?.name || 'Trader' },
            giftId: 'action-incense',
            giftName: 'Thắp nhang gồng lệnh',
            diamondCount: 3,
            repeatCount: 1,
            repeatEnd: true,
            eventId: evtId,
            groupId: evtId
          }, 'sim', true), 'incense');
        } catch {}
      } else if (actionId === 'bell') {
        const userProfile = scoreLedger.getUser(userId);
        const pullRes = viralEngine.tug.pull('bear', 15, {
          userId,
          nickname: userProfile?.name || 'Trader',
          avatar: userProfile?.avatar || '',
          label: 'Gõ Mõ Đè Sell'
        }, 'action');
        if (pullRes?.ok) broadcastAll('tug_state_broadcast', viralEngine.tug.getState());
        try {
          const evtId = randomUUID();
          engine.ingest(normalizeEvent('gift', {
            user: { userId, nickname: userProfile?.name || 'Trader' },
            giftId: 'action-bell',
            giftName: 'Chuông tĩnh tâm',
            diamondCount: 100,
            repeatCount: 1,
            repeatEnd: true,
            eventId: evtId,
            groupId: evtId
          }, 'sim', true), 'bell');
        } catch {}
      }
      res.json(result);
    } catch (e) {
      next(e);
    }
  });
  app.post('/api/moderate', (req, res, next) => {
    try {
      const { roomId = 'general', action, targetId, secret } = req.body;
      const result = roomManager.moderate(roomId, action, targetId, secret);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  const remoteControlAuth = (req, res, next) => hasRemoteControlToken(req) ? next() : res.status(401).json({ error: 'Link điều khiển không hợp lệ hoặc đã bị thay đổi.' });
  app.get('/api/remote-control/state', remoteControlAuth, (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    pruneOverlayJournal();
    const eventId = String(req.query.eventId || '').trim();
    const receipt = eventId ? overlayReceipts.get(eventId) : null;
    res.json({
      overlayConnected: Boolean(engine.renderer), overlays: snapshot().clients, viral: viralEngine.getState(),
      ambient: ambientEngine.getState(),
      delivery: eventId ? {
        eventId,
        known: Boolean(receipt),
        acknowledged: Boolean(receipt?.renderedAt),
        type: receipt?.type || null,
        emittedAt: receipt?.emittedAt || null,
        renderedAt: receipt?.renderedAt || null
      } : null,
      config: {
        musicFile: engine.config.musicFile, musicVolume: engine.config.musicVolume,
        voiceEnabled: engine.config.voiceEnabled, voiceVolume: engine.config.voiceVolume,
        chartSymbol: engine.config.chartSymbol, chartTimeframe: engine.config.chartTimeframe,
        showRitualBoard: engine.config.showRitualBoard, showLeaderboard: engine.config.showLeaderboard
      },
      music: listMusic().tracks
    });
  });
  app.post('/api/remote-control/settings', remoteControlAuth, (req, res) => {
    try {
      const input = req.body || {}, nextConfig = structuredClone(engine.config);
      if (Object.hasOwn(input, 'musicFile')) {
        const file = String(input.musicFile || '');
        if (file && !listMusic().tracks.some(track => track.file === file)) throw new Error('Bài nhạc không có trong thư viện.');
        nextConfig.musicFile = file;
      }
      if (Object.hasOwn(input, 'musicVolume')) nextConfig.musicVolume = Math.max(0, Math.min(1, Number(input.musicVolume)));
      if (Object.hasOwn(input, 'voiceEnabled')) nextConfig.voiceEnabled = input.voiceEnabled === true;
      if (Object.hasOwn(input, 'voiceVolume')) nextConfig.voiceVolume = Math.max(0, Math.min(1, Number(input.voiceVolume)));
      if (Object.hasOwn(input, 'chartSymbol')) {
        if (!SUPPORTED_SYMBOLS.includes(String(input.chartSymbol))) throw new Error('Mã biểu đồ không hợp lệ.');
        nextConfig.chartSymbol = String(input.chartSymbol);
      }
      if (Object.hasOwn(input, 'chartTimeframe')) {
        if (!SUPPORTED_TIMEFRAMES.includes(String(input.chartTimeframe))) throw new Error('Khung thời gian không hợp lệ.');
        nextConfig.chartTimeframe = String(input.chartTimeframe);
      }
      if (Object.hasOwn(input, 'showRitualBoard')) nextConfig.showRitualBoard = input.showRitualBoard === true;
      if (Object.hasOwn(input, 'showLeaderboard')) nextConfig.showLeaderboard = input.showLeaderboard === true;
      const valid = validateConfig(nextConfig);
      store.write('config', valid); engine.config = valid; changed();
      res.json({ ok: true, config: { musicFile: valid.musicFile, musicVolume: valid.musicVolume, chartSymbol: valid.chartSymbol, chartTimeframe: valid.chartTimeframe } });
    } catch (error) { res.status(400).json({ error: error.message || 'Không lưu được thiết lập.' }); }
  });
  app.post('/api/remote-control/command', remoteControlAuth, (req, res) => {
    const { command, headline } = req.body || {};
    const host = { userId: 'remote-host', nickname: 'Remote Streamer', avatar: '' };
    const respond = (event, message) => res.json({
      ok: true,
      message,
      eventId: event?.eventId || null,
      overlayOnline: Boolean(engine.renderer)
    });
    try {
      if (command === 'tug-start') {
        const state = viralEngine.tug.start({ durationSec: 90 });
        return respond(broadcastAll('tug_state_broadcast', state), 'Đã bắt đầu hiệp kéo co 90 giây.');
      }
      if (command === 'tug-reset') {
        const state = viralEngine.tug.reset();
        return respond(broadcastAll('tug_state_broadcast', state), 'Đã reset kéo co.');
      }
      if (command === 'tug-bull' || command === 'tug-bear') {
        const side = command === 'tug-bull' ? 'bull' : 'bear';
        const pull = viralEngine.tug.pull(side, 50, { ...host, nickname: side === 'bull' ? 'Remote · Bò Xanh' : 'Remote · Gấu Đỏ', label: 'Điều khiển từ xa' }, 'host');
        if (!pull.ok) return res.status(400).json({ error: pull.error || 'Không thể tiếp lực lúc này.' });
        return respond(broadcastAll('tug_state_broadcast', viralEngine.tug.getState()), `Đã tiếp +50 lực ${side === 'bull' ? 'Bò' : 'Gấu'}.`);
      }
      if (command === 'wheel') {
        const result = viralEngine.wheel.spin(host);
        return respond(broadcastAll('wheel_result_broadcast', result), `Vòng quay: ${result.title}`);
      }
      if (command === 'siren') {
        const alert = viralEngine.siren.trigger({ durationMs: 15000, headline: '🚨 [BÁO ĐỘNG ĐỎ] CÁ MẬP QUÉT THANH KHOẢN!' });
        return respond(broadcastAll('siren_alert_broadcast', alert), 'Đã bật còi báo động 15 giây.');
      }
      if (command === 'news') {
        const text = String(headline || '').trim().slice(0, 180) || '📣 TIN NÓNG: Xóm Trade vừa phát hiện tín hiệu khiến cả làng dậy sóng!';
        const flash = viralEngine.news.flashNews(text, 'Remote Streamer', 6000);
        return respond(broadcastAll('breaking_news_broadcast', flash), 'Đã phát Tin nóng.');
      }
      if (command === 'comedy') {
        const payload = { scenario: 'wife_chase', timestamp: Date.now() };
        return respond(broadcastAll('street_comedy_broadcast', payload), 'Đã diễn tiểu phẩm.');
      }
      if (command === 'legend') {
        const payload = { legend: { author: 'CZ Binance', title: 'Bậc Thầy Gồng Lãi', quote: 'If you cannot hold, you will not be rich!', badge: '💎' }, timestamp: Date.now() };
        return respond(broadcastAll('trader_legend_broadcast', payload), 'Đã mời huyền thoại trader.');
      }
      if (command === 'energy') {
        const pull = viralEngine.tug.pull('bull', 15, { ...host, label: 'Tiếp năng lượng từ xa' }, 'host');
        const event = pull.ok ? broadcastAll('tug_state_broadcast', viralEngine.tug.getState()) : null;
        const eventId = randomUUID();
        engine.ingest(normalizeEvent('gift', { user: host, giftId: 'remote-energy', giftName: 'Tiếp năng lượng gồng lệnh', diamondCount: 3, repeatCount: 1, repeatEnd: true, eventId, groupId: eventId }, 'sim', true), 'incense');
        return respond(event, 'Đã tiếp năng lượng cho Xóm Trade.');
      }
      if (command === 'fortune' || command === 'bell') {
        const eventId = randomUUID(), isBell = command === 'bell';
        engine.ingest(normalizeEvent('gift', {
          user: host,
          giftId: isBell ? 'remote-bell' : 'remote-fortune',
          giftName: isBell ? 'Chuông tỉnh tâm từ xa' : 'Bói quẻ nến từ xa',
          diamondCount: isBell ? 100 : 1,
          repeatCount: 1, repeatEnd: true, eventId, groupId: eventId
        }, 'sim', true), isBell ? 'bell' : 'fortune');
        return respond(null, isBell ? 'Đã gõ chuông tỉnh tâm.' : 'Đã bốc quẻ nến.');
      }
      return res.status(400).json({ error: 'Lệnh điều khiển không hợp lệ.' });
    } catch (error) {
      return res.status(400).json({ error: error.message || 'Không thể phát hiệu ứng.' });
    }
  });

  // Viral Engine REST Endpoints
  app.post('/api/viral/tug/action', (req, res) => {
    const { side, power = 1, userId, nickname, avatar, actionType = 'click' } = req.body || {};
    const pullResult = viralEngine.tug.pull(side, power, { userId, nickname, avatar, label: actionType }, actionType);
    if (pullResult.ok) {
      broadcastAll('tug_state_broadcast', viralEngine.tug.getState());
      return res.json({ ok: true, state: viralEngine.tug.getState(), pullResult });
    }
    return res.status(400).json({ error: pullResult.error || 'Lỗi kéo co.' });
  });

  const handleTugControl = (req, res) => {
    const { command = 'start', durationSec = 90 } = req.body || {};
    if (command === 'start') {
      const state = viralEngine.tug.start({ durationSec });
      broadcastAll('tug_state_broadcast', state);
      return res.json({ ok: true, roundId: state.roundId, status: 'active', durationSec: state.timeLeftSec, state });
    }
    if (command === 'reset') {
      const state = viralEngine.tug.reset();
      broadcastAll('tug_state_broadcast', state);
      return res.json({ ok: true, state });
    }
    if (command === 'stop' || command === 'finish') {
      const result = viralEngine.tug.finish();
      broadcastAll('tug_result_broadcast', result);
      return res.json({ ok: true, result });
    }
    return res.status(400).json({ error: 'Lệnh điều khiển không hợp lệ.' });
  };
  app.post('/api/viral/tug/control', handleTugControl);
  app.post('/api/tug/start', (req, res) => {
    const { durationSec = 90 } = req.body || {};
    const state = viralEngine.tug.start({ durationSec });
    broadcastAll('tug_state_broadcast', state);
    res.json({ ok: true, roundId: state.roundId, status: 'active', durationSec: state.timeLeftSec });
  });

  const handleWheelSpin = (req, res) => {
    try {
      const { userId, nickname, avatar } = req.body || {};
      const uid = userId || 'trader_' + randomUUID().slice(0, 6);
      const userProfile = scoreLedger?.getUser(uid);
      const spinUser = {
        userId: uid,
        nickname: nickname || userProfile?.name || 'Trader Ẩn Danh',
        avatar: avatar || userProfile?.avatar || ''
      };
      const result = viralEngine.wheel.spin(spinUser);
      if (scoreLedger && result.pointsAwarded !== 0) {
        try {
          const stored = scoreLedger.touchUser(uid, spinUser.nickname, spinUser.avatar);
          if (stored) {
            stored.score = Math.max(0, stored.score + result.pointsAwarded);
            scoreLedger.save();
          }
        } catch {}
      }
      broadcastAll('wheel_result_broadcast', result);
      res.json({ ok: true, ...result });
    } catch (err) {
      if (err.status === 429 || err.message?.includes('Quay quá nhanh') || err.message?.includes('tĩnh tâm')) {
        return res.status(429).json({ error: err.message });
      }
      res.status(400).json({ error: err.message });
    }
  };
  app.post('/api/viral/wheel/spin', handleWheelSpin);
  app.post('/api/wheel/spin', handleWheelSpin);

  const handleSirenTrigger = (req, res) => {
    const { durationMs = 15000, headline, subtext, reason, activeUsersTargeted } = req.body || {};
    const alert = viralEngine.siren.trigger({ durationMs, headline, subtext, reason, activeUsersTargeted });
    broadcastAll('siren_alert_broadcast', alert);
    res.json({ ok: true, ...alert });
  };
  app.post('/api/viral/siren/trigger', handleSirenTrigger);
  app.post('/api/siren/trigger', handleSirenTrigger);
  app.post('/api/viral/siren/hold-stoploss', (req, res) => {
    const { userId, nickname, avatar } = req.body || {};
    const uid = String(userId || nickname || 'anonymous');
    const stopRes = viralEngine.siren.recordHoldStopLoss(uid);
    if (!stopRes?.ok) return res.status(400).json({ error: stopRes?.error || 'Không có báo động nào đang hoạt động.' });
    if (stopRes.achievedBadge && scoreLedger) {
      try {
        const stored = scoreLedger.touchUser(uid, nickname, avatar);
        if (stored) {
          stored.score += 50;
          scoreLedger.save();
        }
      } catch {}
    }
    return res.json({ ...stopRes, state: viralEngine.siren.getState() });
  });

  app.post('/api/viral/news/flash', (req, res) => {
    const { headline, text, traderName, durationMs = 6000 } = req.body || {};
    const flash = viralEngine.news.flashNews(headline || text, traderName, durationMs);
    broadcastAll('breaking_news_broadcast', flash);
    res.json({ ok: true, ...flash });
  });

  // Street Market Comedy Slapstick Trigger Endpoint
  app.post('/api/viral/comedy/trigger', (req, res) => {
    const { scenario = 'wife_chase', type } = req.body || {};
    const payload = { scenario: type || scenario, timestamp: Date.now() };
    broadcastAll('street_comedy_broadcast', payload);
    res.json({ ok: true, ...payload });
  });

  // Randomized ~10-minute (9–11m) Ông Bụt fee-rebate patrol scheduler
  let butVisitTimer = null;
  let lastButLineIndex = -1;
  const emitButVisit = (options = {}) => {
    const picked = pickButAppearance({ ...options, lastIndex: lastButLineIndex });
    if (picked.index >= 0) lastButLineIndex = picked.index;
    const payload = { ...picked, durationMs: 9600, timestamp: Date.now() };
    broadcastAll('but_visit_broadcast', payload);
    return payload;
  };
  const scheduleNextButVisit = (delayMs = 540000 + Math.floor(Math.random() * 120000)) => {
    clearTimeout(butVisitTimer);
    if (closing) return;
    butVisitTimer = setTimeout(() => {
      if (closing) return;
      if (engine.config?.autoFeatures?.but !== false) {
        if (engine.current?.action === 'grand' || viralEngine.siren.active) {
          scheduleNextButVisit(15000);
          return;
        }
        emitButVisit({ automatic: true });
      }
      scheduleNextButVisit();
    }, delayMs);
    butVisitTimer.unref?.();
  };
  scheduleNextButVisit();

  // Solemn Deadpan Trader Legend Proclamation Endpoint
  app.post('/api/viral/legend/proclaim', (req, res) => {
    const { author, title, quote, badge } = req.body || {};
    const payload = {
      legend: {
        author: author || 'CZ Binance',
        title: title || 'Cựu CEO Binance · Bậc Thầy Gồng Lãi',
        quote: quote || 'If you cannot hold, you will not be rich! Không gồng được thì đừng mơ làm đại gia!',
        badge: badge || '💎'
      },
      timestamp: Date.now()
    };
    broadcastAll('trader_legend_broadcast', payload);
    res.json({ ok: true, ...payload });
  });

  app.post('/api/viral/but/trigger', (req, res) => {
    const { index, text, speechText } = req.body || {};
    const payload = emitButVisit({
      index: index != null ? Number(index) : null,
      text,
      speechText
    });
    scheduleNextButVisit();
    res.json({ ok: true, ...payload });
  });

  app.get('/api/viral/state', (req, res) => {
    const activeTraders = [...roomManager.rooms.values()].flatMap(r => [...r.clients].map(c => roomManager.clientMeta.get(c)?.nickname).filter(Boolean));
    res.json(viralEngine.getState(activeTraders, req.query.roomId || 'general'));
  });

  // HTTP delivery fallback for Browser Sources.  WebSocket remains the fast
  // path; this tiny feed heals a missed command after a network hiccup or an
  // OBS source reload.  It is read-only and therefore safe on the public
  // Overlay tunnel.
  app.get('/api/overlay/events', (req, res) => {
    pruneOverlayJournal();
    const after = String(req.query.after || '');
    const start = after ? overlayJournal.findIndex(event => event.eventId === after) + 1 : 0;
    res.setHeader('Cache-Control', 'no-store');
    res.json({ now: Date.now(), events: overlayJournal.slice(Math.max(0, start)).map(({ expiresAt, ...event }) => event) });
  });

  app.get('/api/news/ticker', (req, res) => {
    const activeTraders = [...roomManager.rooms.values()].flatMap(r => [...r.clients].map(c => roomManager.clientMeta.get(c)?.nickname).filter(Boolean));
    res.json({ items: viralEngine.news.getTickerItems(activeTraders, req.query.roomId || 'general') });
  });

  app.get('/api/market/xauusd', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ...goldSpot, serverTime: Date.now() });
  });

  // Ambient Simulation REST Endpoints
  app.get('/api/ambient/state', (_req, res) => {
    res.json(ambientEngine.getState());
  });

  app.post('/api/ambient/toggle', (req, res) => {
    const { enabled } = req.body || {};
    const state = ambientEngine.toggle(enabled);
    res.json({ ok: true, state });
  });

  app.post('/api/ambient/tick', (_req, res) => {
    const result = ambientEngine.tick();
    res.json({ ok: true, result, state: ambientEngine.getState() });
  });
  app.get('/api/state', (_req, res) => res.json(snapshot()));
  app.get('/api/fortunes', (_req, res) => res.json(engine.fortuneAudio));
  app.get('/api/music', (_req, res) => { res.setHeader('Cache-Control','no-store'); res.json(listMusic()); });
  app.put('/api/config', (req, res) => {
    const c = validateConfig(req.body); store.write('config', c); engine.config = c; changed(); res.json({ ok: true });
  });
  app.post('/api/connect', async (req, res, next) => { try { await source.connect(req.body.username); res.json({ ok: true }); } catch (e) { next(e); } });
  app.post('/api/disconnect', (_req, res) => { source.disconnect(); res.json({ ok: true }); });
  app.get('/api/tiktok/sessions', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(source.getPublicSessionState());
  });
  app.post('/api/tiktok/sessions/mode', (req, res) => {
    const mode = String(req.body?.mode || 'auto').trim() || 'auto';
    source.setSessionConfig({ ...source.sessionConfig, mode });
    saveTikTokSessions();
    changed();
    res.json({ ok: true, tiktokSessions: source.getPublicSessionState() });
  });
  app.post('/api/tiktok/sessions/verify', async (req, res) => {
    const targetId = String(req.body?.id || '').trim();
    const results = await source.verifySessions(targetId);
    saveTikTokSessions();
    const activeCount = source.sessionConfig.accounts.filter(a => a.status === 'active').length;
    engine.log('info', `Đã kiểm tra Session TikTok: ${activeCount}/${source.sessionConfig.accounts.length} nick hoạt động tốt.`);
    res.json({ ok: true, results, tiktokSessions: source.getPublicSessionState() });
  });
  app.post('/api/tiktok/sessions/import', async (req, res) => {
    const raw = String(req.body?.raw || '').trim();
    if (!raw) return res.status(400).json({ error: 'Vui lòng dán chuỗi Session / Cookie của nick TikTok.' });
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const imported = [];
    for (const line of lines) {
      const parsed = parseTikTokSessionLine(line);
      if (parsed) imported.push(parsed);
    }
    if (!imported.length) {
      return res.status(400).json({ error: 'Không tìm thấy sessionid hợp lệ trong chuỗi đã nhập.' });
    }
    const existing = [...source.sessionConfig.accounts];
    for (const item of imported) {
      const idx = existing.findIndex(a => a.id === item.id || a.username === item.username || a.sessionId === item.sessionId);
      if (idx >= 0) existing[idx] = { ...existing[idx], ...item };
      else existing.push(item);
    }
    source.setSessionConfig({ ...source.sessionConfig, accounts: existing });
    const results = await source.verifySessions();
    saveTikTokSessions();
    engine.log('info', `Đã nạp và xác thực ${imported.length} Session TikTok mới.`);
    res.json({ ok: true, importedCount: imported.length, results, tiktokSessions: source.getPublicSessionState() });
  });
  app.post('/api/control', (req, res) => { engine.control(req.body.command, req.body.id); res.json({ ok: true }); });
  // High-Fidelity Vietnamese Neural TTS Streaming Endpoints (Free Microsoft Edge Neural Engine)
  app.get('/api/tts/voices', (_req, res) => {
    res.json({ ok: true, voices: VOICES });
  });

  app.get('/api/tts', async (req, res) => {
    try {
      const text = String(req.query.text || '').trim();
      if (!text) {
        return res.status(400).json({ error: 'Thiếu tham số text cần đọc.' });
      }
      const voice = String(req.query.voice || 'hoaimy');
      const rate = String(req.query.rate || '+0%');
      const pitch = String(req.query.pitch || '+0Hz');

      const { filePath, isCached, size } = await getOrSynthesizeTts(text, { voice, rate, pitch });

      const range = req.headers.range;
      if (range && size > 0) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(String(range).trim());
        if (!match || (match[1] === '' && match[2] === '')) {
          return res.status(416).setHeader('Content-Range', `bytes */${size}`).end();
        }
        const start = match[1] === '' ? Math.max(0, size - Number(match[2])) : Number(match[1]);
        const end = match[1] === '' ? size - 1 : (match[2] === '' ? size - 1 : Math.min(size - 1, Number(match[2])));
        if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= size || start > end) {
          return res.status(416).setHeader('Content-Range', `bytes */${size}`).end();
        }
        const chunksize = (end - start) + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=604800, immutable',
          'X-TTS-Cached': isCached ? '1' : '0'
        });
        fileStream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': size,
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=604800, immutable',
          'X-TTS-Cached': isCached ? '1' : '0'
        });
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (err) {
      console.error('[API /api/tts] Synthesis error:', err.message);
      res.status(500).json({ error: 'TTS Synthesis failed', message: err.message });
    }
  });

  app.post('/api/voice/speak', (req, res) => {
    const { text = '', category = 'general', nickname = '', giftName = '', count = 1, quote = '', priority = 3, options = {} } = req.body || {};
    const voiceMode = options.voice || (['legend', 'husband', 'modem'].includes(category) ? 'namminh' : 'hoaimy');
    const audioUrl = text ? `/api/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voiceMode)}` : null;
    broadcastAll('voice_speak', { text, category, nickname, giftName, count, quote, priority, options, audioUrl, timestamp: Date.now() });
    res.json({ ok: true, broadcasted: true, text, category, audioUrl });
  });
  app.post('/api/simulate', (req, res) => {
    engine.simulationSeatsEnabled = source.state.status !== 'connected';
    const scenario = req.body.scenario || req.body.type || 'rose';
    const nickname = req.body.nickname || 'Người thử';
    const comment = req.body.comment || req.body.text || 'cầu an';
    const id = randomUUID(); const user = { userId: String(req.body.userId || id), nickname };
    if (scenario === 'hall') {
      if (source.state.status === 'connected') return res.status(400).json({ error: 'Ngắt kết nối TikTok trước khi thử bảng đóng góp mẫu.' });
      engine.showHallDemo(); return res.json({ status: 'hall-demo' });
    }
    if (scenario === 'ritual') {
      if (!Object.hasOwn(ACTIONS, req.body.action)) return res.status(400).json({ error: 'Kịch bản không hợp lệ.' });
      // A streamer button is a cue, not a queue request: cut an ambient/demo
      // scene short so its visual answer appears on the guest screen at once.
      if (engine.current) engine.finish(engine.current.id, 'interrupted', false);
      return res.json(engine.ingest(normalizeEvent('gift', { user, giftName: 'Thử kịch bản', eventId: id, groupId: id, repeatEnd: true }, 'sim', true), req.body.action));
    }
    if (scenario === 'burst') {
      const result = [];
      for (let i = 0; i < 4; i++) result.push(engine.ingest(normalizeEvent(i < 2 ? 'comment' : 'gift', { eventId: randomUUID(), user: { userId: randomUUID(), nickname: ['Minh An', 'Bình Tâm', 'Thanh Hoa', 'Thiện Tâm'][i] }, content: 'thắp hương', giftName: 'Rose', giftId: '5655', repeatCount: 1, repeatEnd: true, giftType: 1, diamondCount: 1 }, 'sim', true)));
      return res.json({ result });
    }
    if (scenario === 'comment') return res.json(engine.ingest({ ...normalizeEvent('comment', { user, content: comment, eventId: id }, 'sim', true), seatSimulation: source.state.status !== 'connected' }));
    if (['like', 'follow', 'share', 'join'].includes(scenario)) {
      if (scenario === 'join') {
        broadcastAll('trader_walk_in', { nickname, actionText: 'Kéo ghế vào Xóm Trade · Chuẩn bị vào lệnh', kind: 'join' });
      } else if (scenario === 'follow') {
        broadcastAll('trader_walk_in', { nickname, actionText: 'Đã theo dõi kênh · Kéo ghế vào Xóm Trade', kind: 'follow' });
      }
      return res.json(engine.ingest({ ...normalizeEvent(scenario, { user, eventId: id, likeCount: req.body.likeCount ?? req.body.count ?? 5 }, 'sim', true), seatSimulation: source.state.status !== 'connected' }));
    }
    if (!['rose', 'combo', 'grand', 'duplicate', 'gift'].includes(scenario)) return res.status(400).json({ error: 'Mô phỏng không hợp lệ.' });
    const coins = scenario === 'gift' ? Number(req.body.coins) : scenario === 'grand' ? 500 : 1;
    if (!Number.isInteger(coins) || coins < 0 || coins > 100000) return res.status(400).json({ error: 'Giá trị thử từ 0 đến 100000 xu.' });
    const repeatCount = scenario === 'combo' ? 5 : Math.min(100, Math.max(1, Math.floor(Number(req.body.repeatCount || 1))));
    const tierMeta = resolveGiftTierMeta(coins * repeatCount);
    const defaultGiftName = scenario === 'gift' ? (req.body.giftName || tierMeta.defaultName) : scenario === 'grand' ? 'Quà đại lễ' : 'Rose';
    const raw = { user, giftId: scenario === 'gift' ? `test-tier-${coins}` : scenario === 'grand' ? 'test-grand' : '5655', giftName: defaultGiftName, giftType: 1, groupId: id, eventId: id, diamondCount: coins };
    const counts = scenario === 'combo' ? [1, 2, 2, 5] : [repeatCount];
    counts.forEach(rc => engine.ingest(normalizeEvent('gift', { ...raw, repeatCount: rc, repeatEnd: false }, 'sim', true)));
    const final = { ...raw, repeatCount: counts.at(-1), repeatEnd: true };
    const result = engine.ingest(normalizeEvent('gift', final, 'sim', true));
    if (scenario === 'duplicate') engine.ingest(normalizeEvent('gift', final, 'sim', true));
    res.json({ ...result, coins: coins * repeatCount, giftName: defaultGiftName, repeatCount });
  });
  app.use(express.static(path.join(root, 'public'), {
    maxAge: '7d',
    immutable: true,
    setHeaders: (res, file) => {
      // HTML routes are sent above and always revalidated. Large assets and
      // versioned modules can be reused after a viewer reload.
      if (/\.(png|jpe?g|webp|wav|mp3|ogg|m4a|js|css)$/i.test(file)) res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  }));
  app.use((err, _req, res, _next) => res.status(400).json({ error: err.message || 'Yêu cầu không hợp lệ.' }));
  server.on('upgrade', (req, socket, head) => {
    if (!validHost(req) || !validOrigin(req) || req.url?.split('?')[0] !== '/ws') return socket.destroy();
    if (isRemoteOverlayRequest(req)) {
      const role = new URL(req.url, 'http://localhost').searchParams.get('role');
      if (!['overlay', 'preview'].includes(role || '')) return socket.destroy();
    }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  });
  const chooseRenderer = () => {
    const next = [...clients].find(([, c]) => c.role === 'overlay' && c.ready);
    engine.setRenderer(next?.[1].id || null);
  };
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const roomIdParam = url.searchParams.get('roomId');
    const role = url.searchParams.get('role');
    const remoteOverlay = isRemoteOverlayRequest(req);

    // Community Room client connection
    if (roomIdParam) {
      let currentRoomId = roomIdParam;
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });
      ws.on('error', () => {});

      ws.on('message', raw => {
        try {
          const msg = JSON.parse(raw);
          const type = msg.type;
          const data = msg.data || {};

          if (type === 'ping') {
            ws.isAlive = true;
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            return;
          }

          ambientEngine?.recordRealActivity();

          if (type === 'join_room') {
            currentRoomId = data.roomId || currentRoomId;
            const { room, meta } = roomManager.joinRoom(ws, currentRoomId, data.user);
            const snapshot = roomManager.getRoomSnapshot(currentRoomId);
            ws.send(JSON.stringify({ type: 'room_snapshot', data: snapshot }));
            ws.send(JSON.stringify({ type: 'viral_state', data: viralEngine.getState() }));
            roomManager.broadcastToRoom(currentRoomId, {
              type: 'presence_updated',
              data: snapshot
            }, ws);

            // Gửi thông báo chào mừng Trader vừa vào phòng
            const welcomeMsg = {
              id: randomUUID(),
              userId: 'system',
              nickname: 'Đạo Tràng',
              badge: '🌿 Chào Mừng',
              text: `👋 Chào mừng ${meta.nickname} vừa vào phòng! Chúc bạn gồng lệnh vững tâm, nến xanh rực rỡ!`,
              time: Date.now()
            };
            room.messages.push(welcomeMsg);
            if (room.messages.length > 50) room.messages.shift();
            roomManager.broadcastToRoom(currentRoomId, {
              type: 'user_joined_broadcast',
              data: welcomeMsg
            });

            // Kích hoạt bong bóng thông báo "Vừa vào đạo tràng" trên màn hình OBS Overlay
            try {
              engine.ingest(normalizeEvent('join', {
                user: { userId: meta.userId, nickname: meta.nickname, avatar: meta.avatar },
                eventId: randomUUID()
              }, 'sim', true));
            } catch {}
          } else if (type === 'set_room_state') {
            const meta = roomManager.clientMeta.get(ws);
            if (!meta) return;
            const result = roomManager.setRoomState(currentRoomId, meta.userId, {
              symbol: data.symbol,
              timeframe: data.timeframe
            });
            if (result.ok) {
              roomManager.broadcastToRoom(currentRoomId, {
                type: 'room_state_updated',
                data: {
                  symbol: result.room.symbol,
                  timeframe: result.room.timeframe,
                  version: result.room.version,
                  hostId: result.room.hostId
                }
              });
            }
          } else if (type === 'chat_message') {
            const meta = roomManager.clientMeta.get(ws);
            if (!meta) return;
            const { message } = roomManager.addChatMessage(currentRoomId, meta.userId, data.text);
            roomManager.broadcastToRoom(currentRoomId, {
              type: 'chat_broadcast',
              data: message
            });
            // Detect comment intent for Bull vs Bear TugOfWar
            const side = detectCommentIntent(data.text);
            if (side) {
              const pullRes = viralEngine.tug.pull(side, 1, {
                userId: meta.userId,
                nickname: meta.nickname,
                avatar: meta.avatar,
                label: side === 'bull' ? 'Bò Húc (Chat)' : 'Gấu Tát (Chat)'
              }, 'comment');
              if (pullRes?.ok) {
                broadcastAll('tug_state_broadcast', viralEngine.tug.getState());
              }
            }
          } else if (type === 'reaction') {
            const meta = roomManager.clientMeta.get(ws);
            if (!meta) return;
            const { reaction } = roomManager.addReaction(currentRoomId, meta.userId, data.reactionId);
            roomManager.broadcastToRoom(currentRoomId, {
              type: 'reaction_broadcast',
              data: reaction
            });
            if (data.reactionId === 'gong-tiep' || data.reactionId === 'xin-via-xanh') {
              const pullRes = viralEngine.tug.pull('bull', 2, {
                userId: meta.userId,
                nickname: meta.nickname,
                avatar: meta.avatar,
                label: reaction.label
              }, 'reaction');
              if (pullRes?.ok) broadcastAll('tug_state_broadcast', viralEngine.tug.getState());
            } else if (data.reactionId === 'dung-ngoai' || data.reactionId === 've-bo') {
              const pullRes = viralEngine.tug.pull('bear', 2, {
                userId: meta.userId,
                nickname: meta.nickname,
                avatar: meta.avatar,
                label: reaction.label
              }, 'reaction');
              if (pullRes?.ok) broadcastAll('tug_state_broadcast', viralEngine.tug.getState());
            }
          } else if (type === 'action') {
            const meta = roomManager.clientMeta.get(ws);
            if (!meta) return;
            const result = scoreLedger.recordAction(meta.userId, data.actionId);
            roomManager.broadcastToRoom(currentRoomId, {
              type: 'action_broadcast',
              data: {
                ...result,
                nickname: meta.nickname
              }
            });
            const snapshot = roomManager.getRoomSnapshot(currentRoomId);
            if (snapshot) {
              roomManager.broadcastToRoom(currentRoomId, {
                type: 'presence_updated',
                data: snapshot
              });
            }
            if (data.actionId === 'incense') {
              const pullRes = viralEngine.tug.pull('bull', 15, {
                userId: meta.userId,
                nickname: meta.nickname,
                avatar: meta.avatar,
                label: 'Thắp Nhang Gồng Buy'
              }, 'action');
              if (pullRes?.ok) broadcastAll('tug_state_broadcast', viralEngine.tug.getState());
              try {
                const evtId = randomUUID();
                engine.ingest(normalizeEvent('gift', {
                  user: { userId: meta.userId, nickname: meta.nickname },
                  giftId: 'action-incense',
                  giftName: 'Thắp nhang gồng lệnh',
                  diamondCount: 3,
                  repeatCount: 1,
                  repeatEnd: true,
                  eventId: evtId,
                  groupId: evtId
                }, 'sim', true), 'incense');
              } catch {}
            } else if (data.actionId === 'bell') {
              const pullRes = viralEngine.tug.pull('bear', 15, {
                userId: meta.userId,
                nickname: meta.nickname,
                avatar: meta.avatar,
                label: 'Gõ Mõ Đè Sell'
              }, 'action');
              if (pullRes?.ok) broadcastAll('tug_state_broadcast', viralEngine.tug.getState());
              try {
                const evtId = randomUUID();
                engine.ingest(normalizeEvent('gift', {
                  user: { userId: meta.userId, nickname: meta.nickname },
                  giftId: 'action-bell',
                  giftName: 'Chuông tĩnh tâm',
                  diamondCount: 100,
                  repeatCount: 1,
                  repeatEnd: true,
                  eventId: evtId,
                  groupId: evtId
                }, 'sim', true), 'bell');
              } catch {}
            }
          } else if (type === 'tug_pull') {
            const meta = roomManager.clientMeta.get(ws) || {};
            const weight = Math.min(500, Math.max(1, Number(data.weight) || 1));
            const pullRes = viralEngine.tug.pull(data.side, weight, {
              userId: meta.userId || data.userId,
              nickname: meta.nickname || data.nickname,
              avatar: meta.avatar,
              label: data.actionType || 'Kéo Co'
            }, data.actionType || 'click');
            if (pullRes?.ok) {
              broadcastAll('tug_state_broadcast', viralEngine.tug.getState());
            } else if (pullRes?.error) {
              ws.send(JSON.stringify({ type: 'error', data: { message: pullRes.error } }));
            }
          } else if (type === 'wheel_spin') {
            const meta = roomManager.clientMeta.get(ws) || {};
            try {
              const uid = meta.userId || data.userId || 'trader_' + randomUUID().slice(0, 4);
              const spinUser = {
                userId: uid,
                nickname: meta.nickname || data.nickname || 'Trader',
                avatar: meta.avatar || ''
              };
              const result = viralEngine.wheel.spin(spinUser);
              if (scoreLedger && result.pointsAwarded !== 0) {
                try {
                  const stored = scoreLedger.touchUser(uid, spinUser.nickname, spinUser.avatar);
                  if (stored) {
                    stored.score = Math.max(0, stored.score + result.pointsAwarded);
                    scoreLedger.save();
                  }
                } catch {}
              }
              broadcastAll('wheel_result_broadcast', result);
            } catch (err) {
              ws.send(JSON.stringify({ type: 'error', data: { message: err.message, status: err.status || 400 } }));
            }
          } else if (type === 'siren_trigger') {
            const alert = viralEngine.siren.trigger({
              reason: data.reason,
              durationMs: data.durationMs,
              headline: data.headline
            });
            broadcastAll('siren_alert_broadcast', alert);
          } else if (type === 'siren_stop_loss') {
            const meta = roomManager.clientMeta.get(ws) || {};
            const uid = meta.userId || data.userId;
            const clickRes = viralEngine.siren.recordHoldStopLoss(uid);
            if (clickRes?.achievedBadge && scoreLedger) {
              try {
                const u = scoreLedger.touchUser(uid, meta.nickname);
                if (u) {
                  u.score += 50;
                  scoreLedger.save();
                }
              } catch {}
            }
            ws.send(JSON.stringify({ type: 'siren_click_ack', data: clickRes }));
          } else if (type === 'breaking_news_submit') {
            const meta = roomManager.clientMeta.get(ws) || {};
            const news = viralEngine.news.flashNews(data.text, meta.nickname || data.nickname);
            broadcastAll('breaking_news_broadcast', news);
          } else if (type === 'heartbeat') {
            roomManager.heartbeat(ws);
          } else if (type === 'admin_command') {
            const result = roomManager.moderate(currentRoomId, data.command, data.targetId, data.secret);
            ws.send(JSON.stringify({ type: 'admin_response', data: result }));
          }
        } catch (err) {
          ws.send(JSON.stringify({ type: 'error', data: { message: err.message } }));
        }
      });

      ws.on('close', () => {
        const leftMeta = roomManager.leaveCurrentRoom(ws);
        if (leftMeta) {
          const snapshot = roomManager.getRoomSnapshot(leftMeta.roomId);
          if (snapshot) {
            roomManager.broadcastToRoom(leftMeta.roomId, {
              type: 'presence_updated',
              data: snapshot
            });
          }
        }
      });
      return;
    }

    // Legacy overlay client connection
    const client = { id: randomUUID(), role, ready: false, alive: true }; clients.set(ws, client);
    ws.isAlive = true;
    ws.on('pong', () => { client.alive = true; ws.isAlive = true; });
    ws.send(JSON.stringify({ type: 'hello', data: { id: client.id } }));
    ws.send(JSON.stringify({ type: 'state', data: snapshot() }));
    ws.send(JSON.stringify({ type: 'viral_state', data: viralEngine.getState() }));
    ws.on('message', raw => {
      try {
        const msg = JSON.parse(raw);
        if (msg.type === 'ping') {
          client.alive = true;
          ws.isAlive = true;
          ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          return;
        }
        if (msg.type === 'overlay-rendered' && role === 'overlay' && engine.renderer === client.id) {
          acknowledgeOverlayEvent(msg.eventId, client);
          return;
        }
        ambientEngine?.recordRealActivity();
        if (msg.type === 'ready' && role === 'overlay') {
          client.ready = true;
          if (!engine.renderer) chooseRenderer();
          // Replay only to the Overlay which has just announced readiness.
          // This prevents a remote OBS source from losing a command that was
          // sent in the short gap before its WebSocket became usable.
          replayOverlayJournal(ws);
          changed();
        }
        if (msg.type === 'complete' && engine.renderer === client.id && engine.current?.id === msg.id && Date.now() >= engine.current.startedAt + engine.current.duration - 500) engine.finish(msg.id);
        if (msg.type === 'audio') { client.audio = msg.enabled === true; changed(); }
        if (msg.type === 'audio-error' && engine.renderer === client.id && msg.id === engine.current?.id && !client.audioErrorJobs?.has(msg.id)) {
          (client.audioErrorJobs ||= new Set()).add(msg.id);
          if (client.audioErrorJobs.size > 100) client.audioErrorJobs.clear();
          engine.log('warn', `Không phát được lời đọc cho ${engine.current.nickname}. Giữ thẻ theo thời gian dự phòng.`);
        }
        if (!remoteOverlay && msg.type === 'tug_pull') {
          const weight = Math.min(500, Math.max(1, Number(msg.data?.weight) || 1));
          const pullRes = viralEngine.tug.pull(msg.data?.side, weight, msg.data?.user || {}, msg.data?.actionType || 'click');
          if (pullRes?.ok) broadcastAll('tug_state_broadcast', viralEngine.tug.getState());
        }
        if (!remoteOverlay && msg.type === 'wheel_spin') {
          try {
            const result = viralEngine.wheel.spin(msg.data || {});
            broadcastAll('wheel_result_broadcast', result);
          } catch {}
        }
        if (!remoteOverlay && msg.type === 'siren_trigger') {
          const alert = viralEngine.siren.trigger(msg.data || {});
          broadcastAll('siren_alert_broadcast', alert);
        }
        if (msg.type === 'siren_stop_loss') {
          viralEngine.siren.recordHoldStopLoss(msg.data?.userId);
        }
        if (!remoteOverlay && msg.type === 'breaking_news_submit') {
          const news = viralEngine.news.flashNews(msg.data?.text, msg.data?.nickname);
          broadcastAll('breaking_news_broadcast', news);
        }
      } catch { /* Invalid renderer input cannot affect the queue. */ }
    });
    ws.on('error', () => {});
    ws.on('close', () => { clients.delete(ws); if (engine.renderer === client.id) { engine.setRenderer(null); chooseRenderer(); } changed(); });
  });
  const tick = setInterval(() => engine.tick(), 1000);
  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        try { ws.terminate(); } catch {}
      } else {
        ws.isAlive = false;
        try { ws.ping(); } catch {}
      }
    }
  }, 10000);
  const cleanupTimer = setInterval(() => {
    try {
      scoreLedger?.cleanup();
      roomManager?.cleanup();
      viralEngine?.cleanup();
    } catch {}
  }, 60000);
  function close() {
    closing = true;
    clearTimeout(broadcastTimer);
    clearTimeout(butVisitTimer);
    ambientEngine.close();
    viralEngine.close();
    engine.flushParticipants(true);
    clearInterval(tick);
    clearInterval(heartbeat);
    clearInterval(cleanupTimer);
    clearInterval(goldSpotTimer);
    source.disconnect();
    for (const ws of clients.keys()) ws.terminate();
    wss.close();
    return new Promise(resolve => server.close(resolve));
  }
  return { app, server, engine, source, scoreLedger, roomManager, viralEngine, ambientEngine, close };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const instance = createApp(); const port = Number(process.env.PORT || 3000);
  instance.server.on('error', e => { console.error(e.code === 'EADDRINUSE' ? `Cổng ${port} đang bận. Đóng tool cũ hoặc chương trình dùng cổng này rồi mở lại.` : e.message); instance.close().finally(() => process.exit(1)); });
  const host = process.env.HOST || '0.0.0.0';
  instance.server.listen(port, host, () => {
    console.log(`Đu Chart Online\nTrang chủ: http://127.0.0.1:${port}\nQuản lý: http://127.0.0.1:${port}/admin\nOBS Live: http://127.0.0.1:${port}/overlay\nTruy cập mạng nội bộ LAN: http://<IP_MAY_TINH>:${port}\nCtrl+C để đóng.`);
    prewarmTtsCache().catch(console.warn);
    if (process.argv.includes('--open') && process.platform === 'win32') {
      const browser = spawn('explorer.exe', [`http://127.0.0.1:${port}/admin`], { detached: true, stdio: 'ignore', windowsHide: true });
      browser.on('error', () => console.log('Mở trang quản lý bằng địa chỉ ở trên.')); browser.unref();
    }
  });
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => instance.close().finally(() => process.exit(0)));
}
