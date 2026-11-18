import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const URL_FILE = path.resolve('output/live-tunnel-url.txt');
fs.mkdirSync(path.dirname(URL_FILE), { recursive: true });

let currentUrl = '';
let pingTimer = null;

function ping() {
  if (!currentUrl) return;
  fetch(`${currentUrl}/api/state`, { headers: { 'User-Agent': 'TunnelKeepAlive/1.0' } })
    .then(r => {
      // console.log(`[Keepalive] ${new Date().toLocaleTimeString()} -> ${r.status}`);
    })
    .catch(() => {});
}

function startServeo() {
  console.log('[TunnelManager] Spawning Serveo SSH tunnel...');
  const proc = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=15',
    '-o', 'ServerAliveCountMax=3',
    '-R', '80:127.0.0.1:3001',
    'serveo.net'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  const handleData = (buf) => {
    const text = buf.toString();
    console.log('[Serveo]', text.trim());
    const match = text.match(/https:\/\/[a-z0-9\-]+\.serveousercontent\.com/i);
    if (match) {
      currentUrl = match[0];
      fs.writeFileSync(URL_FILE, currentUrl, 'utf8');
      console.log('══════════════════════════════════════════════════════════════');
      console.log('🚀 LIVE PUBLIC TUNNEL READY:');
      console.log('👉 Cockpit 1 Cửa Sổ:', `${currentUrl}/live-test`);
      console.log('👉 OBS Overlay:     ', `${currentUrl}/overlay`);
      console.log('══════════════════════════════════════════════════════════════');
      if (!pingTimer) {
        pingTimer = setInterval(ping, 15000);
      }
    }
  };

  proc.stdout.on('data', handleData);
  proc.stderr.on('data', handleData);

  proc.on('close', (code) => {
    console.log(`[TunnelManager] Serveo exited with code ${code}. Reconnecting in 3s...`);
    setTimeout(startServeo, 3000);
  });

  proc.on('error', (err) => {
    console.error('[TunnelManager] Serveo process error:', err.message);
    setTimeout(startServeo, 3000);
  });
}

startServeo();
