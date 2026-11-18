/**
 * Ultra-Low-CPU 2.5D Sacred Temple Canvas Particle Engine
 * Tối ưu hóa tối đa cho OBS / TikTok Live treo máy 24/7:
 * - Giới hạn đúng 30 FPS (tiết kiệm 50–75% CPU/GPU so với 60/120Hz)
 * - Tự động tạm dừng khi tab ẩn (document.hidden)
 * - Pre-render toàn bộ Khói hương, Hạt vàng, Cánh hoa sen ra Offscreen Canvas 1 lần duy nhất
 *   (KHÔNG gọi createRadialGradient, bezierCurveTo hay shadowBlur trong vòng lặp frame!)
 */
class TempleParticleEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    this.width = 1080;
    this.height = 1920;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.smokeParticles = [];
    this.lotusPetals = [];
    this.goldSparks = [];
    this.soundWaves = [];
    this.floatingTexts = [];
    this.burstParticles = [];

    this.incenseTips = [];
    this.smokeDensity = 1.0;
    this.time = 0;
    this.lastFrameTime = 0;
    this.frameInterval = 1000 / 30; // Cố định 30 FPS siêu nhẹ CPU

    this.buildOffscreenSprites();
    this.initAmbientParticles();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  buildOffscreenSprites() {
    // 1. Pre-render Smoke Puff Sprite (64x64)
    this.smokeSprite = document.createElement('canvas');
    this.smokeSprite.width = 64;
    this.smokeSprite.height = 64;
    const sctx = this.smokeSprite.getContext('2d');
    const sgrad = sctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    sgrad.addColorStop(0, 'rgba(255, 246, 218, 0.85)');
    sgrad.addColorStop(0.5, 'rgba(238, 222, 185, 0.4)');
    sgrad.addColorStop(1, 'rgba(220, 200, 160, 0)');
    sctx.fillStyle = sgrad;
    sctx.beginPath();
    sctx.arc(32, 32, 30, 0, Math.PI * 2);
    sctx.fill();

    // 2. Pre-render Gold Spark Sprite (16x16)
    this.sparkSprite = document.createElement('canvas');
    this.sparkSprite.width = 16;
    this.sparkSprite.height = 16;
    const gctx = this.sparkSprite.getContext('2d');
    const ggrad = gctx.createRadialGradient(8, 8, 1, 8, 8, 7);
    ggrad.addColorStop(0, 'rgba(255, 245, 190, 1)');
    ggrad.addColorStop(0.5, 'rgba(255, 210, 90, 0.6)');
    ggrad.addColorStop(1, 'rgba(255, 190, 50, 0)');
    gctx.fillStyle = ggrad;
    gctx.beginPath();
    gctx.arc(8, 8, 7, 0, Math.PI * 2);
    gctx.fill();

    // 3. Pre-render 3D Crypto Coin Sprites: Bitcoin (₿), Ethereum (Ξ), Gold Coin ($) (40x40)
    this.btcCoinSprite = this.createCoinSprite('btc');
    this.ethCoinSprite = this.createCoinSprite('eth');
    this.goldCoinSprite = this.createCoinSprite('gold');

    // 4. Pre-render 3D Depth Drop Shadow Sprite (40x20)
    this.coinShadowSprite = document.createElement('canvas');
    this.coinShadowSprite.width = 40;
    this.coinShadowSprite.height = 20;
    const shCtx = this.coinShadowSprite.getContext('2d');
    const shGrad = shCtx.createRadialGradient(20, 10, 2, 20, 10, 18);
    shGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    shGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
    shGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    shCtx.fillStyle = shGrad;
    shCtx.beginPath();
    shCtx.ellipse(20, 10, 18, 9, 0, 0, Math.PI * 2);
    shCtx.fill();

    // 5. Pre-render 4-Point Golden Diamond Sparkle Twinkle Sprite (32x32)
    this.twinkleSprite = document.createElement('canvas');
    this.twinkleSprite.width = 32;
    this.twinkleSprite.height = 32;
    const twCtx = this.twinkleSprite.getContext('2d');
    twCtx.translate(16, 16);

    // Corona glow
    const twGlow = twCtx.createRadialGradient(0, 0, 1, 0, 0, 14);
    twGlow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    twGlow.addColorStop(0.3, 'rgba(254, 240, 138, 0.7)');
    twGlow.addColorStop(0.7, 'rgba(245, 158, 11, 0.25)');
    twGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
    twCtx.fillStyle = twGlow;
    twCtx.beginPath();
    twCtx.arc(0, 0, 14, 0, Math.PI * 2);
    twCtx.fill();

    // 4-point diamond rays
    twCtx.fillStyle = '#ffffff';
    twCtx.beginPath();
    twCtx.moveTo(0, -14);
    twCtx.quadraticCurveTo(0, 0, 14, 0);
    twCtx.quadraticCurveTo(0, 0, 0, 14);
    twCtx.quadraticCurveTo(0, 0, -14, 0);
    twCtx.quadraticCurveTo(0, 0, 0, -14);
    twCtx.fill();

    // Central white sparkle core
    twCtx.fillStyle = '#ffffff';
    twCtx.beginPath();
    twCtx.arc(0, 0, 2.5, 0, Math.PI * 2);
    twCtx.fill();
  }

  createCoinSprite(type = 'btc') {
    const c = document.createElement('canvas');
    c.width = 40;
    c.height = 40;
    const ctx = c.getContext('2d');
    const r = 18;
    ctx.translate(20, 20);

    if (type === 'btc') {
      // Golden Bitcoin Coin (₿) with 3D Bevel & Relief Rim
      // 1. Outer bevel shadow & rim
      const bevel = ctx.createLinearGradient(-r, -r, r, r);
      bevel.addColorStop(0, '#fef08a');
      bevel.addColorStop(0.3, '#f59e0b');
      bevel.addColorStop(0.8, '#78350f');
      bevel.addColorStop(1, '#451a03');
      ctx.fillStyle = bevel;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // 2. Milled edge notches (subtle 3D ridges)
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.45)';
      ctx.lineWidth = 1;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (r - 1.5), Math.sin(a) * (r - 1.5));
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.stroke();
      }

      // 3. Inner face with metallic specular gradient
      const grad = ctx.createRadialGradient(-4, -5, 2, 0, 0, r - 2.5);
      grad.addColorStop(0, '#fffbeb');
      grad.addColorStop(0.2, '#fef08a');
      grad.addColorStop(0.65, '#f59e0b');
      grad.addColorStop(1, '#92400e');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r - 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Inner golden ring
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, r - 4.5, 0, Math.PI * 2);
      ctx.stroke();

      // Embossed Bitcoin Symbol ₿
      ctx.fillStyle = 'rgba(69, 26, 3, 0.45)';
      ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('₿', 0.8, 1.8);

      ctx.fillStyle = '#ffffff';
      ctx.fillText('₿', 0, 0.5);
    } else if (type === 'eth') {
      // Violet / Indigo Ethereum Crystal Coin (Ξ) with Metallic Diamond Luster
      const bevel = ctx.createLinearGradient(-r, -r, r, r);
      bevel.addColorStop(0, '#e0e7ff');
      bevel.addColorStop(0.3, '#818cf8');
      bevel.addColorStop(0.8, '#3730a3');
      bevel.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = bevel;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Milled edge
      ctx.strokeStyle = 'rgba(30, 27, 75, 0.45)';
      ctx.lineWidth = 1;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (r - 1.5), Math.sin(a) * (r - 1.5));
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.stroke();
      }

      const grad = ctx.createRadialGradient(-4, -5, 2, 0, 0, r - 2.5);
      grad.addColorStop(0, '#f5f3ff');
      grad.addColorStop(0.2, '#c7d2fe');
      grad.addColorStop(0.65, '#6366f1');
      grad.addColorStop(1, '#312e81');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r - 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Inner silver ring
      ctx.strokeStyle = 'rgba(224, 231, 255, 0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, r - 4.5, 0, Math.PI * 2);
      ctx.stroke();

      // Embossed Ethereum Symbol Ξ
      ctx.fillStyle = 'rgba(30, 27, 75, 0.45)';
      ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Ξ', 0.8, 1.2);

      ctx.fillStyle = '#ffffff';
      ctx.fillText('Ξ', 0, 0);
    } else {
      // Imperial Bullion Gold Coin ($) with Antique Temple Ring
      const bevel = ctx.createLinearGradient(-r, -r, r, r);
      bevel.addColorStop(0, '#fffbeb');
      bevel.addColorStop(0.3, '#f59e0b');
      bevel.addColorStop(0.8, '#92400e');
      bevel.addColorStop(1, '#451a03');
      ctx.fillStyle = bevel;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Milled edge
      ctx.strokeStyle = 'rgba(120, 53, 15, 0.45)';
      ctx.lineWidth = 1;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (r - 1.5), Math.sin(a) * (r - 1.5));
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.stroke();
      }

      const grad = ctx.createRadialGradient(-4, -5, 2, 0, 0, r - 2.5);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.2, '#fde68a');
      grad.addColorStop(0.65, '#d97706');
      grad.addColorStop(1, '#78350f');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, r - 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Inner ring
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, r - 4.5, 0, Math.PI * 2);
      ctx.stroke();

      // Embossed Dollar Symbol $
      ctx.fillStyle = 'rgba(69, 26, 3, 0.45)';
      ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0.8, 1.8);

      ctx.fillStyle = '#fef3c7';
      ctx.fillText('$', 0, 0.5);
    }
    return c;
  }

  createPetalSprite(fillStyle) {
    return this.btcCoinSprite;
  }

  initAmbientParticles() {
    for (let i = 0; i < 20; i++) {
      this.goldSparks.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 8 + Math.random() * 8,
        vy: -(0.6 + Math.random() * 1.1),
        vx: (Math.random() - 0.5) * 0.5,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.35 + Math.random() * 0.55
      });
    }

    // 14 Crypto Coins (BTC, ETH, Gold $) lấp lánh rơi trên sàn Xóm Trade
    for (let i = 0; i < 14; i++) {
      this.lotusPetals.push(this.createLotusPetal(true));
    }
  }

  createLotusPetal(randomY = false) {
    const types = ['btc', 'btc', 'eth', 'gold'];
    const coinType = types[Math.floor(Math.random() * types.length)];
    const scale = 0.72 + Math.random() * 0.48; // Chiều sâu: coin to ở gần, coin nhỏ ở xa
    return {
      x: Math.random() * this.width,
      y: randomY ? Math.random() * this.height : -45 - Math.random() * 150,
      scale,
      vy: (1.5 + Math.random() * 1.8) * Math.sqrt(scale), // Coin nặng/to rơi nhanh hơn tự nhiên
      terminalVy: 2.2 + scale * 1.2,
      vx: (Math.random() - 0.5) * 0.6,
      swayAmp: 0.9 + Math.random() * 1.5,
      swaySpeed: 1.2 + Math.random() * 1.1,
      swayPhase: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.05,
      pitch: Math.random() * Math.PI * 2,
      vpitch: 0.035 + Math.random() * 0.045,
      twinklePhase: Math.random() * Math.PI * 2,
      coinType
    };
  }

  setIncenseTips(tips) {
    this.incenseTips = Array.isArray(tips) ? tips : [];
  }

  spawnSmokeFromTips() {
    if (!this.incenseTips.length || this.smokeParticles.length >= 22) return;
    if (Math.random() > 0.45 * this.smokeDensity) return;

    const tip = this.incenseTips[Math.floor(Math.random() * this.incenseTips.length)];
    this.smokeParticles.push({
      x: tip.x + (Math.random() - 0.5) * 6,
      y: tip.y,
      vx: (Math.random() - 0.5) * 0.25,
      vy: -(2.4 + Math.random() * 1.0),
      radius: 8 + Math.random() * 5,
      maxRadius: 28 + Math.random() * 16,
      alpha: 0.24 + Math.random() * 0.1,
      age: 0,
      maxAge: 68 + Math.random() * 25,
      seed: Math.random() * 50
    });
  }

  spawnIncenseBurst(x = 540, y = 890) {
    for (let i = 0; i < 18; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
      const speed = 2.5 + Math.random() * 5.0;
      this.burstParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 2.5 + Math.random() * 3.0,
        alpha: 1,
        decay: 0.035 + Math.random() * 0.02,
        color: i % 2 === 0 ? '#ffdf85' : '#ff9e44'
      });
    }
  }

  spawnBellWave(x = 540, y = 510, count = 2) {
    for (let i = 0; i < Math.min(count, 2); i++) {
      this.soundWaves.push({
        x,
        y,
        radius: 34 + i * 24,
        maxRadius: 420 + i * 50,
        alpha: 0.72 - i * 0.16,
        lineWidth: 3 - i * 0.6
      });
    }
  }

  spawnFloatingMerit(text = '+1 Công Đức', x = 540, y = 940, color = '#ffe082') {
    if (this.floatingTexts.length > 8) this.floatingTexts.shift();
    this.floatingTexts.push({
      text,
      x: x + (Math.random() - 0.5) * 36,
      y,
      vy: -3.2,
      alpha: 1.0,
      color
    });
  }

  spawnHeartFountain(x = 540, y = 1450, count = 28) {
    const emojis = ['💖', '❤️', '💕', '💓', '✨', '💐', '🌸'];
    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * 600;
      this.floatingTexts.push({
        text: emojis[Math.floor(Math.random() * emojis.length)],
        x: x + offsetX,
        y: y + (Math.random() - 0.5) * 120,
        vy: -(4.5 + Math.random() * 5.0),
        alpha: 1.0,
        color: '#ff4d6d'
      });
    }
  }

  spawnComedyBursts(kind = 'chicken', x = 540, y = 1600, count = 24) {
    let emojis = ['🐔', '🐓', '🪶', '💨', '🐕'];
    let color = '#fbbf24';
    if (kind === 'wife' || kind === 'chase') {
      emojis = ['🧹', '🩴', '💢', '😭', '💨', '⚡'];
      color = '#ef4444';
    } else if (kind === 'tea' || kind === 'debt') {
      emojis = ['🍵', '📜', '🩴', '💥', '🏃‍♂️', '💨'];
      color = '#10b981';
    } else if (kind === 'modem' || kind === 'wifi') {
      emojis = ['🔌', '⚡', '📶', '🔥', '😱', '💨'];
      color = '#38bdf8';
    }
    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * 800;
      this.floatingTexts.push({
        text: emojis[Math.floor(Math.random() * emojis.length)],
        x: x + offsetX,
        y: y + (Math.random() - 0.5) * 80,
        vy: -(3.5 + Math.random() * 4.5),
        alpha: 1.0,
        color
      });
    }
  }

  spawnGrandCeremonyRain() {
    for (let i = 0; i < 16; i++) {
      this.lotusPetals.push(this.createLotusPetal(false));
    }
    for (let i = 0; i < 36; i++) {
      const angle = (Math.PI * 2 * i) / 36;
      const speed = 3.5 + Math.random() * 7.5;
      this.burstParticles.push({
        x: 540,
        y: 510,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 3 + Math.random() * 3.5,
        alpha: 1,
        decay: 0.022 + Math.random() * 0.015,
        color: i % 3 === 0 ? '#fff3b0' : i % 3 === 1 ? '#ffb703' : '#ff7aa2'
      });
    }
  }

  animate(timestamp) {
    requestAnimationFrame(this.animate);

    if (document.hidden) return;
    if (timestamp - this.lastFrameTime < this.frameInterval) return;
    this.lastFrameTime = timestamp;

    this.time += 0.035;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Hạt bụi vàng (dùng drawImage từ sparkSprite đã pre-render)
    for (let i = 0; i < this.goldSparks.length; i++) {
      const sp = this.goldSparks[i];
      sp.y += sp.vy;
      sp.x += sp.vx + Math.sin(this.time + sp.phase) * 0.4;
      if (sp.y < -20) {
        sp.y = this.height + 15;
        sp.x = Math.random() * this.width;
      }
      ctx.globalAlpha = sp.alpha * (0.55 + 0.45 * Math.sin(this.time * 2.0 + sp.phase));
      ctx.drawImage(this.sparkSprite, sp.x - sp.size * 0.5, sp.y - sp.size * 0.5, sp.size, sp.size);
    }

    // 2. Khói tâm hương (dùng drawImage từ smokeSprite đã pre-render)
    this.spawnSmokeFromTips();
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const p = this.smokeParticles[i];
      p.age += 1;
      if (p.age >= p.maxAge || p.y < 495) {
        this.smokeParticles.splice(i, 1);
        continue;
      }
      const progress = p.age / p.maxAge;
      const curl = Math.sin(this.time * 1.5 + p.seed + p.y * 0.014) * 0.55;
      p.x += p.vx + curl * (0.3 + progress * 0.5);
      p.y += p.vy;

      const r = p.radius + (p.maxRadius - p.radius) * progress;
      const fade = Math.sin(progress * Math.PI) * p.alpha * (1 - progress * 0.6);
      ctx.globalAlpha = Math.max(0, fade);
      ctx.drawImage(this.smokeSprite, p.x - r, p.y - r, r * 2, r * 2);
    }

    // 3. Tiền xu Crypto (BTC, ETH, Gold $) lấp lánh chao nghiêng rơi 3D trong phòng livestream
    for (let i = this.lotusPetals.length - 1; i >= 0; i--) {
      const coin = this.lotusPetals[i];
      // Vận tốc rơi tự nhiên có lực cản không khí & vận tốc giới hạn (terminal velocity)
      coin.vy += (coin.terminalVy - coin.vy) * 0.05;
      coin.y += coin.vy;
      coin.swayPhase += coin.swaySpeed * 0.035;
      coin.x += coin.vx + Math.sin(coin.swayPhase) * coin.swayAmp;
      coin.rot += coin.vrot;
      coin.pitch += coin.vpitch;

      if (coin.y > this.height + 45) {
        if (this.lotusPetals.length > 14) {
          this.lotusPetals.splice(i, 1);
          continue;
        } else {
          Object.assign(coin, this.createLotusPetal(false));
        }
      }

      const sz = 38 * coin.scale;
      const flipScale = Math.cos(coin.rot * 1.5);
      const absFlip = Math.abs(flipScale) < 0.12 ? 0.12 : Math.abs(flipScale);
      const pitchScale = Math.cos(coin.pitch) * 0.2 + 0.8;

      // 1. Độ đổ bóng chiều sâu 3D nhẹ bên dưới đồng xu (Pre-rendered shadow sprite)
      const shadowDist = 9 * coin.scale;
      ctx.globalAlpha = 0.35 * coin.scale;
      ctx.drawImage(
        this.coinShadowSprite,
        coin.x - sz * 0.5 * absFlip,
        coin.y + shadowDist - sz * 0.25,
        sz * absFlip,
        sz * 0.5
      );

      // 2. Đồng xu 3D lật chao nghiêng quanh các trục
      ctx.save();
      ctx.translate(coin.x, coin.y);
      ctx.rotate(Math.sin(coin.swayPhase) * 0.16);
      ctx.scale(flipScale < 0 ? -absFlip : absFlip, pitchScale);
      ctx.globalAlpha = 0.96;

      const sprite = coin.coinType === 'btc' ? this.btcCoinSprite : (coin.coinType === 'eth' ? this.ethCoinSprite : this.goldCoinSprite);
      ctx.drawImage(
        sprite,
        -sz * 0.5,
        -sz * 0.5,
        sz,
        sz
      );
      ctx.restore();

      // 3. Hiệu ứng lấp lánh (Sparkle Twinkle) khi mặt đồng xu bắt ánh sáng
      const twinkleCycle = Math.sin(this.time * 4.2 + coin.twinklePhase);
      if (absFlip > 0.62 && twinkleCycle > 0.32) {
        const twAlpha = (twinkleCycle - 0.32) / 0.68;
        ctx.globalAlpha = Math.min(1, twAlpha * 1.15);
        const twSz = (20 + twAlpha * 14) * coin.scale;
        const twX = coin.x + (flipScale > 0 ? 9 : -9) * coin.scale;
        const twY = coin.y - 9 * coin.scale;
        ctx.drawImage(this.twinkleSprite, twX - twSz * 0.5, twY - twSz * 0.5, twSz, twSz);
      }
    }

    // 4. Sóng âm Đại Hồng Chung
    for (let i = this.soundWaves.length - 1; i >= 0; i--) {
      const w = this.soundWaves[i];
      w.radius += 10.5;
      w.alpha *= 0.94;
      if (w.radius >= w.maxRadius || w.alpha < 0.03) {
        this.soundWaves.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = w.alpha;
      ctx.strokeStyle = '#ffd666';
      ctx.lineWidth = w.lineWidth;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. Hạt pháo hoa sen
    for (let i = this.burstParticles.length - 1; i >= 0; i--) {
      const b = this.burstParticles[i];
      b.x += b.vx;
      b.y += b.vy;
      b.vy += 0.08;
      b.alpha -= b.decay;
      if (b.alpha <= 0) {
        this.burstParticles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.max(0, b.alpha);
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Chữ +Công Đức bay lên (dùng strokeText thay vì shadowBlur tốn CPU)
    if (this.floatingTexts.length > 0) {
      ctx.font = '800 27px "Be Vietnam Pro", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(15, 4, 2, 0.9)';
      for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
        const ft = this.floatingTexts[i];
        ft.y += ft.vy;
        ft.alpha -= 0.032;
        if (ft.alpha <= 0) {
          this.floatingTexts.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
      }
    }

    ctx.globalAlpha = 1;
  }
}

window.TempleParticleEngine = TempleParticleEngine;
export { TempleParticleEngine };
