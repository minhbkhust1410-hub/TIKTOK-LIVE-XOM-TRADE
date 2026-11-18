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

export class TikTokSource {
  constructor(engine, changed) {
    this.engine = engine;
    this.changed = changed;
    this.conn = null;
    this.giftCatalog = new Map();
    this.generation = 0;
    this.timer = null;
    this.state = {
      status: "disconnected",
      username: "",
      roomId: "",
      error: "",
      attempt: 0,
    };
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
    this.state.status = "connecting";
    this.state.error = "";
    this.changed();
    try {
      const { TikTokLiveConnection, WebcastEvent, ControlEvent } =
        await import("tiktok-live-connector");
      if (generation !== this.generation) return;
      const conn = new TikTokLiveConnection(this.state.username, {
        processInitialData: false,
        enableExtendedGiftInfo: true,
      });
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
        this.engine.log(
          "warn",
          `TikTok: ${this.state.error}. Thử lại sau ${delay} giây.`,
        );
        this.changed();
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.open(generation), delay * 1000);
      };
      conn.on(ControlEvent.ERROR, (e) => {
        if (valid()) {
          this.state.error = String(e?.message || e).slice(0, 400);
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
        ...(WebcastEvent.MEMBER ? [[WebcastEvent.MEMBER,"join"]] : []),
      ]) {
        conn.on(event, (data) => {
          if (!valid()) return;
          const payload = kind === "gift" ? enrichGiftPayload(data, this.giftCatalog) : data;
          this.engine.ingest(normalizeEvent(kind, payload, this.state.roomId));
        });
      }
      const hydrateGifts = () => {
        if (typeof conn.fetchAvailableGifts !== "function") return;
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
        this.engine.log(
          "info",
          `Đã nhận sự kiện phòng @${this.state.username}.`,
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
    this.state = {
      ...this.state,
      status: "disconnected",
      error: "",
      roomId: "",
      attempt: 0,
    };
    this.changed();
  }
}
