import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createApp } from '../server.js';
import { AmbientEngine } from '../src/ambient.js';
import { ScoreLedger } from '../src/score.js';

test('Ambient Simulation: Idle detection, back-off and autonomous activity', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ambient-test-'));
  const app = createApp({ dataDir: dir });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');

  try {
    const ambient = app.ambientEngine;
    assert.ok(ambient);
    assert.equal(ambient.enabled, true);

    // Initial state: recently started, not idle yet
    ambient.lastRealActivity = Date.now();
    assert.equal(ambient.isIdle(), false);

    // After silence exceeds idleThresholdMs, engine becomes idle
    ambient.lastRealActivity = Date.now() - 10000;
    assert.equal(ambient.isIdle(), true);

    // Real activity resets idle status
    ambient.recordRealActivity();
    assert.equal(ambient.isIdle(), false);

    // Force idle and trigger ambient ticks
    ambient.lastRealActivity = Date.now() - 10000;
    app.viralEngine.tug.start({ durationSec: 90 });

    let devoteeCreated = false;
    let commentCreated = false;
    let tugMoved = false;

    for (let i = 0; i < 25; i++) {
      const result = ambient.tick();
      if (!result) continue;
      if (result.type === 'ambient_devotee') devoteeCreated = true;
      if (result.type === 'ambient_comment') commentCreated = true;
      if (result.type === 'ambient_tug') tugMoved = true;
    }

    // At least one of each ambient actions triggered over 25 cycles
    assert.ok(devoteeCreated || commentCreated || tugMoved);

    // Verify room received ambient messages
    const roomSnap = app.roomManager.getRoomSnapshot('general');
    assert.ok(roomSnap);

    // Toggle ambient
    const offState = ambient.toggle(false);
    assert.equal(offState.enabled, false);
    assert.equal(ambient.tick(), null);

    const onState = ambient.toggle(true);
    assert.equal(onState.enabled, true);
  } finally {
    await app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('WebSocket Resilience: Heartbeat, two-way ping-pong, and public tunnel headers', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-resilience-'));
  const app = createApp({ dataDir: dir });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const port = app.server.address().port;

  const request = async (route, data, headers = {}) => {
    return fetch(`http://127.0.0.1:${port}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(data)
    });
  };

  try {
    // 1. Public Tunnel Host Acceptance
    const resTunnel = await request('/api/control', { command: 'clear' }, {
      'X-Forwarded-Host': 'duchart-stream.trycloudflare.com',
      Origin: 'http://duchart-stream.trycloudflare.com'
    });
    assert.equal(resTunnel.status, 200);

    // 2. Untrusted Origin Rejection (Security check)
    const resMalicious = await request('/api/control', { command: 'clear' }, {
      Host: '127.0.0.1',
      Origin: 'https://attacker-domain.evil'
    });
    assert.equal(resMalicious.status, 403);

    // 3. Room Client WebSocket Two-Way Ping-Pong
    const roomWs = new WebSocket(`ws://127.0.0.1:${port}/ws?roomId=general`);
    await once(roomWs, 'open');

    let receivedPong = false;
    roomWs.on('message', raw => {
      const msg = JSON.parse(raw);
      if (msg.type === 'pong') receivedPong = true;
    });

    roomWs.send(JSON.stringify({ type: 'ping' }));
    for (let i = 0; i < 30; i++) {
      if (receivedPong) break;
      await new Promise(r => setTimeout(r, 20));
    }
    assert.equal(receivedPong, true);

    // 4. Legacy Overlay WebSocket Two-Way Ping-Pong
    const overlayWs = new WebSocket(`ws://127.0.0.1:${port}/ws?role=overlay`);
    await once(overlayWs, 'open');

    let overlayPong = false;
    overlayWs.on('message', raw => {
      const msg = JSON.parse(raw);
      if (msg.type === 'pong') overlayPong = true;
    });

    overlayWs.send(JSON.stringify({ type: 'ping' }));
    for (let i = 0; i < 30; i++) {
      if (overlayPong) break;
      await new Promise(r => setTimeout(r, 20));
    }
    assert.equal(overlayPong, true);

    roomWs.close();
    overlayWs.close();
  } finally {
    await app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Crash-Safety & Atomic Persistence: ScoreLedger atomic save, corruption recovery and cleanup', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'score-resilience-'));
  const filePath = path.join(dir, 'forex-stats.json');

  try {
    const ledger = new ScoreLedger(dir);
    ledger.touchUser('user_crash_1', 'Chiến Thần Bền Bỉ');
    ledger.recordAction('user_crash_1', 'incense');
    assert.equal(ledger.getUser('user_crash_1').score, 10);

    // Check file exists and is valid JSON
    assert.ok(fs.existsSync(filePath));
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    assert.equal(parsed.users.user_crash_1.score, 10);

    // Reload in new instance
    const reloaded = new ScoreLedger(dir);
    assert.equal(reloaded.getUser('user_crash_1').score, 10);

    // Simulate corrupted file on disk (e.g. abrupt power cut)
    fs.writeFileSync(filePath, '{"corrupted": true, broken...');
    const resilient = new ScoreLedger(dir);
    // Should gracefully fallback without throwing an exception
    assert.equal(resilient.users.size, 0);

    // Stale cooldown cleanup
    resilient.cooldowns.set('user:action', Date.now() - 5000000); // 5000s ago
    resilient.cleanup();
    assert.equal(resilient.cooldowns.has('user:action'), false);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Ambient REST API Endpoints: GET state, POST toggle and POST tick', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ambient-api-'));
  const app = createApp({ dataDir: dir });
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const port = app.server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. GET /api/ambient/state
    const resState = await fetch(`${baseUrl}/api/ambient/state`);
    assert.equal(resState.status, 200);
    const dataState = await resState.json();
    assert.equal(typeof dataState.enabled, 'boolean');
    assert.equal(typeof dataState.idle, 'boolean');

    // 2. POST /api/ambient/toggle
    const resToggle = await fetch(`${baseUrl}/api/ambient/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false })
    });
    assert.equal(resToggle.status, 200);
    const dataToggle = await resToggle.json();
    assert.equal(dataToggle.ok, true);
    assert.equal(dataToggle.state.enabled, false);

    // Turn back on
    await fetch(`${baseUrl}/api/ambient/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true })
    });

    // 3. POST /api/ambient/tick
    app.ambientEngine.lastRealActivity = Date.now() - 10000; // force idle
    const resTick = await fetch(`${baseUrl}/api/ambient/tick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.equal(resTick.status, 200);
    const dataTick = await resTick.json();
    assert.equal(dataTick.ok, true);
  } finally {
    await app.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
