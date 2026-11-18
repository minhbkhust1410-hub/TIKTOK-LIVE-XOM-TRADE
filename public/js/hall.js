import { ART, createPose } from './temple-art.js?v=hang-rong-v3.2';
import { bowPose } from './rituals.js';
import { HALL_LAYOUT } from './experience.js?v=hang-rong-v5.5';

function hashId(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i) | 0;
  return Math.abs(h);
}

// Friendly neighborhood traders to keep the 28-seat market lively and full of people at all times
const MARKET_TRADERS = [
  'Minh An', 'Thiện Tâm', 'Thanh Hoa', 'Bình Tâm', 'An Nhiên',
  'Diệu Hương', 'Ngọc Lan', 'Tâm Minh', 'Quang Huy', 'Hải Yến',
  'Bảo An', 'Lan Anh', 'Đức Minh', 'Thu Hà', 'Hoàng Nam',
  'Mai Phương', 'Khánh Linh', 'Tuệ An', 'Trần Tuấn', 'Mai Hoa',
  'Phúc Thịnh', 'Văn Dũng', 'Hải Đăng', 'Nguyên Khang', 'Chiến Thần Long',
  'Bác Ba Phi', 'Cô Sáu Phở', 'Anh Bảy Cà Phê'
];

const CROWD_LINES = [
  'Long nhẹ tay thôi!', 'Gấu kia run rồi kìa!', 'Nến này thơm quá!',
  'Ai cắt lỗ chưa?', 'Đừng FOMO nha!', 'Cho xin một kèo xanh!',
  'Ông đừng nhồi nữa!', 'Tôi chờ về bờ!', 'Chốt non là có thật!',
  'Bò húc nữa đi!', 'Cá mập đang nhìn kìa!', 'Trà đá chờ tin nóng!',
  'Tâm phải tịnh, SL phải có!', 'Khấn nến xanh vừa thôi!',
  'Bò Gấu cùng bình an nhé!'
];

// Keep featured meme traders pinned to prominent visible crowd seats, with
// Hacker and the Praying Chickens prioritized in the bottom foreground row (Row 4).
const SPIRITUAL_VARIANT_BY_SEAT = {
  12: 16, // calm zen praying bull ("Bò Tịnh Tâm") - row 2 left mid
  13: 14, // seated bull monk - row 2 right mid
  19: 13, // praying bull trader - row 3 right mid
  22: 12, // hacker / anonymous meditation trader - row 4 left inner (bottom aisle)
  26: 15, // left praying chicken - row 4 left outer (bottom)
  27: 15  // right praying chicken - row 4 right outer (bottom)
};
const specialVariantClass = variant => variant === 12
  ? ' masked-monk-trader'
  : variant === 13
    ? ' bull-prayer-trader'
    : variant === 14
      ? ' bull-monk-trader'
      : variant === 15
        ? ' prayer-chicken-trader'
        : variant === 16
          ? ' zen-bull-trader'
    : '';

export function createHall(parent) {
  let signature = '', collective = false, pending = null, moodTimer = null;
  let isInitialBoot = true;
  let ambientScene = 0;

  // Create 28 stable physical seat slots once so the DOM never jitters or flashes
  const slots = HALL_LAYOUT.map((layout, index) => {
    const element = document.createElement('div');
    element.className = 'hall-person occupied';
    element.setAttribute('role', 'listitem');
    element.dataset.rank = index + 1;
    Object.assign(element.style, {
      left: `${layout.x}px`,
      top: `${layout.y}px`,
      zIndex: String(10 + layout.row * 2 + (SPIRITUAL_VARIANT_BY_SEAT[index] != null ? 1 : 0)),
      transform: `translateX(-50%) scale(${layout.scale})`,
      '--seat-index': String(index),
      '--seat-row': String(layout.row)
    });

    element.innerHTML = `
      <span class="seat-pad"></span>
      <div class="seat-occupant"></div>
      <span class="trader-focus" aria-hidden="true"></span>
      <div class="seat-badge">
        <b class="seat-rank">•</b>
        <span class="seat-avatar"></span>
        <strong class="seat-name"></strong>
      </div>
      <span class="trader-speech" aria-hidden="true"></span>
      <span class="trader-gesture" aria-hidden="true"></span>
      <small class="seat-vacant" hidden></small>
    `;
    parent.append(element);

    return {
      element,
      occupantEl: element.querySelector('.seat-occupant'),
      badgeEl: element.querySelector('.seat-badge'),
      vacantEl: element.querySelector('.seat-vacant'),
      rankEl: element.querySelector('.seat-rank'),
      nameEl: element.querySelector('.seat-name'),
      avatarEl: element.querySelector('.seat-avatar'),
      speechEl: element.querySelector('.trader-speech'),
      gestureEl: element.querySelector('.trader-gesture'),
      currentUserId: null,
      currentUserData: null,
      variant: null,
      frames: [],
      pose: 3,
      row: layout.row
    };
  });

  // A room full of people should feel like small groups are talking, teasing and
  // reacting differently—not like one synchronized row of sprites.
  const personalityClasses = index => {
    const group = Math.floor(index / 4) + 1;
    const roles = [' chatter', ' hype', ' watcher', ' rival'];
    return ` group-${group}${roles[index % roles.length]}`;
  };

  const stageCrowdTalk = () => {
    // Only a few tables react at once.  This keeps the screen readable while
    // still making the market feel occupied and responsive.
    slots.forEach(slot => {
      slot.element.classList.remove(
        'talking', 'gesturing', 'gesture-spot', 'rise-spot',
        'action-point', 'action-fomo', 'action-cheer', 'action-tense'
      );
      slot.speechEl.textContent = '';
      slot.gestureEl.textContent = '';
    });
    const picks = [...slots].sort(() => Math.random() - .5).slice(0, 4);
    const actions = [
      { cls: 'action-point gesture-spot', icon: '☝️', bubble: true },
      { cls: 'action-fomo rise-spot', icon: '🙋', bubble: true },
      { cls: 'action-cheer gesture-spot', icon: '🙌', bubble: false },
      { cls: 'action-tense gesture-spot', icon: '🤏', bubble: false }
    ];
    picks.forEach((slot, order) => {
      const i = Number(slot.element.dataset.rank || 1) + order + Math.floor(Date.now() / 4200);
      const action = actions[order];
      if (action.bubble) {
        slot.speechEl.textContent = CROWD_LINES[i % CROWD_LINES.length];
        slot.element.classList.add('talking');
      }
      slot.gestureEl.textContent = action.icon;
      slot.element.classList.add('gesturing', ...action.cls.split(' '));
    });
  };

  // Sequential entrance queue: ensure dynamically arriving people enter one by one
  const entranceQueue = [];
  let isProcessingQueue = false;

  function processQueue() {
    if (!entranceQueue.length) {
      isProcessingQueue = false;
      return;
    }
    isProcessingQueue = true;
    const task = entranceQueue.shift();
    try { task(); } catch {}
    // Stagger arrival by 400ms for smooth, sequential one-by-one entrance
    setTimeout(processQueue, 400);
  }

  function queueEntrance(task) {
    entranceQueue.push(task);
    if (!isProcessingQueue) {
      processQueue();
    }
  }

  const render = hall => {
    if (collective) { pending = hall; return; }
    const leaders = hall?.seats || hall?.leaderboard || [];
    const next = JSON.stringify([hall?.mode, leaders.map(u => u ? [u.id, u.coins, u.rank] : null)]);
    if (next === signature) return;
    signature = next;
    parent.dataset.mode = hall?.mode || 'live';

    HALL_LAYOUT.forEach((layout, index) => {
      const slot = slots[index];
      const realUser = leaders[index] || null;
      // Populate every seat with full-body traders so the hall is always bustling and full of life
      const user = realUser || {
        id: `ambient-trader-${index}`,
        name: MARKET_TRADERS[index % MARKET_TRADERS.length],
        coins: 0,
        rank: index + 1,
        isAmbient: true
      };

      const prevUserId = slot.currentUserId;
      const donor = user.coins > 0;
      const isNewArrival = prevUserId !== user.id;

      if (isNewArrival) {
        slot.currentUserId = user.id;
        slot.currentUserData = user;
        // The two meme traders always occupy visible crowd seats; every other
        // participant still receives a normal randomized trader sprite.
        const variant = SPIRITUAL_VARIANT_BY_SEAT[index] ?? (hashId(String(user.id || user.name || index)) % 12);
        slot.variant = variant;

        const frame = createPose(3, 112, variant);
        frame.classList.add('hall-pose', 'active');
        slot.frames = [frame];

        slot.vacantEl.hidden = true;
        slot.badgeEl.hidden = false;
        slot.rankEl.textContent = donor ? (user.coins >= 500 ? `👑${user.rank}` : user.rank) : (index < 4 ? `Top ${index + 1}` : '•');
        slot.nameEl.textContent = user.name;
        slot.nameEl.title = `${user.name} · ${donor ? `${user.coins.toLocaleString('vi-VN')} xu` : 'Đang gồng lệnh'}`;

        slot.avatarEl.replaceChildren();
        slot.avatarEl.textContent = user.name.slice(0, 1).toUpperCase();
        if (user.avatar) {
          try {
            const url = new URL(user.avatar);
            if (['https:', 'http:'].includes(url.protocol)) {
              const img = new Image();
              img.src = url.href;
              img.alt = '';
              img.onerror = () => img.remove();
              slot.avatarEl.append(img);
            }
          } catch {}
        }

        const assignClasses = (withWalk = false) => {
          const isSuperVip = donor && user.coins >= 500;
          slot.element.className = `hall-person occupied${withWalk ? ' just-seated' : ''}${user.pinned || index < 4 || isSuperVip ? ' vip front-row' : ''}${isSuperVip ? ' super-vip' : ''}${!donor ? ' participant' : ''}${SPIRITUAL_VARIANT_BY_SEAT[index] != null ? ' spiritual-trader' : ''}${specialVariantClass(slot.variant)}${personalityClasses(index)}`;
          slot.element.setAttribute('aria-label', `${donor ? `Hạng ${user.rank}` : `Ghế trade ${index + 1}`}: ${user.name}${donor ? `, ${user.coins} xu` : ', đang gồng lệnh'}`);
        };

        if (isInitialBoot) {
          // On boot/reload, seat all characters immediately so the room is instantly packed and full
          slot.occupantEl.replaceChildren(frame);
          assignClasses(false);
        } else {
          // Subsequent dynamically arriving viewers enter sequentially one by one
          queueEntrance(() => {
            slot.occupantEl.replaceChildren(frame);
            assignClasses(true);
            // A new real viewer makes their little corner of the room erupt.
            if (!user.isAmbient) setMood('welcome', 3400);
            setTimeout(() => {
              slot.element.classList.remove('just-seated');
            }, 1400);
          });
        }

      } else {
        // Same occupant already seated: update rank/coins quietly without any re-render flicker
        slot.rankEl.textContent = donor ? (user.coins >= 500 ? `👑${user.rank}` : user.rank) : (index < 4 ? `Top ${index + 1}` : '•');
        slot.nameEl.textContent = user.name;
        slot.nameEl.title = `${user.name} · ${donor ? `${user.coins.toLocaleString('vi-VN')} xu` : 'Đang gồng lệnh'}`;
        const hasJustSeated = slot.element.classList.contains('just-seated');
        slot.element.className = `hall-person occupied${hasJustSeated ? ' just-seated' : ''}${user.pinned || index < 4 ? ' vip front-row' : ''}${!donor ? ' participant' : ''}${SPIRITUAL_VARIANT_BY_SEAT[index] != null ? ' spiritual-trader' : ''}${specialVariantClass(slot.variant)}${personalityClasses(index)}`;
      }
    });

    isInitialBoot = false;
  };

  const animate = time => {
    collective = time !== null;
    parent.classList.toggle('collective', collective);
    if (!collective && pending) {
      const next = pending;
      pending = null;
      render(next);
    }
  };

  const setMood = (mood = 'idle', duration = 0) => {
    if (moodTimer) clearTimeout(moodTimer);
    parent.dataset.mood = mood;
    if (duration > 0) {
      moodTimer = setTimeout(() => {
        parent.dataset.mood = 'idle';
        moodTimer = null;
      }, duration);
    }
  };

  // Between server events, stage a living market rhythm: gossip → anticipation
  // → release. Explicit game/news moods always take precedence over this loop.
  setInterval(() => {
    if (parent.dataset.mood && parent.dataset.mood !== 'idle') return;
    ambientScene = (ambientScene + 1) % 3;
    if (ambientScene === 1) setMood('social', 5200);
    else if (ambientScene === 2) setMood('tense', 3800);
  }, 11000);

  // Pre-seed all 28 seats on instantiation so hall is immediately packed with full-body characters
  try {
    render({ seats: [] });
  } catch {}

  setMood('idle');
  stageCrowdTalk();
  setInterval(stageCrowdTalk, 6200);
  return { render, animate, setMood };
}
