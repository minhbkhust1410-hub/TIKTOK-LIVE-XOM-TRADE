import fs from 'node:fs';
import path from 'node:path';

export const ACTIONS = {
  incense: {
    id: 'incense',
    name: 'Thắp nhang gồng lệnh',
    icon: '🕯️',
    points: 10,
    cooldownMs: 5000,
    sound: 'bell',
    quote: 'Nhang thơm một nén, nguyện cho nến xanh quay đầu!'
  },
  fortune: {
    id: 'fortune',
    name: 'Bói quẻ nến / Xin xăm',
    icon: '🥠',
    points: 20,
    cooldownMs: 12000,
    sound: 'fortune',
    quote: 'Một lời chiêm nghiệm, tâm bất biến giữa dòng nến giật.'
  },
  bell: {
    id: 'bell',
    name: 'Gõ chuông tỉnh tâm',
    icon: '🔔',
    points: 15,
    cooldownMs: 8000,
    sound: 'bell',
    quote: 'Chuông ngân cảnh tỉnh: Không nhồi lệnh, luôn nhớ Stop-loss!'
  },
  oxygen: {
    id: 'oxygen',
    name: 'Bơm oxy tài khoản',
    icon: '🫧',
    points: 5,
    cooldownMs: 3000,
    sound: 'like',
    quote: 'Oxy đã nạp đầy bình, xin mời quý khách tiếp tục gồng lỗ!'
  },
  grand: {
    id: 'grand',
    name: 'Cột xanh chọc trời',
    icon: '🚀',
    points: 50,
    cooldownMs: 30000,
    sound: 'bell',
    quote: 'Khí thế Xóm Trade ngút ngàn, nến xanh chọc thủng mọi kháng cự!'
  }
};

export const ACHIEVEMENTS = [
  { minScore: 2501, title: 'Cá Voi Triệu Đô', badge: '🐋 Cá Voi' },
  { minScore: 1001, title: 'Chiến Thần Kỷ Luật', badge: '🛡️ Kỷ Luật' },
  { minScore: 501, title: 'Nữ Hoàng Bắt Đáy', badge: '👑 Bắt Đáy' },
  { minScore: 201, title: 'Thánh Chốt Non', badge: '⚡ Chốt Non' },
  { minScore: 51, title: 'Chiến Thần Gồng Lỗ', badge: '💪 Gồng Lỗ' },
  { minScore: 0, title: 'F0 Mới Vào Nghề', badge: '🌱 F0' }
];

export function getAchievement(score) {
  const safeScore = Number.isFinite(score) ? score : 0;
  return ACHIEVEMENTS.find(a => safeScore >= a.minScore) || ACHIEVEMENTS.at(-1);
}

export class ScoreLedger {
  constructor(dataDir = null) {
    this.dataDir = dataDir;
    this.filePath = dataDir ? path.join(dataDir, 'forex-stats.json') : null;
    this.users = new Map(); // userId -> { id, name, avatar, score, actionsCount, lastActionTime, createdAt }
    this.cooldowns = new Map(); // `${userId}:${actionId}` -> timestamp
    this.load();
  }

  load() {
    if (!this.filePath || !fs.existsSync(this.filePath)) return;
    try {
      const content = fs.readFileSync(this.filePath, 'utf8');
      const data = JSON.parse(content);
      if (data && typeof data.users === 'object') {
        for (const [id, user] of Object.entries(data.users)) {
          if (!id || typeof user !== 'object') continue;
          this.users.set(id, {
            id: String(id),
            name: String(user.name || 'Trader').slice(0, 40),
            avatar: String(user.avatar || ''),
            score: Number.isFinite(user.score) ? Number(user.score) : 0,
            actionsCount: Number.isFinite(user.actionsCount) ? Number(user.actionsCount) : 0,
            lastActionTime: Number.isFinite(user.lastActionTime) ? Number(user.lastActionTime) : Date.now(),
            createdAt: Number.isFinite(user.createdAt) ? Number(user.createdAt) : Date.now()
          });
        }
      }
    } catch {
      // Crash-resilient fallback: preserve corrupted file for forensic recovery without stopping server
      try {
        const backupPath = `${this.filePath}.corrupted.${Date.now()}`;
        if (fs.existsSync(this.filePath)) fs.copyFileSync(this.filePath, backupPath);
      } catch {}
    }
  }

  save() {
    if (!this.filePath) return;
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const serialized = {
        updatedAt: Date.now(),
        users: Object.fromEntries(this.users)
      };
      // Atomic write using temporary file to prevent zero-byte truncation on crash
      const tmpPath = `${this.filePath}.tmp.${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      fs.writeFileSync(tmpPath, JSON.stringify(serialized, null, 2), 'utf8');
      try {
        fs.renameSync(tmpPath, this.filePath);
      } catch {
        fs.writeFileSync(this.filePath, JSON.stringify(serialized, null, 2), 'utf8');
        try { fs.unlinkSync(tmpPath); } catch {}
      }
    } catch {
      // Best-effort write fallback
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [key, at] of this.cooldowns) {
      if (now - at > 3600000) this.cooldowns.delete(key);
    }
  }

  touchUser(userId, name, avatar = '') {
    if (!userId) return null;
    let user = this.users.get(userId);
    if (!user) {
      user = {
        id: userId,
        name: String(name || `Trader_${userId.slice(0, 4)}`).slice(0, 40),
        avatar: String(avatar || ''),
        score: 0,
        actionsCount: 0,
        lastActionTime: Date.now(),
        createdAt: Date.now()
      };
      this.users.set(userId, user);
      this.save();
    } else if (name && user.name !== name) {
      user.name = String(name).slice(0, 40);
      if (avatar) user.avatar = avatar;
      this.save();
    }
    return this.getUser(userId);
  }

  getUser(userId) {
    const user = this.users.get(userId);
    if (!user) return null;
    const ach = getAchievement(user.score);
    return {
      ...user,
      title: ach.title,
      levelBadge: ach.badge
    };
  }

  recordAction(userId, actionId) {
    const action = ACTIONS[actionId];
    if (!action) throw new Error('Hành động không hợp lệ.');

    const user = this.touchUser(userId, null);
    if (!user) throw new Error('Người dùng không hợp lệ.');

    // Enforce cooldown per action
    const cooldownKey = `${userId}:${actionId}`;
    const lastAt = this.cooldowns.get(cooldownKey) || 0;
    const now = Date.now();
    const elapsed = now - lastAt;

    if (elapsed < action.cooldownMs) {
      const waitSec = Math.ceil((action.cooldownMs - elapsed) / 1000);
      throw new Error(`Đang hồi chiêu! Vui lòng đợi ${waitSec} giây.`);
    }

    // Update cooldown
    this.cooldowns.set(cooldownKey, now);

    // Apply points
    const stored = this.users.get(userId);
    stored.score += action.points;
    stored.actionsCount += 1;
    stored.lastActionTime = now;
    this.save();

    const ach = getAchievement(stored.score);

    return {
      userId,
      actionId,
      actionName: action.name,
      pointsEarned: action.points,
      totalScore: stored.score,
      title: ach.title,
      levelBadge: ach.badge,
      quote: action.quote,
      sound: action.sound,
      cooldownMs: action.cooldownMs
    };
  }

  getLeaderboard(limit = 20) {
    return [...this.users.values()]
      .sort((a, b) => b.score - a.score || a.createdAt - b.createdAt)
      .slice(0, limit)
      .map((u, index) => {
        const ach = getAchievement(u.score);
        return {
          rank: index + 1,
          id: u.id,
          name: u.name,
          avatar: u.avatar,
          score: u.score,
          actionsCount: u.actionsCount,
          title: ach.title,
          badge: ach.badge
        };
      });
  }
}
