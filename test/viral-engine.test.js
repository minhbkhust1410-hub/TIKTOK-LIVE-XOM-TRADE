import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import {
  WHEEL_SLOTS,
  NEWS_TEMPLATES,
  PROFESSOR_DOG_QUOTES,
  BULL_HONORARY_TITLES,
  BEAR_HONORARY_TITLES,
  DRAW_HONORARY_TITLES,
  TugOfWar,
  WheelOfFate,
  LiquiditySiren,
  NewsTicker,
  ViralEngine,
  detectCommentIntent,
  detectSirenRescueIntent
} from '../src/viral-engine.js';
import { createApp } from '../server.js';

test('1. TugOfWar Unit Tests: Game loop, pull mechanics, knockout and MVP calculation', () => {
  const tug = new TugOfWar({ durationSec: 90 });
  assert.equal(tug.status, 'idle');
  assert.equal(tug.timeLeftSec, 90);
  assert.equal(tug.bullPower, 0);
  assert.equal(tug.bearPower, 0);
  assert.equal(tug.ropePosition, 0);

  // Start round
  const started = tug.start({ durationSec: 60 });
  assert.equal(started.status, 'active');
  assert.equal(started.timeLeftSec, 60);

  // Bull pulls with 20 power: impulse = 20 * 0.05 = +1.0
  const pullBull = tug.pull('bull', 20, { userId: 'u_bull', nickname: 'Trần Bull' });
  assert.equal(pullBull.ok, true);
  assert.equal(tug.bullPower, 20);
  assert.equal(tug.ropePosition, 1.0);
  assert.equal(tug.lastAction.side, 'bull');
  assert.equal(tug.lastAction.nickname, 'Trần Bull');

  // Bear pulls with 40 power: impulse = -40 * 0.05 = -2.0 => ropePosition = 1.0 - 2.0 = -1.0
  const pullBear = tug.pull('bear', 40, { userId: 'u_bear', nickname: 'Lê Bear' });
  assert.equal(pullBear.ok, true);
  assert.equal(tug.bearPower, 40);
  assert.equal(tug.ropePosition, -1.0);

  // Tick applies friction and decrements timer
  tug.tick(5);
  assert.equal(tug.timeLeftSec, 55);

  // Knockout Bull: Pull large power to cross +100%
  const knockoutPull = tug.pull('bull', 3000, { userId: 'u_whale', nickname: 'Cá Voi Xanh' });
  assert.equal(knockoutPull.finished, true);
  assert.equal(tug.status, 'finished');
  assert.equal(tug.ropePosition, 100);
  assert.equal(knockoutPull.result.winner, 'bull');
  assert.equal(knockoutPull.result.mvp.userId, 'u_whale');
  assert.ok(knockoutPull.result.headline.includes('BÒ HÚC'));

  // Reset restores idle
  tug.reset();
  assert.equal(tug.status, 'idle');
  assert.equal(tug.ropePosition, 0);
  assert.equal(tug.bullPower, 0);

  // Timer expiry finish and Draw condition
  tug.start({ durationSec: 5 });
  tug.pull('bull', 2, { userId: 'u1', nickname: 'Trader 1' });
  tug.pull('bear', 2, { userId: 'u2', nickname: 'Trader 2' });
  const finalResult = tug.tick(10); // expires
  assert.equal(tug.status, 'finished');
  assert.equal(finalResult.winner, 'draw');
  assert.ok(finalResult.headline.includes('HAI PHE'));
});

test('2. WheelOfFate Unit Tests: 8 slots, weights, angles and cooldown enforcement', () => {
  const wheel = new WheelOfFate({ cooldownMs: 25000 });
  assert.equal(wheel.slots.length, 8);

  const totalWeight = wheel.slots.reduce((s, x) => s + x.weight, 0);
  assert.equal(totalWeight, 100);

  // First spin succeeds
  const spin1 = wheel.spin({ userId: 'trader_wheel_1', nickname: 'Mai Hoa' });
  assert.ok(spin1.slotIndex >= 0 && spin1.slotIndex <= 7);
  assert.ok(typeof spin1.slotKey === 'string');
  assert.ok(typeof spin1.title === 'string');
  assert.ok(typeof spin1.quote === 'string');
  assert.ok(typeof spin1.finalAngle === 'number');
  assert.ok(spin1.finalAngle > 1000); // multiple 360-degree rotations

  // Immediate second spin throws cooldown error
  assert.throws(
    () => wheel.spin({ userId: 'trader_wheel_1', nickname: 'Mai Hoa' }),
    err => err.status === 429 && err.message.includes('Quay quá nhanh')
  );

  // Different user can spin without cooldown
  const spin2 = wheel.spin({ userId: 'trader_wheel_2', nickname: 'Hoàng Nam' });
  assert.ok(spin2.slotIndex >= 0 && spin2.slotIndex <= 7);

  // Resetting cooldown allows user 1 to spin again
  wheel.resetCooldown('trader_wheel_1');
  const spin3 = wheel.spin({ userId: 'trader_wheel_1', nickname: 'Mai Hoa' });
  assert.ok(spin3.slotIndex >= 0 && spin3.slotIndex <= 7);
});

test('3. LiquiditySiren Unit Tests: Activation, Stop-loss clicks minigame and resolution', () => {
  const siren = new LiquiditySiren();
  assert.equal(siren.active, false);

  // Trigger siren alert
  const alert = siren.trigger({ durationMs: 15000, reason: 'NFP Non-farm' });
  assert.equal(siren.active, true);
  assert.ok(alert.alertId.startsWith('alert_'));
  assert.equal(alert.level, 'critical');
  assert.ok(alert.subtext.includes('NFP Non-farm'));

  // Stop-loss click tracking
  for (let i = 1; i <= 14; i++) {
    const res = siren.recordHoldStopLoss('user_survivor');
    assert.equal(res.clicks, i);
    assert.equal(res.achievedBadge, false);
    assert.equal(res.points, 0);
  }

  // 15th click unlocks Diamond Hands badge and 50 points
  const res15 = siren.recordHoldStopLoss('user_survivor');
  assert.equal(res15.clicks, 15);
  assert.equal(res15.achievedBadge, true);
  assert.equal(res15.points, 50);

  // Resolve siren
  const peace = siren.resolve();
  assert.equal(siren.active, false);
  assert.equal(peace.active, false);
  assert.ok(peace.headline.includes('Bão đã tan'));
  assert.equal(peace.survivorCount, 1);
  siren.close();
});

test('4. NewsTicker Unit Tests: 25+ Satirical templates, rates and personal headlines', () => {
  const news = new NewsTicker();
  assert.ok(news.templates.length >= 25);

  const items = news.getTickerItems(['Hoàng Nam', 'Trần Tuấn'], 'Hội Đu Vàng');
  assert.ok(items.length >= 6);
  // Contains currency rates
  assert.ok(items.some(it => it.includes('EUR/USD') || it.includes('XAU/USD')));
  // Contains replaced trader names
  assert.ok(items.some(it => it.includes('Hoàng Nam') || it.includes('Trần Tuấn')));

  // Flash News popup
  const flash = news.flashNews('BẢN TIN NÓNG: {trader} vừa giải cứu thị trường!', 'Đạo Hữu Tuấn');
  assert.equal(flash.mode, 'popup');
  assert.ok(flash.headline.includes('Đạo Hữu Tuấn vừa giải cứu'));
  assert.equal(flash.sound, 'fanfare');
});

test('5. detectCommentIntent Unit Tests: Bull vs Bear keywords, diacritics and disambiguation', () => {
  // Bull keywords
  assert.equal(detectCommentIntent('buy'), 'bull');
  assert.equal(detectCommentIntent('long'), 'bull');
  assert.equal(detectCommentIntent('bò'), 'bull');
  assert.equal(detectCommentIntent('bo'), 'bull');
  assert.equal(detectCommentIntent('xanh'), 'bull');
  assert.equal(detectCommentIntent('lên'), 'bull');
  assert.equal(detectCommentIntent('len'), 'bull');
  assert.equal(detectCommentIntent('1'), 'bull');
  assert.equal(detectCommentIntent('buyyyyy'), 'bull');
  assert.equal(detectCommentIntent('bò húc bay cản'), 'bull');
  assert.equal(detectCommentIntent('cho nến xanh đi'), 'bull');

  // Bear keywords
  assert.equal(detectCommentIntent('sell'), 'bear');
  assert.equal(detectCommentIntent('short'), 'bear');
  assert.equal(detectCommentIntent('gấu'), 'bear');
  assert.equal(detectCommentIntent('gau'), 'bear');
  assert.equal(detectCommentIntent('đỏ'), 'bear');
  assert.equal(detectCommentIntent('do'), 'bear');
  assert.equal(detectCommentIntent('xuống'), 'bear');
  assert.equal(detectCommentIntent('xuong'), 'bear');
  assert.equal(detectCommentIntent('2'), 'bear');
  assert.equal(detectCommentIntent('sellll'), 'bear');
  assert.equal(detectCommentIntent('gấu vồ sập bàn'), 'bear');
  assert.equal(detectCommentIntent('nến đỏ lòm'), 'bear');

  // Disambiguation / Edge cases
  assert.equal(detectCommentIntent('vào lệnh 100 lot'), null); // not standalone '1'
  assert.equal(detectCommentIntent('200 pip'), null); // not standalone '2'
  assert.equal(detectCommentIntent('long hay short'), null); // both keywords
  assert.equal(detectCommentIntent('hôm nay trời đẹp'), null); // no keywords
  assert.equal(detectCommentIntent(''), null);
  assert.equal(detectCommentIntent(null), null);
});

test('6. REST API Integration: All viral endpoints work as specified in Data Contract', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'viral-rest-'));
  const app = createApp({ dataDir: dir });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const port = app.server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. POST /api/viral/tug/control (start round)
    const resStart = await fetch(`${baseUrl}/api/viral/tug/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'start', durationSec: 90 })
    });
    assert.equal(resStart.status, 200);
    const dataStart = await resStart.json();
    assert.equal(dataStart.ok, true);
    assert.equal(dataStart.status, 'active');

    // 2. Spec alias POST /api/tug/start
    const resAliasStart = await fetch(`${baseUrl}/api/tug/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: 'general', durationSec: 80 })
    });
    assert.equal(resAliasStart.status, 200);
    const dataAliasStart = await resAliasStart.json();
    assert.equal(dataAliasStart.ok, true);
    assert.equal(dataAliasStart.durationSec, 80);

    // 3. POST /api/viral/tug/action
    const resTugAction = await fetch(`${baseUrl}/api/viral/tug/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ side: 'bull', power: 10, userId: 'api_trader', nickname: 'API Trader' })
    });
    assert.equal(resTugAction.status, 200);
    const dataTugAction = await resTugAction.json();
    assert.equal(dataTugAction.ok, true);
    assert.equal(dataTugAction.state.bullPower, 10);

    // 4. POST /api/viral/wheel/spin (and /api/wheel/spin)
    const resWheel1 = await fetch(`${baseUrl}/api/wheel/spin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: 'general', userId: 'qa_wheel_user' })
    });
    assert.equal(resWheel1.status, 200);
    const dataWheel1 = await resWheel1.json();
    assert.equal(dataWheel1.ok, true);
    assert.ok(dataWheel1.slotIndex >= 0 && dataWheel1.slotIndex <= 7);

    // Cooldown check: Immediate repeat gives 429 Too Many Requests
    const resWheelCooldown = await fetch(`${baseUrl}/api/wheel/spin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: 'general', userId: 'qa_wheel_user' })
    });
    assert.equal(resWheelCooldown.status, 429);
    const dataWheelCooldown = await resWheelCooldown.json();
    assert.ok(dataWheelCooldown.error.includes('Quay quá nhanh'));

    // 5. POST /api/viral/siren/trigger
    const resSiren = await fetch(`${baseUrl}/api/siren/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: 'general', reason: 'NFP Non-Farm Payroll' })
    });
    assert.equal(resSiren.status, 200);
    const dataSiren = await resSiren.json();
    assert.equal(dataSiren.ok, true);
    assert.ok(dataSiren.alertId.startsWith('alert_'));

    // 6. POST /api/viral/news/flash
    const resNewsFlash = await fetch(`${baseUrl}/api/viral/news/flash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Chiến thần vừa gồng lãi 100 pip!' })
    });
    assert.equal(resNewsFlash.status, 200);
    const dataNewsFlash = await resNewsFlash.json();
    assert.equal(dataNewsFlash.ok, true);
    assert.equal(dataNewsFlash.mode, 'popup');

    // 7. GET /api/viral/state
    const resViralState = await fetch(`${baseUrl}/api/viral/state`);
    assert.equal(resViralState.status, 200);
    const dataViralState = await resViralState.json();
    assert.ok(dataViralState.tug);
    assert.ok(dataViralState.wheel);
    assert.ok(dataViralState.siren);
    assert.ok(dataViralState.news);

    // 8. GET /api/news/ticker
    const resTicker = await fetch(`${baseUrl}/api/news/ticker`);
    assert.equal(resTicker.status, 200);
    const dataTicker = await resTicker.json();
    assert.ok(Array.isArray(dataTicker.items));
    assert.ok(dataTicker.items.length >= 4);
  } finally {
    await app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('7. WebSocket Real-time Broadcast: tug_pull, wheel_spin, siren, news and chat keyword trigger', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'viral-ws-'));
  const app = createApp({ dataDir: dir });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const port = app.server.address().port;
  const wsUrl = `ws://127.0.0.1:${port}/ws?roomId=general`;

  const connectWs = (userId, name) => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      const messages = [];
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'join_room',
          data: { roomId: 'general', user: { id: userId, name } }
        }));
      });
      ws.on('message', raw => {
        const msg = JSON.parse(raw);
        messages.push(msg);
      });
      ws.on('error', reject);
      const waitFor = (predicate, timeout = 3000) => {
        const start = Date.now();
        return new Promise((res, rej) => {
          const check = () => {
            const found = messages.find(predicate);
            if (found) return res(found);
            if (Date.now() - start > timeout) return rej(new Error(`Timed out waiting for WS message`));
            setTimeout(check, 25);
          };
          check();
        });
      };
      waitFor(m => m.type === 'room_snapshot').then(() => resolve({ ws, messages, waitFor })).catch(reject);
    });
  };

  try {
    const clientA = await connectWs('trader_a', 'Hiệp Sĩ Xanh');
    const clientB = await connectWs('trader_b', 'Chiến Thần Đỏ');

    // 1. Initial connection received viral_state
    const initialViral = await clientA.waitFor(m => m.type === 'viral_state');
    assert.ok(initialViral.data.tug);

    // 2. Client A sends tug_pull (Bull)
    clientA.ws.send(JSON.stringify({
      type: 'tug_pull',
      data: { roomId: 'general', side: 'bull', weight: 5, actionType: 'click' }
    }));

    // Client B receives tug_state_broadcast
    const tugB = await clientB.waitFor(m => m.type === 'tug_state_broadcast');
    assert.equal(typeof tugB.data.ropePosition, 'number');
    assert.ok(tugB.data.bullPower >= 5);

    // 3. Client A sends wheel_spin
    clientA.ws.send(JSON.stringify({
      type: 'wheel_spin',
      data: { roomId: 'general' }
    }));

    // Client B receives wheel_result_broadcast
    const wheelB = await clientB.waitFor(m => m.type === 'wheel_result_broadcast');
    assert.ok(wheelB.data.slotIndex >= 0 && wheelB.data.slotIndex <= 7);
    assert.ok(typeof wheelB.data.finalAngle === 'number');

    // 4. Client A triggers siren
    clientA.ws.send(JSON.stringify({
      type: 'siren_trigger',
      data: { roomId: 'general', reason: 'Cá mập săn râu nến' }
    }));

    // Client B receives siren_alert_broadcast
    const sirenB = await clientB.waitFor(m => m.type === 'siren_alert_broadcast');
    assert.equal(sirenB.data.level, 'critical');
    assert.ok(sirenB.data.headline.includes('BÁO ĐỘNG'));

    // 5. Client A submits breaking news
    clientA.ws.send(JSON.stringify({
      type: 'breaking_news_submit',
      data: { roomId: 'general', text: 'Vừa chốt non 2 pip thành công!' }
    }));

    // Client B receives breaking_news_broadcast
    const newsB = await clientB.waitFor(m => m.type === 'breaking_news_broadcast');
    assert.equal(newsB.data.mode, 'popup');
    assert.ok(newsB.data.headline.includes('chốt non 2 pip'));

    // 6. Automatic Comment Keyword Detection:
    // Client A sends chat message containing "buy"
    const prevBullPower = app.viralEngine.tug.bullPower;
    clientA.ws.send(JSON.stringify({
      type: 'chat_message',
      data: { text: 'Anh em hô buy nhiệt tình lên nào!' }
    }));

    // Verify chat was received and bullPower increased automatically
    await clientB.waitFor(m => m.type === 'chat_broadcast' && m.data.text.includes('hô buy'));
    assert.equal(app.viralEngine.tug.bullPower, prevBullPower + 1);

    // 7. Reaction triggering Tug of War:
    // Client B clicks reaction "gong-tiep" -> Bull power +2
    const currentBullPower = app.viralEngine.tug.bullPower;
    clientB.ws.send(JSON.stringify({
      type: 'reaction',
      data: { reactionId: 'gong-tiep' }
    }));
    await clientA.waitFor(m => m.type === 'reaction_broadcast' && m.data.reactionId === 'gong-tiep');
    assert.equal(app.viralEngine.tug.bullPower, currentBullPower + 2);

    clientA.ws.close();
    clientB.ws.close();
  } finally {
    await app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('8. Professor Dog Quotes, Satirical News Expansion & Phong Thần Honorary Titles', () => {
  // 1. Professor Dog Quotes: 25+ sharp technical analysis satire quotes
  assert.ok(Array.isArray(PROFESSOR_DOG_QUOTES));
  assert.ok(PROFESSOR_DOG_QUOTES.length >= 25, 'Expected at least 25 Professor Dog quotes');
  
  const allDogText = PROFESSOR_DOG_QUOTES.join(' ');
  assert.ok(allDogText.includes('Elliot'), 'Missing Elliot Wave satire in Professor Dog quotes');
  assert.ok(allDogText.includes('búa') && allDogText.includes('rút chân'), 'Missing Hammer/Wick candle satire');
  assert.ok(allDogText.includes('RSI'), 'Missing RSI divergence satire');
  assert.ok(allDogText.includes('MA200'), 'Missing MA200 resistance satire');
  assert.ok(allDogText.includes('Bull Trap'), 'Missing Bull Trap satire');
  assert.ok(allDogText.includes('Bear Trap'), 'Missing Bear Trap satire');
  assert.ok(allDogText.includes('Cắt lỗ') || allDogText.includes('cắt lỗ'), 'Missing cut loss at bottom satire');
  assert.ok(allDogText.includes('Chốt non') || allDogText.includes('chốt non'), 'Missing premature profit satire');
  assert.ok(allDogText.includes('Gồng lỗ') || allDogText.includes('gồng lỗ'), 'Missing immortal bagholding satire');

  // 2. Satirical News Expansion: 45+ templates (50 total)
  assert.ok(NEWS_TEMPLATES.length >= 45, 'Expected at least 45 news templates');
  const allNewsText = NEWS_TEMPLATES.join(' ');
  assert.ok(allNewsText.includes('Fed') || allNewsText.includes('Powell'), 'Missing Fed / Powell news satire');
  assert.ok(allNewsText.includes('Non-Farm'), 'Missing Non-Farm news satire');
  assert.ok(allNewsText.includes('CPI'), 'Missing CPI inflation news satire');
  assert.ok(allNewsText.includes('Cá mập') || allNewsText.includes('Cá voi'), 'Missing whale dump news satire');
  assert.ok(allNewsText.includes('rút dây mạng') || allNewsText.includes('Rút dây mạng'), 'Missing router unplug technique satire');

  // 3. Phong Thần Honorary Titles for Tug of War MVP
  assert.ok(BULL_HONORARY_TITLES.some(t => t.title === 'Chúa Tể Bắt Đáy'));
  assert.ok(BULL_HONORARY_TITLES.some(t => t.title === 'Đại Gia Phước Dày'));
  assert.ok(BEAR_HONORARY_TITLES.some(t => t.title === 'Chiến Thần Gồng Lỗ'));

  const tug = new TugOfWar();
  tug.start({ durationSec: 10 });
  tug.pull('bull', 1500, { userId: 'vip_bull', nickname: 'Nam Khánh' });
  const bullResult = tug.finish();
  assert.equal(bullResult.winner, 'bull');
  assert.equal(bullResult.mvp.title, 'Đại Gia Phước Dày');
  assert.ok(bullResult.mvp.badge);

  tug.reset();
  tug.start({ durationSec: 10 });
  tug.pull('bear', 500, { userId: 'vip_bear', nickname: 'Mai Hoa' });
  const bearResult = tug.finish();
  assert.equal(bearResult.winner, 'bear');
  assert.ok(['Chiến Thần Gồng Lỗ', 'Cụ Tổ Đạp Đáy', 'Sát Thủ Vả Nến', 'Chúa Tể Thoát Hàng', 'Đại Ca Quét Râu'].includes(bearResult.mvp.title));
  assert.ok(bearResult.mvp.badge);
});

test('9. Audience Interaction Pipeline: Cumulative 1000 likes, Follow dedup, 7 Coin Tiers & Chat Rescue', async () => {
  // Digit voting should not falsely fire inside normal chat sentences
  assert.equal(detectCommentIntent('tp 1 đi thầy'), null);
  assert.equal(detectCommentIntent('chốt non 2 pip thôi'), null);
  assert.equal(detectCommentIntent('team 1'), 'bull');
  assert.equal(detectCommentIntent('phe 2'), 'bear');
  assert.equal(detectSirenRescueIntent('cắt lỗ gấp thầy ơi'), true);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audience-pipeline-'));
  const app = createApp({ dataDir: dir });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const port = app.server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const connectClient = async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?roomId=general&role=overlay&nickname=QA`);
    const messages = [];
    ws.on('message', raw => {
      try { messages.push(JSON.parse(raw.toString())); } catch {}
    });
    await once(ws, 'open');
    await new Promise(r => setTimeout(r, 80));
    return { ws, messages };
  };

  const client = await connectClient();
  try {
    // 1. Follow simulate emits exactly ONE new_follower_broadcast and +5 tug power
    app.viralEngine.tug.start({ durationSec: 90 });
    const prevFollowerMsgCount = client.messages.filter(m => m.type === 'new_follower_broadcast').length;
    const prevBullFollow = app.viralEngine.tug.bullPower;
    const followRes = await fetch(`${baseUrl}/api/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: 'follow', userId: 'follower_1', nickname: 'Lan Anh' })
    });
    assert.equal(followRes.status, 200);
    await new Promise(r => setTimeout(r, 60));
    assert.equal(client.messages.filter(m => m.type === 'new_follower_broadcast').length - prevFollowerMsgCount, 1);
    assert.equal(app.viralEngine.tug.bullPower, prevBullFollow + 5);

    // 2. Cumulative 10x150 = 1500 likes emits exactly ONE thousand_likes_broadcast crossing 1000
    const prevThousandCount = client.messages.filter(m => m.type === 'thousand_likes_broadcast').length;
    for (let i = 0; i < 10; i++) {
      const likeRes = await fetch(`${baseUrl}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: 'like', userId: 'burst_user_1', nickname: 'Chiến Thần Tim', likeCount: 150 })
      });
      assert.equal(likeRes.status, 200);
    }
    await new Promise(r => setTimeout(r, 80));
    const newThousandMsgs = client.messages.filter(m => m.type === 'thousand_likes_broadcast').slice(prevThousandCount);
    assert.equal(newThousandMsgs.length, 1);
    assert.equal(newThousandMsgs[0].data.likeCount, 1000);
    assert.equal(newThousandMsgs[0].data.totalLikes, 1050);

    // 3. All 7 coin tiers push exact queue rituals & proportionate Tug power without instant knockout
    const tierExpectations = [
      [1, 'fortune', 10],
      [3, 'incense', 25],
      [5, 'lotus', 45],
      [10, 'prayer', 90],
      [30, 'fruit', 200],
      [100, 'bell', 450],
      [500, 'grand', 1000]
    ];
    await fetch(`${baseUrl}/api/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: 'comment', userId: 'donor_pref', nickname: 'Tín Đồ Gấu', comment: 'gấu vồ' })
    });
    for (const [coins, expectedAction, expectedPower] of tierExpectations) {
      app.viralEngine.tug.reset();
      app.viralEngine.tug.start({ durationSec: 90 });
      const beforeQueue = app.engine.queue.length;
      const gRes = await fetch(`${baseUrl}/api/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: 'gift', userId: 'donor_pref', nickname: 'Tín Đồ Gấu', coins })
      });
      assert.equal(gRes.status, 200);
      const gJson = await gRes.json();
      assert.equal(gJson.status, 'queued');
      assert.equal(gJson.coins, coins);
      assert.equal(app.engine.queue.length, beforeQueue + 1);
      assert.equal(app.engine.queue.findLast(j => j.coins === coins).action, expectedAction);
      assert.equal(app.viralEngine.tug.bearPower, expectedPower);
    }

    // 4. Active Siren can be helped by TikTok chat ("cắt lỗ gấp") and REST /hold-stoploss
    await fetch(`${baseUrl}/api/viral/siren/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'CPI News' })
    });
    assert.equal(app.viralEngine.siren.active, true);
    await fetch(`${baseUrl}/api/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: 'comment', userId: 'rescue_1', nickname: 'Đạo Hữu', comment: 'cắt lỗ gấp' })
    });
    assert.ok((app.viralEngine.siren.stopLossClicks.get('rescue_1')?.clicks || 0) >= 1);
    const slRes = await fetch(`${baseUrl}/api/viral/siren/hold-stoploss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'rescue_1', nickname: 'Đạo Hữu' })
    });
    assert.equal(slRes.status, 200);
    const slJson = await slRes.json();
    assert.equal(slJson.ok, true);
    assert.ok(slJson.clicks >= 2);

    // 5. Ông Bụt fee-rebate cameo endpoint & WebSocket broadcast (manual works even when autoFeatures OFF)
    const stateNow = await (await fetch(`${baseUrl}/api/state`)).json();
    const allAutoOff = Object.fromEntries(
      Object.keys(stateNow.config.autoFeatures).map(k => [k, false])
    );
    await fetch(`${baseUrl}/api/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...stateNow.config, autoFeatures: allAutoOff })
    });

    const butRes = await fetch(`${baseUrl}/api/viral/but/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(butRes.status, 200);
    const butJson = await butRes.json();
    assert.equal(butJson.ok, true);
    assert.equal(butJson.phone, undefined);
    assert.ok(butJson.contact.toLowerCase().includes('bio'));
    assert.ok(butJson.text.toLowerCase().includes('hoàn phí'));
    assert.ok(butJson.text.toLowerCase().includes('bio'));
    assert.ok(!/\d{4,}/.test(butJson.text));
    assert.ok(!/back\s*com/i.test(butJson.text));

    const comedyManual = await fetch(`${baseUrl}/api/viral/comedy/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: 'wife_chase' })
    });
    assert.equal(comedyManual.status, 200);
    assert.equal((await comedyManual.json()).ok, true);

    await new Promise(r => setTimeout(r, 60));
    const butMsgs = client.messages.filter(m => m.type === 'but_visit_broadcast');
    assert.ok(butMsgs.length >= 1);
    assert.equal(butMsgs[butMsgs.length - 1].data.text, butJson.text);
  } finally {
    client.ws.close();
    await app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
