let wsOriginPromise = null;

/**
 * Resolve WebSocket URL; connects directly to Cloud Run `wsOrigin` when served from Firebase Hosting CDN.
 */
export async function resolveWsUrl(pathAndQuery) {
  const defaultProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const defaultOrigin = `${defaultProtocol}//${location.host}`;
  if (!/\.(?:web\.app|firebaseapp\.com)$/i.test(location.hostname)) {
    return `${defaultOrigin}${pathAndQuery}`;
  }

  if (!wsOriginPromise) {
    wsOriginPromise = fetch('/api/app-info')
      .then(res => (res.ok ? res.json() : null))
      .then(info => (info?.wsOrigin ? String(info.wsOrigin).replace(/\/+$/, '') : defaultOrigin))
      .catch(() => defaultOrigin);
  }
  const base = await wsOriginPromise;
  return `${base}${pathAndQuery}`;
}
