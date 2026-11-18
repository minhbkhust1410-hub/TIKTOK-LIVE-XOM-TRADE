import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createApp } from '../server.js';

test('Multi-client Forex Community: 2 clients join room, sync chart, chat, reactions, score ledger and presence cleanup', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'forex-test-'));
  const app = createApp({ dataDir: dir });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const port = app.server.address().port;
  const wsUrl = `ws://127.0.0.1:${port}/ws`;

  const connectClient = (roomId, userId, name) => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${wsUrl}?roomId=${roomId}`);
      const messages = [];
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'join_room',
          data: { roomId, user: { id: userId, name } }
        }));
      });
      ws.on('message', raw => {
        const msg = JSON.parse(raw);
        messages.push(msg);
      });
      ws.on('error', reject);
      const waitFor = (predicate, timeout = 2500) => {
        const start = Date.now();
        return new Promise((res, rej) => {
          const check = () => {
            const found = messages.find(predicate);
            if (found) return res(found);
            if (Date.now() - start > timeout) return rej(new Error(`Timed out waiting for message`));
            setTimeout(check, 25);
          };
          check();
        });
      };
      // Wait for room_snapshot
      waitFor(m => m.type === 'room_snapshot').then(() => resolve({ ws, messages, waitFor })).catch(reject);
    });
  };

  try {
    // 1. Client A joins room gold-rush
    const clientA = await connectClient('gold-rush', 'user-a', 'Trader Tuấn');
    assert.equal(clientA.messages[0].type, 'room_snapshot');
    assert.equal(clientA.messages[0].data.onlineCount, 1);
    assert.equal(clientA.messages[0].data.hostId, 'user-a');

    // 2. Client B joins same room
    const clientB = await connectClient('gold-rush', 'user-b', 'Trader Lan');
    assert.equal(clientB.messages[0].data.onlineCount, 2);

    // Client A receives presence_updated
    const presA = await clientA.waitFor(m => m.type === 'presence_updated' && m.data.onlineCount === 2);
    assert.equal(presA.data.onlineCount, 2);

    // 3. Client A (Host) updates chart symbol to OANDA:XAUUSD, timeframe 5
    clientA.ws.send(JSON.stringify({
      type: 'set_room_state',
      data: { symbol: 'OANDA:XAUUSD', timeframe: '5' }
    }));

    // Client B receives room_state_updated
    const stateB = await clientB.waitFor(m => m.type === 'room_state_updated' && m.data.symbol === 'OANDA:XAUUSD');
    assert.equal(stateB.data.symbol, 'OANDA:XAUUSD');
    assert.equal(stateB.data.timeframe, '5');

    // 4. Non-host Client B attempts to change symbol -> gets error
    clientB.ws.send(JSON.stringify({
      type: 'set_room_state',
      data: { symbol: 'FX:EURUSD', timeframe: '15' }
    }));
    const errB = await clientB.waitFor(m => m.type === 'error' && m.data.message.includes('Chỉ Host'));
    assert.ok(errB.data.message.includes('Chỉ Host'));

    // 5. Client A sends chat message
    clientA.ws.send(JSON.stringify({
      type: 'chat_message',
      data: { text: 'Chào cả nhà, nến vàng đang giật mạnh quá! <script>alert(1)</script>' }
    }));

    // Client B receives sanitized chat
    const chatB = await clientB.waitFor(m => m.type === 'chat_broadcast');
    assert.equal(chatB.data.nickname, 'Trader Tuấn');
    assert.ok(!chatB.data.text.includes('<script>')); // sanitized
    assert.ok(chatB.data.text.includes('Chào cả nhà'));

    // 6. Anti-spam: Client A sends message immediately -> receives rate limit error
    clientA.ws.send(JSON.stringify({
      type: 'chat_message',
      data: { text: 'Gửi liên tiếp!' }
    }));
    const spamErr = await clientA.waitFor(m => m.type === 'error' && m.data.message.includes('quá nhanh'));
    assert.ok(spamErr.data.message.includes('quá nhanh'));

    // 7. Client A sends reaction
    clientA.ws.send(JSON.stringify({
      type: 'reaction',
      data: { reactionId: 'xin-via-xanh' }
    }));
    const reactB = await clientB.waitFor(m => m.type === 'reaction_broadcast' && m.data.reactionId === 'xin-via-xanh');
    assert.equal(reactB.data.label, 'Xin vía xanh');

    // 8. Virtual Score Action: Client A performs "incense" (Thắp nhang gồng lệnh)
    clientA.ws.send(JSON.stringify({
      type: 'action',
      data: { actionId: 'incense' }
    }));
    const actB = await clientB.waitFor(m => m.type === 'action_broadcast' && m.data.actionId === 'incense');
    assert.equal(actB.data.pointsEarned, 10);
    assert.equal(actB.data.totalScore, 10);

    // Immediate action repetition fails on cooldown
    clientA.ws.send(JSON.stringify({
      type: 'action',
      data: { actionId: 'incense' }
    }));
    const actCooldown = await clientA.waitFor(m => m.type === 'error' && m.data.message.includes('hồi chiêu'));
    assert.ok(actCooldown.data.message.includes('hồi chiêu'));

    // 9. Client B disconnects -> Client A receives presence_updated with online count = 1
    clientB.ws.close();
    const presAfterLeave = await clientA.waitFor(m => m.type === 'presence_updated' && m.data.onlineCount === 1);
    assert.equal(presAfterLeave.data.onlineCount, 1);

    clientA.ws.close();
  } finally {
    await app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
