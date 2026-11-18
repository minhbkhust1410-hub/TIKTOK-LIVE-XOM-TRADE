import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../server.js';
import { sanitizeTextForTts, resolveVoiceId, VOICES } from '../src/tts-engine.js';

test('TTS Engine: 1. Text Sanitization & Voice Resolution', () => {
  // Emojis & markdown cleanup
  const dirty = '💥 **Chào mừng** [Cao thủ] #Long! Lệnh _xanh_ 🚀 mướt!';
  const clean = sanitizeTextForTts(dirty);
  assert.equal(clean, 'Chào mừng Cao thủ Long! Lệnh xanh mướt!');

  // Voice ID resolution
  assert.equal(resolveVoiceId('hoaimy'), VOICES.hoaimy.id);
  assert.equal(resolveVoiceId('female'), VOICES.hoaimy.id);
  assert.equal(resolveVoiceId('namminh'), VOICES.namminh.id);
  assert.equal(resolveVoiceId('male'), VOICES.namminh.id);
  assert.equal(resolveVoiceId('unknown'), VOICES.hoaimy.id);
});

test('TTS Engine: 2. REST API /api/tts/voices and /api/tts', async () => {
  const app = createApp();
  app.server.listen(0, '127.0.0.1');
  await once(app.server, 'listening');
  const port = app.server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. GET /api/tts/voices
    const resVoices = await fetch(`${baseUrl}/api/tts/voices`);
    assert.equal(resVoices.status, 200);
    const jsonVoices = await resVoices.json();
    assert.equal(jsonVoices.ok, true);
    assert.ok(jsonVoices.voices.hoaimy);
    assert.ok(jsonVoices.voices.namminh);

    // 2. GET /api/tts missing text -> 400 Bad Request
    const resBad = await fetch(`${baseUrl}/api/tts`);
    assert.equal(resBad.status, 400);

    // 3. GET /api/tts with text -> 200 OK audio/mpeg
    const resTts = await fetch(`${baseUrl}/api/tts?text=${encodeURIComponent('Chào mừng bạn đến với Xóm Trade!')}&voice=hoaimy`);
    assert.equal(resTts.status, 200);
    assert.equal(resTts.headers.get('content-type'), 'audio/mpeg');
    const audioBuf = await resTts.arrayBuffer();
    assert.ok(audioBuf.byteLength > 1000, 'Audio stream should return valid MP3 bytes');

    // 4. POST /api/voice/speak returns audioUrl
    const resSpeak = await fetch(`${baseUrl}/api/voice/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Chào mừng người anh em!', category: 'welcome' })
    });
    assert.equal(resSpeak.status, 200);
    const speakData = await resSpeak.json();
    assert.equal(speakData.ok, true);
    assert.ok(speakData.audioUrl.startsWith('/api/tts?text='));
  } finally {
    await app.close();
  }
});
