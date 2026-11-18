// Client App for Đu Chart Online
const $ = id => document.getElementById(id);

// --- User Profile & Identity ---
const STORAGE_KEY = 'duchart_user_identity';
let user = {
  id: '',
  name: '',
  avatar: '',
  score: 0,
  levelBadge: 'F0'
};

function loadUserIdentity() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.id) {
      user = { ...user, ...saved };
    }
  } catch {}
  if (!user.id) {
    user.id = 'trader_' + Math.random().toString(36).slice(2, 10);
    user.name = 'Trader ' + user.id.slice(-4).toUpperCase();
    saveUserIdentity();
  }
}

function saveUserIdentity() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {}
}

loadUserIdentity();

// --- Audio Engine: Web Audio Bell & Fortune Audio ---
let audioCtx = null;
let soundEnabled = true;
let currentFortuneAudio = null;
let bgMusic = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playBellSound(kind = 'bell') {
  if (!soundEnabled) return;
  try {
    initAudio();
    const t = audioCtx.currentTime;
    const isBigBell = kind === 'bell';
    const freqs = isBigBell ? [220, 445, 665, 1120] : [450, 760];
    freqs.forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18 / (i + 1), t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + (isBigBell ? 3.2 : 0.4));
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + (isBigBell ? 3.5 : 0.5));
    });
  } catch (e) {
    console.warn('Audio play error:', e);
  }
}

// --- Room State & Configuration ---
const urlParams = new URLSearchParams(window.location.search);
let currentRoomId = urlParams.get('room') || (window.location.pathname.startsWith('/room/') ? window.location.pathname.split('/')[2] : 'general');
currentRoomId = currentRoomId.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'general';

let currentSymbol = 'FX:EURUSD';
let currentTimeframe = '15';
let hostId = null;
let isHost = false;
let isSoloMode = false;
let ws = null;
let pingInterval = null;
let fortunesCatalog = [];

// --- TradingView Chart Widget Integration ---
let tvWidget = null;
let chartLoadTimer = null;

function renderTradingViewChart(symbol, timeframe) {
  const container = $('tradingview_embed');
  if (!container) return;
  container.replaceChildren();

  $('chartLoading').classList.remove('hidden');
  $('chartFallback').classList.add('hidden');

  // Update label
  const symbolMap = {
    'FX:EURUSD': 'EUR/USD',
    'FX:GBPUSD': 'GBP/USD',
    'FX:USDJPY': 'USD/JPY',
    'OANDA:XAUUSD': 'Vàng (XAU/USD)'
  };
  $('chartActiveSymbolLabel').textContent = `${symbolMap[symbol] || symbol} (${timeframe}M)`;
  $('externalChartLink').href = `https://www.tradingview.com/symbols/${symbol.split(':')[1] || 'EURUSD'}/`;

  // Start 8-second watchdog timer
  clearTimeout(chartLoadTimer);
  chartLoadTimer = setTimeout(() => {
    // If iframe not created or failed
    const iframe = container.querySelector('iframe');
    if (!iframe) {
      $('chartLoading').classList.add('hidden');
      $('chartFallback').classList.remove('hidden');
    }
  }, 8000);

  if (typeof TradingView !== 'undefined') {
    try {
      tvWidget = new TradingView.widget({
        "autosize": true,
        "symbol": symbol,
        "interval": timeframe,
        "timezone": "Asia/Ho_Chi_Minh",
        "theme": "dark",
        "style": "1",
        "locale": "vi_VN",
        "toolbar_bg": "#1c1917",
        "enable_publishing": false,
        "allow_symbol_change": false,
        "container_id": "tradingview_embed"
      });

      // Hide loading overlay once iframe appears
      const checkIframe = setInterval(() => {
        if (container.querySelector('iframe')) {
          clearInterval(checkIframe);
          clearTimeout(chartLoadTimer);
          setTimeout(() => $('chartLoading').classList.add('hidden'), 600);
        }
      }, 200);
    } catch (err) {
      console.error('TradingView init error:', err);
      $('chartLoading').classList.add('hidden');
      $('chartFallback').classList.remove('hidden');
    }
  } else {
    // If TradingView script not loaded
    clearTimeout(chartLoadTimer);
    $('chartLoading').classList.add('hidden');
    $('chartFallback').classList.remove('hidden');
  }
}

// --- WebSocket Realtime Connection ---
async function connectWebSocket() {
  let wsUrl;
  try {
    const { resolveWsUrl } = await import('/js/ws-url.js');
    wsUrl = await resolveWsUrl(`/ws?roomId=${currentRoomId}`);
  } catch {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    wsUrl = `${protocol}//${location.host}/ws?roomId=${currentRoomId}`;
  }
  
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    // Join room with user profile
    ws.send(JSON.stringify({
      type: 'join_room',
      data: {
        roomId: currentRoomId,
        user: {
          id: user.id,
          name: user.name,
          avatar: user.avatar
        }
      }
    }));

    // Start heartbeat every 10s
    clearInterval(pingInterval);
    pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 10000);
  };

  ws.onmessage = e => {
    try {
      const msg = JSON.parse(e.data);
      handleServerMessage(msg);
    } catch (err) {
      console.warn('WS message parse error:', err);
    }
  };

  ws.onclose = () => {
    clearInterval(pingInterval);
    setTimeout(connectWebSocket, 2000); // Auto reconnect
  };
}

function handleServerMessage(msg) {
  const { type, data } = msg;

  if (type === 'room_snapshot') {
    applyRoomSnapshot(data);
  } else if (type === 'room_state_updated') {
    hostId = data.hostId;
    isHost = (hostId === user.id);
    if (!isSoloMode) {
      currentSymbol = data.symbol;
      currentTimeframe = data.timeframe;
      updateChartButtons(currentSymbol, currentTimeframe);
      renderTradingViewChart(currentSymbol, currentTimeframe);
    }
  } else if (type === 'chat_broadcast' || type === 'user_joined_broadcast') {
    appendChatMessage(data);
  } else if (type === 'reaction_broadcast') {
    showFlyingReaction(data);
  } else if (type === 'action_broadcast') {
    handleActionBroadcast(data);
  } else if (type === 'presence_updated') {
    updatePresence(data);
  } else if (type === 'message_deleted') {
    const el = document.getElementById(`msg-${data.messageId}`);
    if (el) el.remove();
  } else if (type === 'error') {
    showNotification(data.message, true);
  }
}

function applyRoomSnapshot(snap) {
  $('currentRoomName').textContent = snap.name;
  $('currentRoomCode').textContent = `(${snap.id})`;
  
  hostId = snap.hostId;
  isHost = (hostId === user.id);

  if (!isSoloMode) {
    currentSymbol = snap.symbol || currentSymbol;
    currentTimeframe = snap.timeframe || currentTimeframe;
    updateChartButtons(currentSymbol, currentTimeframe);
    renderTradingViewChart(currentSymbol, currentTimeframe);
  }

  updatePresence(snap);

  // Render recent messages
  const chatContainer = $('chatMessages');
  if (snap.recentMessages && snap.recentMessages.length) {
    snap.recentMessages.forEach(msg => appendChatMessage(msg, false));
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

function updatePresence(snap) {
  const count = snap.onlineCount || (snap.participants ? snap.participants.length : 1);
  $('onlineCountBadge').textContent = count;
  $('chatOnlineCount').textContent = count;

  const membersList = $('presenceMembersList');
  if (membersList && snap.participants) {
    membersList.replaceChildren();
    snap.participants.forEach(p => {
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between py-0.5 px-1 rounded hover:bg-stone-900';
      item.innerHTML = `
        <span class="font-medium text-stone-300 flex items-center gap-1">
          <span>${p.isHost ? '👑' : '👤'}</span>
          <span>${escapeHtml(p.nickname)}</span>
        </span>
        <span class="text-[10px] text-amber-400 font-mono">${p.score || 0} pts</span>
      `;
      membersList.appendChild(item);
    });
  }
}

function updateChartButtons(symbol, tf) {
  document.querySelectorAll('.watchlist-btn').forEach(btn => {
    const isSelected = btn.dataset.symbol === symbol;
    btn.className = isSelected
      ? 'watchlist-btn px-2.5 py-1 rounded-lg text-xs font-bold transition bg-amber-600 text-stone-950 shadow'
      : 'watchlist-btn px-2.5 py-1 rounded-lg text-xs font-bold transition bg-stone-800 hover:bg-stone-700 text-stone-300';
  });

  document.querySelectorAll('.timeframe-btn').forEach(btn => {
    const isSelected = btn.dataset.tf === tf;
    btn.className = isSelected
      ? 'timeframe-btn px-2 py-0.5 rounded text-xs font-mono font-bold transition bg-amber-600 text-stone-950 shadow'
      : 'timeframe-btn px-2 py-0.5 rounded text-xs font-mono font-bold transition bg-stone-800 hover:bg-stone-700 text-stone-300';
  });
}

function appendChatMessage(msg, scroll = true) {
  const container = $('chatMessages');
  if (!container) return;

  const item = document.createElement('div');
  item.id = `msg-${msg.id}`;
  item.className = 'bg-stone-950/70 border border-stone-800/80 rounded-xl p-2.5 space-y-1';

  const timeStr = new Date(msg.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  item.innerHTML = `
    <div class="flex items-center justify-between text-[11px]">
      <span class="font-bold text-amber-300 flex items-center gap-1">
        <span>${escapeHtml(msg.nickname)}</span>
        <span class="text-[9px] px-1 rounded bg-stone-800 text-stone-400 font-normal">${escapeHtml(msg.badge || 'F0')}</span>
      </span>
      <span class="text-[10px] text-stone-500 font-mono">${timeStr}</span>
    </div>
    <p class="text-xs text-stone-200 leading-snug break-words">${escapeHtml(msg.text)}</p>
  `;

  container.appendChild(item);
  if (scroll) {
    container.scrollTop = container.scrollHeight;
  }
}

function showFlyingReaction(data) {
  const zone = $('reactionFlyZone');
  if (!zone) return;

  const flyEl = document.createElement('div');
  flyEl.className = 'absolute reaction-fly flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-900/90 border border-amber-500/80 shadow-2xl text-xs font-bold text-amber-200';
  
  const leftPos = 20 + Math.random() * 60;
  const bottomPos = 30 + Math.random() * 50;
  flyEl.style.left = `${leftPos}%`;
  flyEl.style.bottom = `${bottomPos}px`;
  
  flyEl.innerHTML = `<span>${data.icon}</span> <span>${escapeHtml(data.label)}</span> <span class="text-[10px] text-stone-400">(${escapeHtml(data.nickname)})</span>`;

  zone.appendChild(flyEl);
  setTimeout(() => flyEl.remove(), 2200);
}

function handleActionBroadcast(data) {
  playBellSound(data.sound || 'bell');

  // Update banner quote
  if (data.quote) {
    $('quoteText').textContent = `"${data.quote}"`;
  }

  // If this action was done by current user, update score
  if (data.userId === user.id) {
    user.score = data.totalScore;
    user.levelBadge = data.levelBadge;
    saveUserIdentity();
    $('userScoreDisplay').textContent = `${user.score} pts`;
    $('userLevelBadge').textContent = user.levelBadge;
  }

  // If action is fortune, open fortune modal
  if (data.actionId === 'fortune') {
    triggerFortuneModal(data);
  } else {
    showNotification(`${data.nickname || 'Một trader'} vừa thực hiện: ${data.actionName}! (+${data.pointsEarned} pts)`);
  }
}

// --- 99 Fortunes / Bói Nến ---
async function loadFortunes() {
  try {
    const res = await fetch('/api/fortunes');
    if (res.ok) {
      const data = await res.json();
      fortunesCatalog = data.items || [];
    }
  } catch {}
}
loadFortunes();

function triggerFortuneModal(actionData) {
  if (!fortunesCatalog.length) return;
  const fortune = fortunesCatalog[Math.floor(Math.random() * fortunesCatalog.length)];
  
  $('modalFortuneNumber').textContent = `LỜI XĂM SỐ ${fortune.number} · BÓI NẾN THƯỢNG CÁT`;
  $('modalFortuneTitle').textContent = fortune.title;
  $('modalFortunePoem').innerHTML = fortune.text.replace(/\n/g, '<br>');
  $('modalFortuneMessage').textContent = fortune.message;

  $('fortuneModal').classList.remove('hidden');

  // Play narration audio if available
  if (soundEnabled && fortune.audio && fortune.audio.url) {
    if (currentFortuneAudio) {
      currentFortuneAudio.pause();
    }
    currentFortuneAudio = new Audio(fortune.audio.url);
    currentFortuneAudio.volume = 0.9;
    $('modalFortuneAudioStatus').textContent = 'Đang phát giọng đọc Mai Chi…';
    currentFortuneAudio.play().catch(() => {
      $('modalFortuneAudioStatus').textContent = 'Âm thanh tự động bị chặn. Hãy bấm chuột để nghe.';
    });
  } else {
    $('modalFortuneAudioStatus').textContent = 'Lời khuyên an lạc cho tâm lý giao dịch.';
  }
}

$('closeFortuneModalBtn').onclick = () => {
  $('fortuneModal').classList.add('hidden');
  if (currentFortuneAudio) {
    currentFortuneAudio.pause();
    currentFortuneAudio = null;
  }
};

// --- Notifications Helper ---
let notifTimer = null;
function showNotification(msg, isError = false) {
  let toast = $('appNotification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appNotification';
    toast.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-xs font-bold shadow-2xl z-50 transition-all duration-300';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl text-xs font-bold shadow-2xl z-50 transition-all duration-300 ${
    isError ? 'bg-red-900 border border-red-600 text-red-100' : 'bg-stone-900 border border-amber-500 text-amber-200'
  }`;
  toast.classList.remove('hidden');
  clearTimeout(notifTimer);
  notifTimer = setTimeout(() => toast.classList.add('hidden'), 3500);
}

// --- Leaderboard ---
async function refreshLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard');
    if (!res.ok) return;
    const list = await res.json();
    const container = $('leaderboardList');
    if (!container) return;

    if (!list.length) {
      container.innerHTML = '<div class="text-center text-stone-500 text-[11px] py-3">Chưa có điểm xếp hạng. Hãy bấm tương tác đầu tiên!</div>';
      return;
    }

    container.replaceChildren();
    list.slice(0, 10).forEach(u => {
      const row = document.createElement('div');
      row.className = 'flex items-center justify-between p-1.5 rounded-lg bg-stone-950/60 border border-stone-800/80 hover:border-amber-600/40 transition';
      row.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="w-5 text-center font-bold font-mono ${u.rank === 1 ? 'text-amber-400' : u.rank === 2 ? 'text-stone-300' : u.rank === 3 ? 'text-amber-600' : 'text-stone-500'}">${u.rank}</span>
          <div>
            <div class="font-bold text-stone-200 flex items-center gap-1">
              <span>${escapeHtml(u.name)}</span>
              <span class="text-[9px] px-1 rounded bg-stone-800 text-stone-400">${escapeHtml(u.badge || '')}</span>
            </div>
            <div class="text-[10px] text-stone-500">${escapeHtml(u.title || '')}</div>
          </div>
        </div>
        <div class="font-mono font-bold text-amber-400 text-xs">${u.score} pts</div>
      `;
      container.appendChild(row);
    });
  } catch {}
}

refreshLeaderboard();
setInterval(refreshLeaderboard, 15000);

// --- User Profile Header Update ---
function updateUserUI() {
  $('userDisplayName').textContent = user.name;
  $('userLevelBadge').textContent = user.levelBadge;
  $('userScoreDisplay').textContent = `${user.score} pts`;
}
updateUserUI();

// --- Event Listeners & Interactions ---

// Watchlist buttons
document.querySelectorAll('.watchlist-btn').forEach(btn => {
  btn.onclick = () => {
    initAudio();
    const symbol = btn.dataset.symbol;
    if (isHost && !isSoloMode) {
      // Host updates room state for everyone
      ws.send(JSON.stringify({
        type: 'set_room_state',
        data: { symbol, timeframe: currentTimeframe }
      }));
    } else {
      // Solo mode for non-hosts or when free-looking
      isSoloMode = true;
      currentSymbol = symbol;
      updateViewModeUI();
      updateChartButtons(currentSymbol, currentTimeframe);
      renderTradingViewChart(currentSymbol, currentTimeframe);
    }
  };
});

// Timeframe buttons
document.querySelectorAll('.timeframe-btn').forEach(btn => {
  btn.onclick = () => {
    initAudio();
    const tf = btn.dataset.tf;
    if (isHost && !isSoloMode) {
      ws.send(JSON.stringify({
        type: 'set_room_state',
        data: { symbol: currentSymbol, timeframe: tf }
      }));
    } else {
      isSoloMode = true;
      currentTimeframe = tf;
      updateViewModeUI();
      updateChartButtons(currentSymbol, currentTimeframe);
      renderTradingViewChart(currentSymbol, currentTimeframe);
    }
  };
});

function updateViewModeUI() {
  if (isSoloMode) {
    $('viewModeBadge').className = 'px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-600/60 text-amber-300 font-medium text-[11px] flex items-center gap-1';
    $('viewModeText').textContent = 'Đang xem riêng';
    $('rejoinRoomSyncBtn').classList.remove('hidden');
  } else {
    $('viewModeBadge').className = 'px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 font-medium text-[11px] flex items-center gap-1';
    $('viewModeText').textContent = 'Theo phòng';
    $('rejoinRoomSyncBtn').classList.add('hidden');
  }
}

$('rejoinRoomSyncBtn').onclick = () => {
  isSoloMode = false;
  updateViewModeUI();
  // Fetch current room state and re-render
  fetch(`/api/rooms/${currentRoomId}`).then(r => r.json()).then(snap => {
    currentSymbol = snap.symbol || currentSymbol;
    currentTimeframe = snap.timeframe || currentTimeframe;
    updateChartButtons(currentSymbol, currentTimeframe);
    renderTradingViewChart(currentSymbol, currentTimeframe);
  });
};

// Retry chart button
$('retryChartBtn').onclick = () => {
  renderTradingViewChart(currentSymbol, currentTimeframe);
};

// Chat form
$('chatForm').onsubmit = e => {
  e.preventDefault();
  initAudio();
  const text = $('chatInput').value.trim();
  if (!text) return;
  $('chatInput').value = '';

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'chat_message',
      data: { text }
    }));
  }
};

// Quick Reactions
document.querySelectorAll('.reaction-btn').forEach(btn => {
  btn.onclick = () => {
    initAudio();
    const reactionId = btn.dataset.reaction;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'reaction',
        data: { reactionId }
      }));
    }
  };
});

// Forex Action Buttons
document.querySelectorAll('.action-btn').forEach(btn => {
  btn.onclick = () => {
    initAudio();
    const actionId = btn.dataset.action;
    btn.disabled = true;
    setTimeout(() => { btn.disabled = false; }, 1500);

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'action',
        data: { actionId }
      }));
    }
  };
});

// Sound Toggle
$('soundToggleBtn').onclick = () => {
  soundEnabled = !soundEnabled;
  $('soundIcon').textContent = soundEnabled ? '🔊' : '🔇';
  $('soundLabel').textContent = soundEnabled ? 'Âm thanh' : 'Tắt tiếng';
  if (!soundEnabled && currentFortuneAudio) {
    currentFortuneAudio.pause();
  }
};

// Share Room
$('shareRoomBtn').onclick = async () => {
  const shareUrl = `${window.location.origin}/room/${currentRoomId}`;
  if (navigator.share) {
    try {
      await navigator.share({
        title: `Đu Chart Online — Phòng ${$('currentRoomName').textContent}`,
        text: `Vào phòng cùng ngắm nến ${currentSymbol} và xả stress với anh em trader!`,
        url: shareUrl
      });
      return;
    } catch {}
  }
  // Fallback to clipboard
  try {
    await navigator.clipboard.writeText(shareUrl);
    showNotification('Đã sao chép link phòng vào khay nhớ tạm!');
  } catch {
    showNotification('Link phòng: ' + shareUrl);
  }
};

// Quick Room Switcher Buttons
document.querySelectorAll('.quick-room-btn').forEach(btn => {
  btn.onclick = () => {
    const targetRoom = btn.dataset.room;
    if (targetRoom === currentRoomId) return;
    window.location.href = `/room/${targetRoom}`;
  };
});

// Toggle Presence dropdown
$('togglePresenceListBtn').onclick = () => {
  $('presenceMembersList').classList.toggle('hidden');
};

// Edit Name Modal
$('editNameBtn').onclick = () => {
  $('nameInput').value = user.name;
  $('nameModal').classList.remove('hidden');
  $('nameInput').focus();
};
$('cancelNameBtn').onclick = () => $('nameModal').classList.add('hidden');
$('saveNameBtn').onclick = () => {
  const newName = $('nameInput').value.trim();
  if (newName) {
    user.name = newName.slice(0, 30);
    saveUserIdentity();
    updateUserUI();
    $('nameModal').classList.add('hidden');
    // Re-join room with new name
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'join_room',
        data: {
          roomId: currentRoomId,
          user: { id: user.id, name: user.name, avatar: user.avatar }
        }
      }));
    }
  }
};

// Mobile Tab Switcher
document.querySelectorAll('.mobile-tab-btn').forEach(btn => {
  btn.onclick = () => {
    const target = btn.dataset.target;
    document.querySelectorAll('.mobile-tab-btn').forEach(b => {
      b.className = (b === btn)
        ? 'mobile-tab-btn flex-1 py-1.5 rounded-lg text-center text-amber-400 bg-stone-800 transition'
        : 'mobile-tab-btn flex-1 py-1.5 rounded-lg text-center text-stone-400 hover:text-stone-200 transition';
    });
    // On mobile, show target panel
    ['panel-chart', 'panel-chat', 'panel-rituals', 'panel-ranks'].forEach(id => {
      const el = $(id);
      if (el) {
        if (id === target) {
          el.classList.remove('hidden');
        } else if (window.innerWidth < 1024) {
          el.classList.add('hidden');
        }
      }
    });
  };
});

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));
}

// Initial connection
connectWebSocket();
