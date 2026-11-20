import { randomUUID } from 'node:crypto';
import { normalizeEvent } from './core.js';
import { normalizeAutoFeatures } from '../public/js/experience.js';

export const AMBIENT_DEVOTEES = [
  'Minh An', 'Thiện Tâm', 'Thanh Hoa', 'Bình Tâm', 'An Nhiên',
  'Diệu Hương', 'Ngọc Lan', 'Tâm Minh', 'Quang Huy', 'Hải Yến',
  'Bảo An', 'Lan Anh', 'Đức Minh', 'Thu Hà', 'Hoàng Nam',
  'Mai Phương', 'Khánh Linh', 'Tuệ An', 'Trần Tuấn', 'Mai Hoa',
  'Phúc Thịnh', 'Văn Dũng', 'Hải Đăng', 'Nguyên Khang'
];

export const AMBIENT_COMMENTS = [
  'Hú le anh em Xóm Trade, nguyện qua cơn bão giá 🚀',
  'Gồng lỗ là bản năng, chốt non là bản lĩnh 🍜',
  'Xóm Trade hôm nay đông vui quá, chúc cả nhà xanh mướt! 🟢',
  'Xin vía nến xanh ngọc cho lệnh EUR/USD 📈',
  'Cá mập quét 2 đầu, ta ngồi ghế bấm cà phê ngắm nến ☕',
  'Bình oxy thơm tho, tài khoản bình an vô sự 🫧',
  'Thị trường giật 100 pip mà lòng tĩnh như mặt hồ ☕',
  'Bò ơi cố lên, húc bay đỉnh cũ nào! 🟢',
  'Gấu đè mạnh quá, anh em giữ chặt Stop-loss! 🔴',
  'Buy nhẹ 1 lot kiếm đĩa phở đầu phiên 📈',
  'Short nhẹ theo cụ gấu xem thế nào 📉',
  'Về bờ rồi bà con ơi, mừng rơi nước mắt 🚢',
  'Kéo ghế ngồi 15 phút, soi chart 5 phút, vào lệnh 1 phút',
  'Trưởng thôn phán hôm nay không được bắt dao rơi!',
  'Chốt non 1 pip mà lòng thanh thản lạ lùng 🍵',
  'Nến xanh chọc thủng kháng cự rồi, anh em gáy to lên 🚀',
  'Có ai đang gồng lỗ Vàng cùng tôi không? 🪙',
  'Kiên nhẫn là chìa khóa của mọi trader thành công 🔑',
  'Jesse Livermore dạy rồi: Tiền kiếm được là nhờ kiên nhẫn ngồi yên 🧘‍♂️',
  'CZ khuyên: If you cannot hold, you will not be rich! Gồng tiếp thôi 💎',
  'CZ dặn con số 4: Bỏ qua mọi FUD cá mập, tập trung soi chart 4️⃣',
  'Warren Buffett bảo: Không bao giờ để cháy tài khoản là bài học số 1 📜',
  'George Soros dạy: Lúc đúng ăn đậm, lúc sai cắt lỗ nhanh là chân ái 🎯',
  'Hôm nay ăn phở ngập thịt mừng lệnh Buy về bờ 🍜',
  'Tâm bất biến giữa dòng đời nến đỏ nến xanh ⚡',
  'Bắn thêm nụ cười gửi cụ nến xanh!',
  'Cứ bình tĩnh, còn thở là còn gồng được anh em ơi!',
  'Lên thuyền cùng anh em, xu hướng tăng uy tín quá',
  'Đứng ngoài quan sát, thị trường đang đi ngang'
];

export class AmbientEngine {
  constructor({ engine, roomManager, viralEngine, source = null, scoreLedger = null, options = {} } = {}) {
    this.engine = engine;
    this.roomManager = roomManager;
    this.viralEngine = viralEngine;
    this.source = source;
    this.scoreLedger = scoreLedger;

    this.enabled = options.enabled ?? true;
    this.idleThresholdMs = options.idleThresholdMs ?? 6000; // 6s of silence before ambient activates
    this.intervalMs = options.intervalMs ?? 3500; // tick every 3.5s
    this.lastRealActivity = Date.now();
    this.tickCount = 0;
    this.timer = null;
    this.autoStartTug = options.autoStartTug ?? true;
    this.autoShow = options.autoShow ?? true;
    this.onBroadcast = typeof options.onBroadcast === 'function' ? options.onBroadcast : () => {};
    const now = Date.now();
    this.nextShow = {
      tug: now + 3000,
      tugPull: now + 6500,
      news: now + 11000,
      comedy: now + 19000,
      wheel: now + 30000,
      legend: now + 43000,
      siren: now + 60000,
      ritual: now + 8000,
      arrival: now + 14500,
      social: now + 24000
    };

    if (this.enabled) {
      this.start();
    }
  }

  recordRealActivity() {
    this.lastRealActivity = Date.now();
  }

  isIdle() {
    return Date.now() - this.lastRealActivity >= this.idleThresholdMs;
  }

  start() {
    this.enabled = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.tick();
    }, this.intervalMs);
  }

  stop() {
    this.enabled = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  close() {
    this.stop();
  }

  toggle(enabled = null) {
    if (enabled === null) {
      this.enabled = !this.enabled;
    } else {
      this.enabled = Boolean(enabled);
    }
    if (this.enabled) {
      this.start();
    } else {
      this.stop();
    }
    return this.getState();
  }

  isAutoEnabled(key) {
    return this.engine?.config?.autoFeatures?.[key] !== false;
  }

  hasRealOrLiveSession() {
    if (this.source?.state?.status === 'connected') return true;
    const session = this.engine?.stats?.session;
    return Boolean(
      (session?.participants && Object.keys(session.participants).length > 0) ||
      (session?.users && Object.keys(session.users).length > 0)
    );
  }

  tick() {
    if (!this.enabled) return null;

    this.tickCount++;
    const showResult = this.autoShow ? this.runShow(Date.now()) : null;
    if (!this.isIdle()) return showResult;

    const idleActions = [];
    if (this.isAutoEnabled('tug') && this.viralEngine?.tug) idleActions.push(() => this.doTugMicroPull());
    if (this.isAutoEnabled('crowd')) {
      if (this.engine) idleActions.push(() => this.doDevoteeAttendance());
      idleActions.push(() => this.doAmbientComment());
    }
    if (!idleActions.length) return showResult;
    return idleActions[Math.floor(Math.random() * idleActions.length)]();
  }

  runShow(now) {
    const viral = this.viralEngine;
    if (!viral) return null;

    if (this.isAutoEnabled('tug') && viral.tug.status !== 'active' && now >= this.nextShow.tug) {
      const state = viral.tug.start({ durationSec: 45 });
      this.nextShow.tug = now + 65000;
      this.nextShow.tugPull = now + 2500;
      this.onBroadcast('tug_state_broadcast', state);
      return { type: 'auto_tug_start', state };
    }

    if (this.isAutoEnabled('tug') && viral.tug.status === 'active' && now >= this.nextShow.tugPull) {
      this.nextShow.tugPull = now + 2800 + Math.floor(Math.random() * 1800);
      const pull = this.doTugMicroPull();
      this.onBroadcast('tug_state_broadcast', viral.tug.getState());
      return pull && { type: 'auto_tug_pull', ...pull };
    }

    if (this.isAutoEnabled('news') && now >= this.nextShow.news) {
      this.nextShow.news = now + 35000 + Math.floor(Math.random() * 15000);
      const news = viral.news.flashNews();
      this.onBroadcast('breaking_news_broadcast', news);
      return { type: 'auto_news', news };
    }

    // Complete the show loop with visual rituals and audience arrivals, not
    // just viral overlays. These queue behind a real visitor's interaction.
    if (this.isAutoEnabled('rituals') && now >= this.nextShow.ritual) {
      this.nextShow.ritual = now + 46000 + Math.floor(Math.random() * 18000);
      const ritual = this.doAutoRitual();
      return ritual && { type: 'auto_ritual', ...ritual };
    }

    if (this.isAutoEnabled('crowd') && now >= this.nextShow.arrival) {
      this.nextShow.arrival = now + 38000 + Math.floor(Math.random() * 16000);
      const arrival = this.doAutoArrival();
      return arrival && { type: 'auto_arrival', ...arrival };
    }

    if (this.isAutoEnabled('crowd') && now >= this.nextShow.social) {
      this.nextShow.social = now + 52000 + Math.floor(Math.random() * 18000);
      const social = this.doAutoSocial();
      return social && { type: 'auto_social', ...social };
    }

    if (this.isAutoEnabled('comedy') && now >= this.nextShow.comedy) {
      this.nextShow.comedy = now + 65000 + Math.floor(Math.random() * 20000);
      const scenarios = ['wife_chase', 'chicken_dog', 'tea_debt', 'modem_rescue'];
      const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      const payload = { scenario, timestamp: now, automatic: true };
      this.onBroadcast('street_comedy_broadcast', payload);
      return { type: 'auto_comedy', payload };
    }

    if (this.isAutoEnabled('wheel') && now >= this.nextShow.wheel) {
      this.nextShow.wheel = now + 75000 + Math.floor(Math.random() * 20000);
      try {
        const result = viral.wheel.spin({
          userId: 'xom_trade_auto', nickname: 'Xóm Trade Tự Động', avatar: ''
        });
        this.onBroadcast('wheel_result_broadcast', result);
        return { type: 'auto_wheel', result };
      } catch { this.nextShow.wheel = now + 15000; }
    }

    if (this.isAutoEnabled('legend') && now >= this.nextShow.legend) {
      this.nextShow.legend = now + 90000 + Math.floor(Math.random() * 30000);
      const payload = { timestamp: now, automatic: true };
      this.onBroadcast('trader_legend_broadcast', payload);
      return { type: 'auto_legend', payload };
    }

    if (this.isAutoEnabled('siren') && now >= this.nextShow.siren && !viral.siren.getState().active) {
      this.nextShow.siren = now + 135000 + Math.floor(Math.random() * 30000);
      const alert = viral.siren.trigger({
        durationMs: 12000,
        reason: 'auto-show',
        headline: '🚨 BÁO ĐỘNG TỰ ĐỘNG: CÁ MẬP ĐANG QUÉT HAI ĐẦU!'
      });
      this.onBroadcast('siren_alert_broadcast', alert);
      return { type: 'auto_siren', alert };
    }

    return null;
  }

  doTugMicroPull() {
    const tug = this.viralEngine.tug;
    // Only pull if match is active or if autoStartTug is enabled
    if (tug.status !== 'active') {
      if (this.autoStartTug && this.isAutoEnabled('tug')) {
        tug.start({ durationSec: 90 });
      } else {
        return null;
      }
    }

    const name = AMBIENT_DEVOTEES[Math.floor(Math.random() * AMBIENT_DEVOTEES.length)];
    // Subtle balanced fluctuation: pull slightly towards center if far away, else 50/50
    let side;
    if (tug.ropePosition > 30) {
      side = Math.random() < 0.65 ? 'bear' : 'bull';
    } else if (tug.ropePosition < -30) {
      side = Math.random() < 0.65 ? 'bull' : 'bear';
    } else {
      side = Math.random() < 0.5 ? 'bull' : 'bear';
    }

    const power = 1 + Math.floor(Math.random() * 2); // 1 or 2 power
    const pullRes = tug.pull(side, power, {
      userId: `ambient_${name.toLowerCase().replace(/\s+/g, '_')}`,
      nickname: name,
      avatar: '',
      label: side === 'bull' ? '🟢 Xin vía xanh' : '☕ Đứng ngoài'
    }, 'ambient');

    return { type: 'ambient_tug', side, power, name, pullRes };
  }

  doDevoteeAttendance() {
    if (this.hasRealOrLiveSession()) return null;
    const name = AMBIENT_DEVOTEES[Math.floor(Math.random() * AMBIENT_DEVOTEES.length)];
    const id = `devotee_${name.toLowerCase().replace(/\s+/g, '_')}`;
    const idNum = Math.floor(Math.random() * 90);
    const user = { userId: `${id}-${idNum}`, nickname: name, avatar: '' };

    // Ingest simulated like or join to seat devotee in temple hall
    const isLike = Math.random() < 0.5;
    const kind = isLike ? 'like' : 'join';
    const raw = {
      user,
      eventId: randomUUID(),
      likeCount: isLike ? 1 : 0
    };

    try {
      this.engine.simulationSeatsEnabled = true;
      const res = this.engine.ingest(normalizeEvent(kind, raw, 'sim', true));
      return { type: 'ambient_devotee', kind, name, res };
    } catch {
      return null;
    }
  }

  doAutoRitual() {
    if (!this.engine) return null;
    const name = AMBIENT_DEVOTEES[Math.floor(Math.random() * AMBIENT_DEVOTEES.length)];
    const action = ['incense', 'lotus', 'prayer', 'fortune'][Math.floor(Math.random() * 4)];
    const id = randomUUID();
    try {
      const result = this.engine.ingest({
        ...normalizeEvent('gift', {
          user: { userId: `auto_ritual_${id}`, nickname: name, avatar: '' },
          giftName: 'Nghi thức tự động Xóm Trade', eventId: id, groupId: id,
          repeatEnd: true
        }, 'sim', true),
        seatSimulation: false
      }, action);
      return { name, action, result };
    } catch { return null; }
  }

  doAutoArrival() {
    if (this.hasRealOrLiveSession()) return null;
    const name = AMBIENT_DEVOTEES[Math.floor(Math.random() * AMBIENT_DEVOTEES.length)];
    const id = randomUUID();
    this.onBroadcast('trader_walk_in', {
      nickname: name, kind: 'auto-join', automatic: true,
      actionText: 'Vừa ghé Xóm Trade · Kéo ghế vào xem kèo'
    });
    try {
      this.engine?.ingest(normalizeEvent('join', {
        user: { userId: `auto_join_${id}`, nickname: name, avatar: '' }, eventId: id
      }, 'sim', true));
    } catch {}
    return { name };
  }

  doAutoSocial() {
    if (this.hasRealOrLiveSession()) return null;
    const name = AMBIENT_DEVOTEES[Math.floor(Math.random() * AMBIENT_DEVOTEES.length)];
    const likes = Math.random() < .55;
    if (likes) this.onBroadcast('thousand_likes_broadcast', { nickname: name, likeCount: 1000, automatic: true });
    else this.onBroadcast('new_follower_broadcast', { nickname: name, automatic: true });
    return { name, kind: likes ? 'likes' : 'follow' };
  }

  doAmbientComment() {
    if (this.hasRealOrLiveSession()) return null;
    const name = AMBIENT_DEVOTEES[Math.floor(Math.random() * AMBIENT_DEVOTEES.length)];
    const text = AMBIENT_COMMENTS[Math.floor(Math.random() * AMBIENT_COMMENTS.length)];
    const userId = `ambient_${name.toLowerCase().replace(/\s+/g, '_')}`;

    // 1. Ingest comment into LiveEngine interaction feed
    try {
      this.engine.simulationSeatsEnabled = true;
      const raw = {
        user: { userId, nickname: name, avatar: '' },
        content: text,
        eventId: randomUUID()
      };
      this.engine.ingest({ ...normalizeEvent('comment', raw, 'sim', true), seatSimulation: true });
    } catch {}

    // 2. Broadcast to General Room chat
    if (this.roomManager) {
      try {
        const room = this.roomManager.getOrCreateRoom('general');
        const message = {
          id: randomUUID(),
          userId,
          nickname: name,
          avatar: '',
          badge: '🌱 F0',
          text,
          time: Date.now(),
          ambient: true
        };
        room.messages.push(message);
        if (room.messages.length > 50) room.messages.shift();

        this.roomManager.broadcastToRoom('general', {
          type: 'chat_broadcast',
          data: message
        });
      } catch {}
    }

    return { type: 'ambient_comment', name, text };
  }

  getState() {
    return {
      enabled: this.enabled,
      idle: this.isIdle(),
      idleThresholdMs: this.idleThresholdMs,
      intervalMs: this.intervalMs,
      lastRealActivity: this.lastRealActivity,
      tickCount: this.tickCount,
      autoShow: this.autoShow,
      autoFeatures: normalizeAutoFeatures(this.engine?.config?.autoFeatures),
      nextShow: this.nextShow
    };
  }
}
