import { WebSocket } from 'ws';
import assert from 'node:assert/strict';

const BASE_URL = 'http://127.0.0.1:3001';
const HEADERS = {
  'Content-Type': 'application/json',
  'Host': '127.0.0.1:3001',
  'Origin': 'http://127.0.0.1:3001'
};

async function postJson(endpoint, body) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function getJson(endpoint) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Host': '127.0.0.1:3001',
      'Origin': 'http://127.0.0.1:3001'
    }
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function getText(endpoint) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Host': '127.0.0.1:3001',
      'Origin': 'http://127.0.0.1:3001'
    }
  });
  const text = await res.text();
  return { status: res.status, ok: res.ok, text };
}

console.log('══════════════════════════════════════════════════════════════');
console.log('🧪 BẮT ĐẦU KIỂM TRA THỰC TẾ TRÊN SERVER RUNTIME (PORT 3001)');
console.log('══════════════════════════════════════════════════════════════\n');

// 1. Kiểm tra HTTP GET Routes
console.log('▶ [PHẦN 1] Kiểm tra các Trang Giao Diện (GET Routes)...');

const getOverlay = await getText('/overlay');
assert.equal(getOverlay.status, 200, 'GET /overlay thất bại');
assert.ok(getOverlay.text.includes('id="tugArena"'), 'Giao diện /overlay thiếu tugArena');
assert.ok(getOverlay.text.includes('id="wheelContainer"'), 'Giao diện /overlay thiếu wheelContainer');
assert.ok(getOverlay.text.includes('id="sirenOverlay"'), 'Giao diện /overlay thiếu sirenOverlay');
assert.ok(getOverlay.text.includes('id="newsTickerBar"'), 'Giao diện /overlay thiếu newsTickerBar');
assert.ok(getOverlay.text.includes('id="tv_chart_container"'), 'Giao diện /overlay thiếu TradingView Container');
assert.ok(getOverlay.text.includes('id="hall"'), 'Giao diện /overlay thiếu Đạo tràng 28 ghế (#hall)');
console.log('  ✔ GET /overlay: HTTP 200 OK - Đầy đủ 4 tính năng Viral, TradingView và Đạo tràng 28 ghế');

const getAdmin = await getText('/admin');
assert.equal(getAdmin.status, 200, 'GET /admin thất bại');
assert.ok(getAdmin.text.includes('btnAdminTugStart'), 'Trang /admin thiếu nút btnAdminTugStart');
assert.ok(getAdmin.text.includes('btnAdminWheelSpin'), 'Trang /admin thiếu nút btnAdminWheelSpin');
assert.ok(getAdmin.text.includes('btnAdminSirenTrigger'), 'Trang /admin thiếu nút btnAdminSirenTrigger');
console.log('  ✔ GET /admin: HTTP 200 OK - Streamer Control Panel đầy đủ bộ nút Viral');

const getPreview = await getText('/preview');
assert.equal(getPreview.status, 200, 'GET /preview thất bại');
console.log('  ✔ GET /preview: HTTP 200 OK');

const getRoot = await getText('/');
assert.equal(getRoot.status, 200, 'GET / thất bại');
console.log('  ✔ GET /: HTTP 200 OK');

const getLiveTest = await getText('/live-test');
assert.equal(getLiveTest.status, 200, 'GET /live-test thất bại');
assert.ok(getLiveTest.text.includes('XÓM TRADE · PHÒNG TEST 1 CỬA SỔ'), 'Giao diện /live-test thiếu tiêu đề');
assert.ok(getLiveTest.text.includes('viewSplitBtn'), 'Giao diện /live-test thiếu nút split view');
console.log('  ✔ GET /live-test: HTTP 200 OK - Cockpit phòng test 1 cửa sổ');

// 2. Kiểm tra REST API Endpoints
console.log('\n▶ [PHẦN 2] Kiểm tra các REST API Endpoints...');

// 2.1 POST /api/viral/tug/control (start)
const tugStart = await postJson('/api/viral/tug/control', { command: 'start', durationSec: 90 });
assert.equal(tugStart.status, 200);
assert.equal(tugStart.data.ok, true);
assert.equal(tugStart.data.status, 'active');
assert.ok(tugStart.data.roundId);
console.log(`  ✔ POST /api/viral/tug/control (start): OK (roundId: ${tugStart.data.roundId}, status: active)`);

// 2.2 POST /api/viral/tug/action (kéo Bò)
const tugPullBull = await postJson('/api/viral/tug/action', {
  side: 'bull',
  power: 20,
  userId: 'qa_user_bull',
  nickname: 'Hiệp Sĩ Bull QA',
  actionType: 'Thắp Nhang Gồng Buy'
});
assert.equal(tugPullBull.status, 200);
assert.equal(tugPullBull.data.ok, true);
assert.equal(tugPullBull.data.state.bullPower, 20);
assert.ok(tugPullBull.data.state.ropePosition > 0);
console.log(`  ✔ POST /api/viral/tug/action (Bull pull): OK (Bull: ${tugPullBull.data.state.bullPower}kg, Pos: +${tugPullBull.data.state.ropePosition}%)`);

// 2.3 POST /api/viral/tug/action (kéo Gấu)
const tugPullBear = await postJson('/api/viral/tug/action', {
  side: 'bear',
  power: 35,
  userId: 'qa_user_bear',
  nickname: 'Chiến Thần Bear QA',
  actionType: 'Gõ Mõ Đè Sell'
});
assert.equal(tugPullBear.status, 200);
assert.equal(tugPullBear.data.ok, true);
assert.equal(tugPullBear.data.state.bearPower, 35);
console.log(`  ✔ POST /api/viral/tug/action (Bear pull): OK (Bear: ${tugPullBear.data.state.bearPower}kg, Pos: ${tugPullBear.data.state.ropePosition}%)`);

// 2.4 POST /api/viral/wheel/spin (lần 1)
const testPilotId = 'qa_wheel_pilot_' + Date.now();
const wheelSpin1 = await postJson('/api/viral/wheel/spin', {
  userId: testPilotId,
  nickname: 'Đạo Hữu Vận May'
});
assert.equal(wheelSpin1.status, 200);
assert.equal(wheelSpin1.data.ok, true);
assert.ok(wheelSpin1.data.slotIndex >= 0 && wheelSpin1.data.slotIndex <= 7);
assert.ok(typeof wheelSpin1.data.title === 'string');
assert.ok(typeof wheelSpin1.data.pointsAwarded === 'number');
assert.ok(wheelSpin1.data.finalAngle > 1000);
console.log(`  ✔ POST /api/viral/wheel/spin (Spin 1): OK (Trúng ô [${wheelSpin1.data.slotIndex}] "${wheelSpin1.data.title}", Góc: ${wheelSpin1.data.finalAngle.toFixed(1)}°, Điểm: ${wheelSpin1.data.pointsAwarded})`);

// 2.5 POST /api/viral/wheel/spin (lần 2 liên tiếp - kiểm tra 429 Cooldown)
const wheelSpin2 = await postJson('/api/viral/wheel/spin', {
  userId: testPilotId,
  nickname: 'Đạo Hữu Vận May'
});
assert.equal(wheelSpin2.status, 429, 'Spam spin phải trả về HTTP 429');
assert.ok(wheelSpin2.data.error.includes('tĩnh tâm') || wheelSpin2.data.error.includes('Quay quá nhanh'));
console.log(`  ✔ POST /api/viral/wheel/spin (Rate Limit Cooldown): HTTP 429 OK ("${wheelSpin2.data.error}")`);

// 2.6 POST /api/viral/siren/trigger
const sirenTrigger = await postJson('/api/viral/siren/trigger', {
  durationMs: 15000,
  headline: '🚨 BÁO ĐỘNG ĐỎ: CÁ MẬP QUÉT THANH KHOẢN HAI ĐẦU!',
  subtext: 'Rút dây mạng gấp, không bắt đáy!'
});
assert.equal(sirenTrigger.status, 200);
assert.equal(sirenTrigger.data.ok, true);
assert.equal(sirenTrigger.data.level, 'critical');
assert.equal(sirenTrigger.data.durationMs, 15000);
console.log(`  ✔ POST /api/viral/siren/trigger: OK (alertId: ${sirenTrigger.data.alertId}, level: critical)`);

// 2.7 POST /api/viral/news/flash
const newsFlash = await postJson('/api/viral/news/flash', {
  headline: 'CHẤN ĐỘNG: Hiệp Sĩ Bull QA vừa nhồi lệnh cứu cả làng nến xanh!',
  traderName: 'Hiệp Sĩ Bull QA',
  durationMs: 6000
});
assert.equal(newsFlash.status, 200);
assert.equal(newsFlash.data.ok, true);
assert.ok(newsFlash.data.newsId);
assert.equal(newsFlash.data.durationMs, 6000);
console.log(`  ✔ POST /api/viral/news/flash: OK (newsId: ${newsFlash.data.newsId}, headline: "${newsFlash.data.headline}")`);

// 2.8 GET /api/viral/state
const viralState = await getJson('/api/viral/state?roomId=general');
assert.equal(viralState.status, 200);
assert.ok(viralState.data.tug);
assert.ok(viralState.data.wheel);
assert.ok(viralState.data.siren);
assert.ok(viralState.data.news);
console.log(`  ✔ GET /api/viral/state: OK (Tug: ${viralState.data.tug.status}, Siren: ${viralState.data.siren.active ? 'ACTIVE' : 'IDLE'}, Ticker items: ${(viralState.data.news.ticker || []).length})`);

// 2.9 GET /api/news/ticker
const tickerRes = await getJson('/api/news/ticker?roomId=general');
assert.equal(tickerRes.status, 200);
assert.ok(Array.isArray(tickerRes.data.items));
assert.ok(tickerRes.data.items.length >= 4);
console.log(`  ✔ GET /api/news/ticker: OK (Lấy được ${tickerRes.data.items.length} tin tức & tỷ giá thị trường)`);

// 2.10 Reset Tug of war
const tugReset = await postJson('/api/viral/tug/control', { command: 'reset' });
assert.equal(tugReset.status, 200);
assert.equal(tugReset.data.ok, true);
assert.equal(tugReset.data.state.status, 'idle');
console.log(`  ✔ POST /api/viral/tug/control (reset): OK (Đã trả về idle)`);

// 3. Kiểm tra WebSocket Broadcast & Tương tác hai chiều
console.log('\n▶ [PHẦN 3] Kiểm tra Kết Nối & Broadcast Gói Tin WebSocket Thực Tế...');

const wsUrlClient = 'ws://127.0.0.1:3001/ws?roomId=general';
const wsUrlOverlay = 'ws://127.0.0.1:3001/ws?role=overlay';

const wsOptions = {
  headers: {
    'Host': '127.0.0.1:3001',
    'Origin': 'http://127.0.0.1:3001'
  }
};

const wsClient = new WebSocket(wsUrlClient, wsOptions);
const wsOverlay = new WebSocket(wsUrlOverlay, wsOptions);

await Promise.all([
  new Promise((res, rej) => { wsClient.on('open', res); wsClient.on('error', rej); }),
  new Promise((res, rej) => { wsOverlay.on('open', res); wsOverlay.on('error', rej); })
]);

console.log('  ✔ WebSocket đã mở thành công 2 kênh: Community Client & Overlay Stage');

// Lưu các bản tin broadcast nhận được trên client và overlay
const receivedClient = [];
const receivedOverlay = [];

wsClient.on('message', raw => {
  try {
    receivedClient.push(JSON.parse(raw.toString()));
  } catch {}
});

wsOverlay.on('message', raw => {
  try {
    receivedOverlay.push(JSON.parse(raw.toString()));
  } catch {}
});

// Gửi thông điệp tham gia phòng
wsClient.send(JSON.stringify({
  type: 'join_room',
  data: {
    roomId: 'general',
    user: { userId: 'qa_ws_user_1', nickname: 'Trader WebSocket QA' }
  }
}));

// Chờ 150ms để nhận initial snapshots
await new Promise(r => setTimeout(r, 150));
assert.ok(receivedClient.some(m => m.type === 'room_snapshot' || m.type === 'viral_state'));
console.log('  ✔ Khởi tạo phòng và đồng bộ viral_state ban đầu thành công');

// TEST 3.1: Broadcast tug_state_broadcast qua WebSocket action
console.log('  Testing 3.1: tug_state_broadcast qua WebSocket pull...');
receivedClient.length = 0;
receivedOverlay.length = 0;

// Bắt đầu trận kéo co
await postJson('/api/viral/tug/control', { command: 'start', durationSec: 90 });
await new Promise(r => setTimeout(r, 80));

// Gửi lực kéo Bò từ wsClient
wsClient.send(JSON.stringify({
  type: 'tug_pull',
  data: {
    side: 'bull',
    weight: 12,
    userId: 'qa_ws_user_1',
    nickname: 'Trader WebSocket QA',
    actionType: 'Thắp Nhang'
  }
}));

await new Promise(r => setTimeout(r, 200));
const tugStateMsg = receivedOverlay.findLast(m => m.type === 'tug_state_broadcast');
assert.ok(tugStateMsg, 'Overlay không nhận được tug_state_broadcast');
assert.equal(tugStateMsg.data.bullPower, 12);
console.log('  ✔ tug_state_broadcast phân phối thành công tới Overlay và Client');

// TEST 3.2: Broadcast wheel_result_broadcast qua WebSocket
console.log('  Testing 3.2: wheel_result_broadcast qua WebSocket spin...');
receivedClient.length = 0;
receivedOverlay.length = 0;

wsClient.send(JSON.stringify({
  type: 'wheel_spin',
  data: {
    userId: 'qa_ws_spinner_' + Date.now(),
    nickname: 'Trader Quay May Mắn'
  }
}));

await new Promise(r => setTimeout(r, 150));
const wheelResultMsg = receivedOverlay.find(m => m.type === 'wheel_result_broadcast');
assert.ok(wheelResultMsg, 'Overlay không nhận được wheel_result_broadcast');
assert.ok(wheelResultMsg.data.slotIndex >= 0 && wheelResultMsg.data.slotIndex <= 7);
console.log(`  ✔ wheel_result_broadcast phân phối thành công (Ô: "${wheelResultMsg.data.title}", Góc: ${wheelResultMsg.data.finalAngle.toFixed(1)}°)`);

// TEST 3.3: Broadcast siren_alert_broadcast qua WebSocket
console.log('  Testing 3.3: siren_alert_broadcast qua WebSocket trigger...');
receivedClient.length = 0;
receivedOverlay.length = 0;

wsClient.send(JSON.stringify({
  type: 'siren_trigger',
  data: {
    durationMs: 15000,
    headline: '🚨 QUÉT THANH KHOẢN WS TEST!',
    reason: 'WS Trigger Test'
  }
}));

await new Promise(r => setTimeout(r, 150));
const sirenMsg = receivedOverlay.find(m => m.type === 'siren_alert_broadcast');
assert.ok(sirenMsg, 'Overlay không nhận được siren_alert_broadcast');
assert.equal(sirenMsg.data.level, 'critical');
console.log('  ✔ siren_alert_broadcast phân phối thành công tới Overlay');

// TEST 3.4: Minigame Stop-Loss click trong còi hú
console.log('  Testing 3.4: Minigame Stop-Loss 15 clicks...');
let lastAck = null;
for (let i = 1; i <= 15; i++) {
  wsClient.send(JSON.stringify({
    type: 'siren_stop_loss',
    data: { userId: 'qa_ws_user_1' }
  }));
}
await new Promise(r => setTimeout(r, 200));
const acks = receivedClient.filter(m => m.type === 'siren_click_ack');
assert.ok(acks.length > 0, 'Client không nhận được siren_click_ack');
lastAck = acks[acks.length - 1].data;
assert.equal(lastAck.clicks, 15);
assert.equal(lastAck.achievedBadge, true);
assert.equal(lastAck.points, 50);
console.log(`  ✔ Minigame Stop-loss: 15 clicks đạt chuẩn -> Huân chương Bàn Tay Kim Cương (+50 điểm) OK`);

// TEST 3.5: Broadcast breaking_news_broadcast
console.log('  Testing 3.5: breaking_news_broadcast qua WebSocket submit...');
receivedClient.length = 0;
receivedOverlay.length = 0;

wsClient.send(JSON.stringify({
  type: 'breaking_news_submit',
  data: {
    text: 'TIN NÓNG: Đạo Hữu QA vừa quét sạch toàn bộ thanh khoản phe Gấu!',
    nickname: 'Đạo Hữu QA'
  }
}));

await new Promise(r => setTimeout(r, 150));
const breakingMsg = receivedOverlay.find(m => m.type === 'breaking_news_broadcast');
assert.ok(breakingMsg, 'Overlay không nhận được breaking_news_broadcast');
assert.ok(breakingMsg.data.headline.includes('Đạo Hữu QA'));
console.log('  ✔ breaking_news_broadcast phân phối thành công tới Overlay và Client');

// TEST 3.6: Chat keyword intent tự động kích hoạt Kéo Co
console.log('  Testing 3.6: Chat keyword intent trigger TugOfWar...');
const beforeBullPower = (await getJson('/api/viral/state')).data.tug.bullPower;

wsClient.send(JSON.stringify({
  type: 'chat_message',
  data: { text: 'Anh em đâu rồi, buy mạnh tay nến xanh chọc nóc!' }
}));

await new Promise(r => setTimeout(r, 150));
const afterBullPower = (await getJson('/api/viral/state')).data.tug.bullPower;
assert.ok(afterBullPower > beforeBullPower, 'Chat keyword "buy" phải tự động tăng lực phe Bò');
console.log(`  ✔ Keyword "buy/long" trong Chat tự động nhận diện và tăng lực kéo phe Bò (${beforeBullPower} -> ${afterBullPower})`);

// Đóng kết nối WebSocket an toàn
wsClient.close();
wsOverlay.close();

console.log('\n══════════════════════════════════════════════════════════════');
console.log('🎉 TẤT CẢ 100% CÁC BÀI KIỂM THỬ RUNTIME PORT 3001 ĐẠT CHUẨN PASS!');
console.log('══════════════════════════════════════════════════════════════');
