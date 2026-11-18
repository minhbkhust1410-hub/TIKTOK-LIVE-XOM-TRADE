const token = decodeURIComponent(location.pathname.split('/').filter(Boolean).at(-1) || '');
const $ = id => document.getElementById(id);
let timer;
let pendingEventId = '';
let pendingCommand = '';
let pendingSince = 0;
const feedback = (text, error = false) => {
  $('feedback').textContent = text;
  $('feedback').classList.toggle('error', error);
  clearTimeout(timer); timer = setTimeout(() => { $('feedback').textContent = ''; }, 5000);
};
async function call(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Remote-Control-Token': token, ...(options.headers || {}) },
    cache: 'no-store'
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Không gửi được lệnh.');
  return body;
}
async function refreshStatus() {
  try {
    const receiptQuery = pendingEventId ? `?eventId=${encodeURIComponent(pendingEventId)}` : '';
    const status = await call(`/api/remote-control/state${receiptQuery}`, { method: 'GET' });
    const node = $('connection');
    node.className = 'status ' + (status.overlayConnected ? 'ok' : 'waiting');
    const autoShow = status.ambient?.autoShow ? ' · Auto show ON' : '';
    node.textContent = status.overlayConnected ? `● Màn phát đã kết nối · ${status.overlays} Overlay${autoShow}` : '● Chưa thấy màn OBS · lệnh sẽ được giữ ngắn hạn';
    if (pendingEventId && status.delivery?.acknowledged) {
      feedback(`✓ Màn LIVE đã hiển thị lệnh: ${pendingCommand}.`);
      pendingEventId = ''; pendingCommand = ''; pendingSince = 0;
    } else if (pendingEventId && Date.now() - pendingSince > 10000) {
      feedback('⚠ Lệnh đã gửi nhưng chưa thấy OBS xác nhận. Kiểm tra màn Overlay có đang mở.', true);
      pendingEventId = ''; pendingCommand = ''; pendingSince = 0;
    }
    const config = status.config || {};
    const track = $('musicFile');
    if (!track.options.length) track.replaceChildren(
      Object.assign(document.createElement('option'), { value: '', textContent: '— Chọn nhạc nền —' }),
      ...(status.music || []).map(item => Object.assign(document.createElement('option'), { value: item.file, textContent: item.title }))
    );
    track.value = config.musicFile || '';
    $('musicVolume').value = Math.round((config.musicVolume ?? .35) * 100);
    $('musicVolumeValue').textContent = `${$('musicVolume').value}%`;
    $('voiceEnabled').checked = config.voiceEnabled !== false;
    $('chartSymbol').value = config.chartSymbol || 'OANDA:XAUUSD';
    $('chartTimeframe').value = config.chartTimeframe || '15';
    $('showRitualBoard').checked = config.showRitualBoard !== false;
    $('showLeaderboard').checked = config.showLeaderboard !== false;
  } catch (error) {
    $('connection').className = 'status bad';
    $('connection').textContent = 'Không kết nối được máy chủ';
  }
}
document.querySelectorAll('[data-command]').forEach(button => {
  button.addEventListener('click', async () => {
    const command = button.dataset.command;
    button.disabled = true;
    try {
      const body = await call('/api/remote-control/command', { method: 'POST', body: JSON.stringify({ command, headline: command === 'news' ? $('headline').value : undefined }) });
      if (body.eventId && body.overlayOnline) {
        pendingEventId = body.eventId;
        pendingCommand = body.message;
        pendingSince = Date.now();
        feedback(`✓ ${body.message} Đang chờ màn LIVE xác nhận…`);
      } else if (body.eventId) {
        feedback(`✓ ${body.message} Màn LIVE chưa kết nối; lệnh được giữ ngắn hạn.`, true);
      } else {
        feedback(`✓ ${body.message}`);
      }
      refreshStatus();
    } catch (error) { feedback(error.message, true); }
    finally { button.disabled = false; }
  });
});
async function saveSettings(changes, notice) {
  try { await call('/api/remote-control/settings', { method: 'POST', body: JSON.stringify(changes) }); if (notice) feedback(`✓ ${notice}`); refreshStatus(); }
  catch (error) { feedback(error.message, true); }
}
$('musicOn').onclick = () => $('musicFile').value ? saveSettings({ musicFile: $('musicFile').value, musicVolume: Math.max(.12, Number($('musicVolume').value) / 100) }, 'Đã bật nhạc nền.') : feedback('Hãy chọn một bài nhạc trước.', true);
$('musicOff').onclick = () => saveSettings({ musicFile: '' }, 'Đã tắt nhạc nền.');
$('musicFile').onchange = () => saveSettings({ musicFile: $('musicFile').value }, 'Đã đổi bài nhạc.');
$('musicVolume').oninput = () => { $('musicVolumeValue').textContent = `${$('musicVolume').value}%`; };
$('musicVolume').onchange = () => saveSettings({ musicVolume: Number($('musicVolume').value) / 100 }, 'Đã đổi âm lượng nhạc.');
$('voiceEnabled').onchange = () => saveSettings({ voiceEnabled: $('voiceEnabled').checked }, $('voiceEnabled').checked ? 'Đã bật giọng đọc.' : 'Đã tắt giọng đọc.');
$('chartSymbol').onchange = () => saveSettings({ chartSymbol: $('chartSymbol').value }, 'Đã đổi cặp nến.');
$('chartTimeframe').onchange = () => saveSettings({ chartTimeframe: $('chartTimeframe').value }, 'Đã đổi khung nến.');
$('showRitualBoard').onchange = () => saveSettings({ showRitualBoard: $('showRitualBoard').checked });
$('showLeaderboard').onchange = () => saveSettings({ showLeaderboard: $('showLeaderboard').checked });
refreshStatus();
setInterval(refreshStatus, 1500);
