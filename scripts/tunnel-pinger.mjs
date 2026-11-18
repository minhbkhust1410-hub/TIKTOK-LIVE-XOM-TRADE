const TARGET_URL = process.argv[2] || 'https://fc14f7f1d7f28ea6-113-176-26-77.serveousercontent.com/api/state';

console.log('[Tunnel Pinger] Starting keep-alive for:', TARGET_URL);

async function ping() {
  try {
    const res = await fetch(TARGET_URL, {
      headers: { 'User-Agent': 'TunnelKeepAlive/1.0' }
    });
    console.log(`[${new Date().toLocaleTimeString()}] Ping status:`, res.status);
  } catch (err) {
    console.log(`[${new Date().toLocaleTimeString()}] Ping error:`, err.message);
  }
}

// Ping immediately, then every 25s
ping();
setInterval(ping, 25000);
