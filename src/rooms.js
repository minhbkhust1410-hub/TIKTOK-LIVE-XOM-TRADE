import { randomUUID } from 'node:crypto';

// Allowed reaction identifiers
export const REACTIONS = {
  'gong-tiep': { id: 'gong-tiep', label: 'Gồng tiếp', icon: '🟢' },
  'xin-via-xanh': { id: 'xin-via-xanh', label: 'Xin vía xanh', icon: '🕯️' },
  'ne-fomo': { id: 'ne-fomo', label: 'Né FOMO', icon: '🧘' },
  've-bo': { id: 've-bo', label: 'Về bờ', icon: '🚢' },
  'dung-ngoai': { id: 'dung-ngoai', label: 'Đứng ngoài cho lành', icon: '☕' }
};

// Valid Forex Symbols & Timeframes
export const SUPPORTED_SYMBOLS = ['FX:EURUSD', 'FX:GBPUSD', 'FX:USDJPY', 'OANDA:XAUUSD'];
export const SUPPORTED_TIMEFRAMES = ['1', '5', '15', '60', '240', 'D'];

export const SANITIZE_TEXT = (input, max = 200) => {
  return String(input ?? '')
    .replace(/[<>]/g, '') // strip dangerous HTML characters
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .slice(0, max)
    .trim();
};

export class RoomManager {
  constructor(scoreLedger) {
    this.rooms = new Map();
    this.scoreLedger = scoreLedger;
    this.clientMeta = new Map(); // ws -> { userId, nickname, avatar, roomId, joinedAt, lastPing }
    this.chatCooldowns = new Map(); // userId -> lastTimestamp
    this.mutedUsers = new Map(); // userId -> mutedUntilTimestamp

    // Initialize general room
    this.getOrCreateRoom('general', 'Phòng Cháy Tài Khoản #1');
    this.getOrCreateRoom('gold-rush', 'Hội Đu Vàng XAU/USD');
    this.getOrCreateRoom('scalping-night', 'Tâm Sự Đêm Khuya 1M');
  }

  getOrCreateRoom(roomId, roomName = null) {
    const id = SANITIZE_TEXT(roomId, 40).toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'general';
    if (!this.rooms.has(id)) {
      const name = roomName || `Phòng ${id.toUpperCase()}`;
      this.rooms.set(id, {
        id,
        name,
        symbol: id === 'gold-rush' ? 'OANDA:XAUUSD' : 'FX:EURUSD',
        timeframe: id === 'scalping-night' ? '1' : '15',
        hostId: null,
        locked: false,
        version: 1,
        createdAt: Date.now(),
        messages: [],
        clients: new Set(),
      });
    }
    return this.rooms.get(id);
  }

  joinRoom(ws, roomId, user) {
    this.leaveCurrentRoom(ws);

    const room = this.getOrCreateRoom(roomId);
    const userId = SANITIZE_TEXT(user?.id, 64) || randomUUID();
    const nickname = SANITIZE_TEXT(user?.name, 40) || `Trader_${userId.slice(0, 4)}`;
    const avatar = user?.avatar || '';

    // Assign host if room has no host
    if (!room.hostId) {
      room.hostId = userId;
    }

    const meta = {
      ws,
      userId,
      nickname,
      avatar,
      roomId: room.id,
      joinedAt: Date.now(),
      lastPing: Date.now(),
    };

    this.clientMeta.set(ws, meta);
    room.clients.add(ws);

    // Ensure user exists in ScoreLedger
    this.scoreLedger?.touchUser(userId, nickname, avatar);

    return { room, meta };
  }

  leaveCurrentRoom(ws) {
    const meta = this.clientMeta.get(ws);
    if (!meta) return null;

    const room = this.rooms.get(meta.roomId);
    if (room) {
      room.clients.delete(ws);

      // If host left and there are other active users, elect next host
      if (room.hostId === meta.userId) {
        const nextClient = [...room.clients][0];
        if (nextClient) {
          const nextMeta = this.clientMeta.get(nextClient);
          room.hostId = nextMeta ? nextMeta.userId : null;
        } else {
          room.hostId = null;
        }
      }
    }

    this.clientMeta.delete(ws);
    return meta;
  }

  setRoomState(roomId, requesterId, { symbol, timeframe }) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Phòng không tồn tại.');

    // Only host can change room state
    if (room.hostId && room.hostId !== requesterId) {
      throw new Error('Chỉ Host của phòng mới có quyền đổi cặp tiền hoặc khung thời gian chung.');
    }

    let changed = false;
    if (symbol && SUPPORTED_SYMBOLS.includes(symbol) && room.symbol !== symbol) {
      room.symbol = symbol;
      changed = true;
    }
    if (timeframe && SUPPORTED_TIMEFRAMES.includes(String(timeframe)) && room.timeframe !== String(timeframe)) {
      room.timeframe = String(timeframe);
      changed = true;
    }

    if (changed) {
      room.version++;
      return { ok: true, room };
    }
    return { ok: false, room };
  }

  addChatMessage(roomId, userId, text) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Phòng không tồn tại.');

    // Check if muted
    const mutedUntil = this.mutedUsers.get(userId) || 0;
    if (Date.now() < mutedUntil) {
      const waitSec = Math.ceil((mutedUntil - Date.now()) / 1000);
      throw new Error(`Bạn đang bị tạm khóa chat. Còn ${waitSec} giây.`);
    }

    // Rate-limit: 1 message per 1.2s
    const lastChat = this.chatCooldowns.get(userId) || 0;
    if (Date.now() - lastChat < 1200) {
      throw new Error('Vui lòng không gửi tin quá nhanh (chờ 1 giây).');
    }

    const cleanText = SANITIZE_TEXT(text, 200);
    if (!cleanText) {
      throw new Error('Nội dung tin nhắn không được để trống.');
    }

    this.chatCooldowns.set(userId, Date.now());

    const userProfile = this.scoreLedger?.getUser(userId) || { name: 'Trader', levelBadge: 'F0' };
    const message = {
      id: randomUUID(),
      userId,
      nickname: userProfile.name,
      avatar: userProfile.avatar || '',
      badge: userProfile.levelBadge || 'F0',
      text: cleanText,
      time: Date.now(),
    };

    room.messages.push(message);
    if (room.messages.length > 50) {
      room.messages.shift();
    }

    return { room, message };
  }

  addReaction(roomId, userId, reactionId) {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Phòng không tồn tại.');
    if (!REACTIONS[reactionId]) throw new Error('Biểu cảm không hợp lệ.');

    const userProfile = this.scoreLedger?.getUser(userId);
    const nickname = userProfile ? userProfile.name : 'Một trader';

    return {
      room,
      reaction: {
        id: randomUUID(),
        reactionId,
        label: REACTIONS[reactionId].label,
        icon: REACTIONS[reactionId].icon,
        userId,
        nickname,
        time: Date.now(),
      }
    };
  }

  getRoomSnapshot(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    // Calculate unique online users (avoid counting multiple tabs twice)
    const uniqueUsers = new Map();
    for (const ws of room.clients) {
      const meta = this.clientMeta.get(ws);
      if (meta && !uniqueUsers.has(meta.userId)) {
        const profile = this.scoreLedger?.getUser(meta.userId);
        uniqueUsers.set(meta.userId, {
          userId: meta.userId,
          nickname: profile ? profile.name : meta.nickname,
          avatar: meta.avatar,
          isHost: meta.userId === room.hostId,
          score: profile ? profile.score : 0,
          levelBadge: profile ? profile.levelBadge : 'F0',
        });
      }
    }

    return {
      id: room.id,
      name: room.name,
      symbol: room.symbol,
      timeframe: room.timeframe,
      hostId: room.hostId,
      locked: room.locked,
      version: room.version,
      onlineCount: uniqueUsers.size,
      participants: [...uniqueUsers.values()],
      recentMessages: room.messages.slice(-35),
    };
  }

  broadcastToRoom(roomId, payload, excludeWs = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const data = JSON.stringify(payload);
    for (const ws of room.clients) {
      if (ws !== excludeWs && ws.readyState === 1 /* WebSocket.OPEN */) {
        ws.send(data);
      }
    }
  }

  moderate(roomId, action, targetId, secret = '') {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error('Phòng không tồn tại.');

    if (action === 'delete_message') {
      room.messages = room.messages.filter(m => m.id !== targetId);
      this.broadcastToRoom(roomId, {
        type: 'message_deleted',
        data: { messageId: targetId }
      });
      return { ok: true };
    }

    if (action === 'mute') {
      this.mutedUsers.set(targetId, Date.now() + 5 * 60 * 1000); // 5 mins
      return { ok: true, mutedUntil: Date.now() + 5 * 60 * 1000 };
    }

    if (action === 'lock_room') {
      room.locked = !room.locked;
      this.broadcastToRoom(roomId, {
        type: 'room_lock_changed',
        data: { locked: room.locked }
      });
      return { ok: true, locked: room.locked };
    }

    throw new Error('Thao tác quản trị không hợp lệ.');
  }

  heartbeat(ws) {
    const meta = this.clientMeta.get(ws);
    if (meta) {
      meta.lastPing = Date.now();
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [userId, at] of this.chatCooldowns) {
      if (now - at > 300000) this.chatCooldowns.delete(userId);
    }
    for (const [userId, until] of this.mutedUsers) {
      if (now > until) this.mutedUsers.delete(userId);
    }
  }
}
