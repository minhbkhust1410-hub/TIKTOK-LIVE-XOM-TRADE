import { normalizeEvent } from "./core.js";

/**
 * Cache or enrich missing diamond/type metadata for incoming TikTok gift packets.
 */
export function enrichGiftPayload(data, giftCatalog) {
  if (!data || typeof data !== "object" || !(giftCatalog instanceof Map)) return data;
  const giftObj = data.gift || data.giftDetails || {};
  const giftId = String(data.giftId || giftObj.id || "");
  if (!giftId) return data;

  const knownDiamonds = giftObj.diamondCount ?? data.diamondCount ?? data.extendedGiftInfo?.diamond_count;
  const knownName = data.giftName || giftObj.name || giftObj.giftName || data.extendedGiftInfo?.name;
  const knownType = data.giftType ?? giftObj.type ?? giftObj.giftType;

  if (knownDiamonds != null && Number(knownDiamonds) > 0) {
    giftCatalog.set(giftId, {
      name: knownName || giftCatalog.get(giftId)?.name || "",
      diamondCount: Number(knownDiamonds),
      giftType: knownType ?? giftCatalog.get(giftId)?.giftType ?? 0,
    });
    return data;
  }

  const cached = giftCatalog.get(giftId);
  if (!cached) return data;
  return {
    ...data,
    giftName: knownName || cached.name,
    diamondCount: cached.diamondCount,
    giftType: knownType ?? cached.giftType,
    gift: { ...giftObj, id: giftId, name: giftObj.name || cached.name, diamondCount: cached.diamondCount, type: giftObj.type ?? cached.giftType },
  };
}

/**
 * Parse a cookie string into a map of cookie key -> value.
 */
export function parseCookieHeader(cookieStr = "") {
  const map = {};
  for (const part of String(cookieStr || "").split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) continue;
    const k = trimmed.slice(0, eqIdx).trim();
    const v = trimmed.slice(eqIdx + 1).trim();
    if (k) map[k] = v;
  }
  return map;
}

/**
 * Parse a pipe-delimited TikTok account string or raw cookie line into a normalized session object.
 * Format supported:
 *   username|password|email|emailPass|oauthToken|clientId|cookieString|recoveryEmail
 * or a raw cookie string containing `sessionid=...`
 */
export function parseTikTokSessionLine(rawLine) {
  const line = String(rawLine || "").trim();
  if (!line) return null;

  let username = "";
  let email = "";
  let recoveryEmail = "";
  let cookiePart = line;

  if (line.includes("|")) {
    const parts = line.split("|").map((s) => s.trim());
    username = (parts[0] || "").replace(/^@/, "");
    email = parts[2] || "";
    const cookieCandidate = parts.find((p) => p.includes("sessionid="));
    if (cookieCandidate) {
      cookiePart = cookieCandidate;
    }
    const lastPart = parts[parts.length - 1] || "";
    if (lastPart.includes("@") && lastPart !== email) {
      recoveryEmail = lastPart;
    }
  }

  const cookies = parseCookieHeader(cookiePart);
  const sessionId = cookies.sessionid || cookies.sessionid_ss || cookies.sid_tt || "";
  if (!sessionId || !/^[a-f0-9]{16,64}$/i.test(sessionId)) {
    return null;
  }

  const ttTargetIdc = cookies["tt-target-idc"] || cookies["store-idc"] || "alisg";
  const storeCountryCode = cookies["store-country-code"] || "vn";
  const uidTt = cookies.uid_tt || cookies.uid_tt_ss || "";
  const odinTt = cookies.odin_tt || "";
  const sidUcpV1 = cookies.sid_ucp_v1 || cookies.ssid_ucp_v1 || "";
  const ttwid = cookies.ttwid || "";

  let userId = "";
  if (cookies.multi_sids) {
    const decoded = decodeURIComponent(cookies.multi_sids);
    const uidCandidate = decoded.split(":")[0];
    if (/^\d+$/.test(uidCandidate)) userId = uidCandidate;
  }

  let expiresAt = null;
  if (cookies.sid_guard) {
    const guardParts = decodeURIComponent(cookies.sid_guard).split("|");
    const dateStr = guardParts[3]?.replace(/\+/g, " ");
    const parsedDate = dateStr ? new Date(dateStr) : null;
    if (parsedDate && !Number.isNaN(parsedDate.getTime())) {
      expiresAt = parsedDate.toISOString();
    }
  }

  const id = username || userId || `session_${sessionId.slice(0, 8)}`;
  return {
    id,
    username: username || id,
    screenName: username || id,
    userId,
    secUserId: "",
    email,
    recoveryEmail,
    sessionId,
    ttTargetIdc,
    storeCountryCode,
    uidTt,
    odinTt,
    sidUcpV1,
    ttwid,
    cookie: cookiePart,
    expiresAt,
    enabled: true,
    status: "unverified",
    lastVerifiedAt: null,
  };
}

/**
 * Verify a TikTok session account against TikTok's web passport account info endpoint.
 */
export async function verifyTikTokSession(account) {
  if (!account?.sessionId) {
    return { ok: false, status: "invalid", error: "Thiếu sessionId" };
  }
  const cookieHeader = account.cookie && account.cookie.includes("sessionid=")
    ? account.cookie
    : [
        `sessionid=${account.sessionId}`,
        `sessionid_ss=${account.sessionId}`,
        `sid_tt=${account.sessionId}`,
        `tt-target-idc=${account.ttTargetIdc || "alisg"}`,
        `store-idc=${account.ttTargetIdc || "alisg"}`,
        `store-country-code=${account.storeCountryCode || "vn"}`,
        account.uidTt ? `uid_tt=${account.uidTt}` : "",
        account.uidTt ? `uid_tt_ss=${account.uidTt}` : "",
        account.sidUcpV1 ? `sid_ucp_v1=${account.sidUcpV1}` : "",
        account.sidUcpV1 ? `ssid_ucp_v1=${account.sidUcpV1}` : "",
        account.odinTt ? `odin_tt=${account.odinTt}` : "",
        account.ttwid ? `ttwid=${account.ttwid}` : "",
      ]
        .filter(Boolean)
        .join("; ");

  try {
    const res = await fetch(
      "https://www.tiktok.com/passport/web/account/info/?aid=1459&app_language=vi-VN&app_name=tiktok_web&device_platform=web_pc",
      {
        headers: {
          Cookie: cookieHeader,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Referer: "https://www.tiktok.com/",
          Accept: "application/json, text/plain, */*",
        },
        signal: AbortSignal.timeout(10000),
      },
    );
    const payload = await res.json();
    const info = payload?.data;
    if (payload?.message === "success" && info?.username) {
      return {
        ok: true,
        status: "active",
        userId: String(info.user_id_str || info.user_id || account.userId || ""),
        secUserId: String(info.sec_user_id || account.secUserId || ""),
        username: String(info.username || account.username || ""),
        screenName: String(info.screen_name || account.screenName || info.username || ""),
        avatarUrl: String(info.avatar_url || ""),
        emailMasked: String(info.email || ""),
        verifiedAt: Date.now(),
      };
    }
    return {
      ok: false,
      status: "expired",
      error: info?.description || payload?.message || "Session đã hết hạn hoặc không hợp lệ.",
      verifiedAt: Date.now(),
    };
  } catch (err) {
    return {
      ok: false,
      status: "error",
      error: err?.message || "Không thể kết nối tới TikTok Passport API.",
      verifiedAt: Date.now(),
    };
  }
}

/**
 * Return a safe public representation of a session account (masking raw sessionId and full cookies).
 */
export function maskSessionAccount(acc) {
  if (!acc) return null;
  const sid = String(acc.sessionId || "");
  const maskedSid = sid.length >= 12 ? `${sid.slice(0, 6)}…${sid.slice(-4)}` : "***";
  return {
    id: acc.id,
    username: acc.username,
    screenName: acc.screenName || acc.username,
    userId: acc.userId || "",
    email: acc.email || "",
    ttTargetIdc: acc.ttTargetIdc || "alisg",
    storeCountryCode: acc.storeCountryCode || "vn",
    sessionIdMasked: maskedSid,
    expiresAt: acc.expiresAt || null,
    enabled: acc.enabled !== false,
    status: acc.status || "unverified",
    lastVerifiedAt: acc.lastVerifiedAt || null,
    error: acc.error || "",
  };
}

export class TikTokSource {
  constructor(engine, changed, initialSessions = null) {
    this.engine = engine;
    this.changed = changed;
    this.conn = null;
    this.giftCatalog = new Map();
    this.generation = 0;
    this.timer = null;
    this.sessionConfig = {
      mode: "auto",
      accounts: [],
    };
    if (initialSessions) {
      this.setSessionConfig(initialSessions);
    }
    this.state = {
      status: "disconnected",
      username: "",
      roomId: "",
      error: "",
      attempt: 0,
      sessionMode: this.sessionConfig.mode,
      sessionAccount: "",
      sessionIdc: "",
    };
  }

  setSessionConfig(config) {
    if (!config || typeof config !== "object") return;
    const accounts = Array.isArray(config.accounts)
      ? config.accounts.filter((a) => a && typeof a.sessionId === "string" && a.sessionId.trim())
      : [];
    const mode = String(config.mode || "auto").trim() || "auto";
    this.sessionConfig = {
      mode,
      accounts,
      updatedAt: config.updatedAt || Date.now(),
    };
    if (this.state) {
      this.state.sessionMode = mode;
      const preview = this.pickSession(this.state.attempt || 0);
      if (this.state.status === "disconnected") {
        this.state.sessionAccount = preview ? preview.username : "";
        this.state.sessionIdc = preview ? preview.ttTargetIdc || "alisg" : "";
      }
    }
  }

  getPublicSessionState() {
    const active = this.pickSession(this.state?.attempt || 0);
    return {
      mode: this.sessionConfig.mode,
      activeUsername: this.state?.sessionAccount || active?.username || "",
      activeIdc: this.state?.sessionIdc || active?.ttTargetIdc || "",
      accounts: this.sessionConfig.accounts.map(maskSessionAccount).filter(Boolean),
    };
  }

  pickSession(attempt = 0) {
    const mode = this.sessionConfig.mode || "auto";
    if (mode === "none") return null;
    const enabled = this.sessionConfig.accounts.filter(
      (a) => a && a.enabled !== false && a.sessionId && a.status !== "expired",
    );
    if (!enabled.length) return null;
    if (mode !== "auto") {
      const exact = this.sessionConfig.accounts.find(
        (a) => a && (a.id === mode || a.username === mode) && a.sessionId,
      );
      if (exact) return exact;
    }
    const idx = Math.max(0, attempt) % enabled.length;
    return enabled[idx] || enabled[0];
  }

  async verifySessions(targetId = "") {
    const results = [];
    for (const acc of this.sessionConfig.accounts) {
      if (targetId && acc.id !== targetId && acc.username !== targetId) continue;
      const check = await verifyTikTokSession(acc);
      acc.status = check.status;
      acc.lastVerifiedAt = check.verifiedAt || Date.now();
      acc.error = check.error || "";
      if (check.ok) {
        if (check.username) acc.username = check.username;
        if (check.screenName) acc.screenName = check.screenName;
        if (check.userId) acc.userId = check.userId;
        if (check.secUserId) acc.secUserId = check.secUserId;
      }
      results.push({ id: acc.id, username: acc.username, ...check });
    }
    this.sessionConfig.updatedAt = Date.now();
    this.changed();
    return results;
  }

  async connect(username) {
    username = String(username || "")
      .trim()
      .replace(/^@/, "");
    if (!/^[\w.]{2,50}$/.test(username))
      throw new Error("Nhập @username TikTok, không nhập đường link.");
    this.disconnect();
    this.state.username = username;
    this.state.attempt = 0;
    this.open(this.generation);
  }
  async open(generation) {
    if (generation !== this.generation) return;
    const chosenSession = this.pickSession(this.state.attempt);
    this.state.status = "connecting";
    this.state.error = "";
    this.state.sessionMode = this.sessionConfig.mode;
    this.state.sessionAccount = chosenSession ? chosenSession.username : "";
    this.state.sessionIdc = chosenSession ? chosenSession.ttTargetIdc || "alisg" : "";
    this.changed();
    try {
      const { TikTokLiveConnection, WebcastEvent, ControlEvent } =
        await import("tiktok-live-connector");
      if (generation !== this.generation) return;
      const connOptions = {
        processInitialData: false,
        // `enableExtendedGiftInfo: true` triggers EulerStream's signed gift-list route
        // which requires a paid Euler Business plan; Webcast v3 gift events already carry `gift.diamondCount`.
        enableExtendedGiftInfo: false,
      };
      if (chosenSession?.sessionId) {
        connOptions.session = {
          cookie: {
            type: "cookie",
            value: {
              sessionId: chosenSession.sessionId,
              ttTargetIdc: chosenSession.ttTargetIdc || "alisg",
            },
          },
        };
      }
      const conn = new TikTokLiveConnection(this.state.username, connOptions);
      if (chosenSession && conn.webClient?.cookieJar?.store) {
        const jarStore = conn.webClient.cookieJar.store;
        if (chosenSession.uidTt) {
          jarStore.uid_tt = chosenSession.uidTt;
          jarStore.uid_tt_ss = chosenSession.uidTt;
        }
        if (chosenSession.sidUcpV1) {
          jarStore.sid_ucp_v1 = chosenSession.sidUcpV1;
          jarStore.ssid_ucp_v1 = chosenSession.sidUcpV1;
        }
        if (chosenSession.odinTt) jarStore.odin_tt = chosenSession.odinTt;
        if (chosenSession.ttwid) jarStore.ttwid = chosenSession.ttwid;
        if (chosenSession.ttTargetIdc) jarStore["store-idc"] = chosenSession.ttTargetIdc;
        if (chosenSession.storeCountryCode) jarStore["store-country-code"] = chosenSession.storeCountryCode;
      }
      this.conn = conn;
      const valid = () => generation === this.generation && this.conn === conn;
      const retry = (error) => {
        if (!valid()) return;
        this.conn = null;
        try {
          conn.disconnect();
        } catch {}
        this.state.status = "retrying";
        this.state.error = String(
          error?.message || error || "Mất kết nối",
        ).slice(0, 400);
        const delay = Math.min(30, 2 ** Math.min(5, ++this.state.attempt));
        const nextSession = this.pickSession(this.state.attempt);
        const sessionNote = nextSession ? ` (chuyển qua Session @${nextSession.username})` : "";
        this.engine.log(
          "warn",
          `TikTok: ${this.state.error}. Thử lại sau ${delay} giây${sessionNote}.`,
        );
        this.changed();
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.open(generation), delay * 1000);
      };
      conn.on(ControlEvent.ERROR, (e) => {
        if (valid()) {
          this.state.error = String(e?.message || e?.info || e).slice(0, 400);
          this.changed();
        }
      });
      conn.on(ControlEvent.DISCONNECTED, () =>
        retry("Phòng đã ngắt hoặc kết thúc LIVE"),
      );
      for (const [event, kind] of [
        [WebcastEvent.CHAT, "comment"],
        [WebcastEvent.GIFT, "gift"],
        [WebcastEvent.LIKE, "like"],
        [WebcastEvent.FOLLOW, "follow"],
        [WebcastEvent.SHARE, "share"],
        ...(WebcastEvent.MEMBER ? [[WebcastEvent.MEMBER, "join"]] : []),
      ]) {
        conn.on(event, (data) => {
          if (!valid()) return;
          const payload = kind === "gift" ? enrichGiftPayload(data, this.giftCatalog) : data;
          this.engine.ingest(normalizeEvent(kind, payload, this.state.roomId));
        });
      }
      const hydrateGifts = () => {
        if (process.env.TIKTOK_EXTENDED_GIFT_INFO !== "true" || typeof conn.fetchAvailableGifts !== "function") return;
        Promise.resolve(conn.fetchAvailableGifts())
          .then((gifts) => {
            if (!valid() || !Array.isArray(gifts)) return;
            for (const item of gifts) {
              const id = String(item?.id || item?.giftId || "");
              const diamondCount = Number(item?.diamond_count ?? item?.diamondCount ?? 0);
              if (!id || !diamondCount) continue;
              this.giftCatalog.set(id, {
                name: item?.name || "",
                diamondCount,
                giftType: Number(item?.type ?? item?.giftType ?? 0),
              });
            }
          })
          .catch(() => {});
      };
      try {
        const result = await conn.connect();
        if (!valid()) {
          conn.disconnect();
          return;
        }
        this.state = {
          ...this.state,
          status: "connected",
          roomId: String(result?.roomId || conn.roomId || ""),
          error: "",
          attempt: 0,
        };
        this.engine.beginSession(this.state.roomId);
        hydrateGifts();
        const viaMsg = chosenSession
          ? ` (qua Session @${chosenSession.username} · IDC ${chosenSession.ttTargetIdc || "alisg"})`
          : "";
        this.engine.log(
          "info",
          `Đã nhận sự kiện phòng @${this.state.username}${viaMsg}.`,
        );
        this.changed();
      } catch (error) {
        retry(error);
      }
    } catch (error) {
      if (generation !== this.generation) return;
      this.state.status = "error";
      this.state.error = `Không tải được connector: ${error.message}. Chạy npm ci rồi mở lại.`;
      this.changed();
    }
  }
  disconnect() {
    this.generation++;
    clearTimeout(this.timer);
    this.timer = null;
    const conn = this.conn;
    this.conn = null;
    try {
      conn?.disconnect();
    } catch {}
    const preview = this.pickSession(0);
    this.state = {
      ...this.state,
      status: "disconnected",
      error: "",
      roomId: "",
      attempt: 0,
      sessionMode: this.sessionConfig.mode,
      sessionAccount: preview ? preview.username : "",
      sessionIdc: preview ? preview.ttTargetIdc || "alisg" : "",
    };
    this.changed();
  }
}
