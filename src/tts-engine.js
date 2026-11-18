import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import mod from 'node-edge-tts';

const EdgeTTS = mod.EdgeTTS || mod.default;

// Voices directory & cache setup
const rootDir = process.cwd();
const cacheDir = path.join(rootDir, 'data', 'tts-cache');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

export const VOICES = {
  hoaimy: {
    id: 'vi-VN-HoaiMyNeural',
    name: 'Microsoft Hoài My (Nữ - Truyền cảm, ngọt ngào)',
    gender: 'female',
    locale: 'vi-VN'
  },
  namminh: {
    id: 'vi-VN-NamMinhNeural',
    name: 'Microsoft Nam Minh (Nam - Trầm ấm, uy nghiêm)',
    gender: 'male',
    locale: 'vi-VN'
  }
};

/**
 * Resolves voice identifier to Microsoft Edge Neural voice ID.
 */
export function resolveVoiceId(voice) {
  if (!voice) return VOICES.hoaimy.id;
  const v = String(voice).toLowerCase().trim();
  if (v === 'namminh' || v === 'male' || v === 'nam' || v.includes('namminh')) {
    return VOICES.namminh.id;
  }
  if (v === 'hoaimy' || v === 'female' || v === 'nu' || v.includes('hoaimy')) {
    return VOICES.hoaimy.id;
  }
  if (Object.values(VOICES).some(item => item.id.toLowerCase() === v)) {
    return voice;
  }
  return VOICES.hoaimy.id;
}

/**
 * Clean and normalize text for optimal natural speech.
 */
export function sanitizeTextForTts(rawText) {
  if (!rawText) return '';
  return String(rawText)
    // Remove markdown formatting and links
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]/g, '$1')
    .replace(/[#@]/g, '')
    // Remove emojis and pictographs
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    // Replace multiple spaces/newlines
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Generate unique cache key for a synthesis request.
 */
function getCacheKey(voiceId, text, rate = '+0%', pitch = '+0Hz') {
  return crypto.createHash('md5')
    .update(`${voiceId}__${rate}__${pitch}__${text.trim()}`)
    .digest('hex');
}

/**
 * Synthesize speech using Google Translate TTS as fallback.
 */
async function synthesizeGoogleFallback(text, destinationFile) {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=vi&client=tw-ob`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  if (!res.ok) throw new Error(`Google TTS failed with status ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(destinationFile, buf);
}

/**
 * Main TTS Generation / Cache Lookup.
 * Returns { filePath, isCached, size }
 */
export async function getOrSynthesizeTts(text, options = {}) {
  const cleanedText = sanitizeTextForTts(text);
  if (!cleanedText) {
    throw new Error('Văn bản đọc trống rỗng sau khi làm sạch.');
  }

  const voiceId = resolveVoiceId(options.voice);
  const rate = options.rate || '+0%';
  const pitch = options.pitch || '+0Hz';
  const cacheKey = getCacheKey(voiceId, cleanedText, rate, pitch);
  const finalPath = path.join(cacheDir, `${cacheKey}.mp3`);
  const tempPath = path.join(cacheDir, `${cacheKey}.tmp.${Date.now()}`);

  // 1. Check disk cache
  if (fs.existsSync(finalPath)) {
    try {
      const stat = await fs.promises.stat(finalPath);
      if (stat.size > 500) {
        return { filePath: finalPath, isCached: true, size: stat.size };
      }
    } catch {}
  }

  // 2. Primary: Microsoft Edge Neural TTS
  try {
    const tts = new EdgeTTS({ voice: voiceId, rate, pitch, timeout: 8000 });
    await tts.ttsPromise(cleanedText, tempPath);
    await fs.promises.rename(tempPath, finalPath);
    const stat = await fs.promises.stat(finalPath);
    return { filePath: finalPath, isCached: false, size: stat.size };
  } catch (edgeErr) {
    console.warn(`[TTSEngine] Edge TTS error: ${edgeErr.message}. Trying Google Translate fallback...`);
    try {
      if (fs.existsSync(tempPath)) await fs.promises.unlink(tempPath).catch(() => {});
    } catch {}

    // 3. Secondary: Google Translate TTS Fallback
    try {
      await synthesizeGoogleFallback(cleanedText, tempPath);
      await fs.promises.rename(tempPath, finalPath);
      const stat = await fs.promises.stat(finalPath);
      return { filePath: finalPath, isCached: false, size: stat.size };
    } catch (googleErr) {
      console.error(`[TTSEngine] All synthesis engines failed: ${googleErr.message}`);
      throw new Error(`Tổng hợp giọng nói thất bại: ${edgeErr.message} / ${googleErr.message}`);
    }
  }
}

/**
 * Common phrases to pre-warm into the cache on server startup.
 */
export const COMMON_PHRASES = [
  // Welcome & greetings (Hoài My)
  { text: 'A lô a lô! Chào mừng bạn đã kéo ghế vào Động Đu Chart Xóm Trade!', voice: 'hoaimy' },
  { text: 'Chào mừng người anh em đã ghé thăm Động Đu Chart, chúc gồng lệnh xanh mướt!', voice: 'hoaimy' },
  { text: 'Cả Xóm Trade cảm ơn bạn vừa bấm follow Động Đu Chart, chúc vào lệnh chuẩn từng pip!', voice: 'hoaimy' },
  { text: 'Cảm ơn đại gia đã gửi tặng hoa hồng cổ vũ Xóm Trade, lệnh nào cũng thắng lớn!', voice: 'hoaimy' },
  { text: 'Cả Xóm Trade xin gửi lời cảm ơn chân thành tới bạn đã thả hơn một nghìn tim trợ lực cho anh em! Chúc bạn chốt lời rực rỡ!', voice: 'hoaimy' },

  // Slapstick comedy dialogues
  { text: 'Ông xách ngay cái vali ra khỏi nhà cho tôi! Đã dặn đặt stop loss ở cản cứng rồi mà còn cố gồng lỗ x100!', voice: 'hoaimy' },
  { text: 'Bà nó ơi bình tĩnh nghe tôi giải thích, nến búa rút chân sắp đảo chiều tăng rồi!', voice: 'namminh' },
  { text: 'Nến đỏ rơi thẳng đứng cọc cạch cọc cạch, gà bay chó sủa chạy tán loạn cả làng cả xóm!', voice: 'hoaimy' },
  { text: 'Bác ơi, 3 ấm trà đá với 2 bao thuốc lào gồng lỗ từ hôm qua tới giờ chưa thanh toán đâu đấy nhé!', voice: 'hoaimy' },
  { text: 'Bác hàng xóm ơi cứu mạng, rút giùm cháu cái phích modem để cá mập khỏi quét stop loss!', voice: 'namminh' },

  // Legendary Trader Quotes (Nam Minh - serious & humorous)
  { text: 'CZ Binance tuyên bố: If you cannot hold, you will not be rich! Không gồng được thì đừng mơ làm đại gia. Hãy nhớ con số 4 thần thánh, bỏ qua mọi tiếng ồn thị trường!', voice: 'namminh' },
  { text: 'Huyền thoại Jesse Livermore dạy: Tiền kiếm được trong thị trường là nhờ sự kiên nhẫn ngồi yên chờ đợi, chứ không phải do cào phím nhảy ra nhảy vào liên tục.', voice: 'namminh' },
  { text: 'Bậc thầy George Soros tuyên bố: Đúng hay sai trên thị trường không quan trọng. Quan trọng nhất là lúc đúng thì kiếm được bao nhiêu, và lúc sai thì mất bao nhiêu.', voice: 'namminh' },
  { text: 'Warren Buffett căn dặn: Nguyên tắc số 1 là không bao giờ để cháy tài khoản. Nguyên tắc số 2 là xem lại nguyên tắc số 1.', voice: 'namminh' },
  { text: 'Satoshi Nakamoto tuyên bố: Nếu bạn không hiểu hoặc không tin tôi, tôi thực sự không có thời gian để cố thuyết phục bạn.', voice: 'namminh' },
  { text: 'Chủ tịch FED Powell phát biểu: Chúng tôi sẽ duy trì lãi suất và độ rung lắc cho đến khi nào các anh em gồng lệnh chịu cắt lỗ thì thôi.', voice: 'namminh' }
];

/**
 * Pre-warm commonly used phrases in the background without blocking server boot.
 */
export async function prewarmTtsCache() {
  console.log('[TTSEngine] Pre-warming common Vietnamese neural speech cache...');
  let warmedCount = 0;
  for (const item of COMMON_PHRASES) {
    try {
      const res = await getOrSynthesizeTts(item.text, { voice: item.voice });
      if (!res.isCached) {
        warmedCount++;
        // Small pause between live neural calls to avoid 429 burst limit
        await new Promise(r => setTimeout(r, 600));
      }
    } catch (err) {
      console.warn(`[TTSEngine] Prewarm failed for "${item.text.slice(0, 30)}...":`, err.message);
    }
  }
  console.log(`[TTSEngine] Prewarm finished. Synthesized ${warmedCount} new clips, all common phrases cached ready.`);
}
