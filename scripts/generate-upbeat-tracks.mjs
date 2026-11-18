import fs from 'node:fs';
import path from 'node:path';

const SAMPLE_RATE = 44100;

function createWavHeader(numSamples, numChannels = 2, sampleRate = 44100) {
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // subchunk1 size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bytesPerSample * 8, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer;
}

// Frequencies for notes
const NOTE_FREQ = {
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
  C6: 1046.50
};

// Instrument synthesis generators
function generateTrack1_XomTradeRonRang(durationSec = 30) {
  const bpm = 124;
  const beatSec = 60 / bpm;
  const totalSamples = Math.floor(durationSec * SAMPLE_RATE);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  // Chords: C - Am - F - G (I - vi - IV - V in C major)
  const chordProg = [
    { root: NOTE_FREQ.C3, chord: [NOTE_FREQ.C4, NOTE_FREQ.E4, NOTE_FREQ.G4] },
    { root: NOTE_FREQ.A2, chord: [NOTE_FREQ.A3, NOTE_FREQ.C4, NOTE_FREQ.E4] },
    { root: NOTE_FREQ.F2, chord: [NOTE_FREQ.F3, NOTE_FREQ.A3, NOTE_FREQ.C4] },
    { root: NOTE_FREQ.G2, chord: [NOTE_FREQ.G3, NOTE_FREQ.B3, NOTE_FREQ.D4] }
  ];

  // Upbeat melody motifs
  const melodyNotes = [
    NOTE_FREQ.E5, NOTE_FREQ.G5, NOTE_FREQ.A5, NOTE_FREQ.G5,
    NOTE_FREQ.E5, NOTE_FREQ.D5, NOTE_FREQ.C5, NOTE_FREQ.D5,
    NOTE_FREQ.E5, NOTE_FREQ.E5, NOTE_FREQ.G5, NOTE_FREQ.A5,
    NOTE_FREQ.C6, NOTE_FREQ.A5, NOTE_FREQ.G5, NOTE_FREQ.E5
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const beat = t / beatSec;
    const bar = Math.floor(beat / 4);
    const beatInBar = beat % 4;
    const sixteenth = Math.floor(beat * 4) % 16;
    const chordObj = chordProg[bar % chordProg.length];

    let l = 0, r = 0;

    // 1. Upbeat Kick (on every beat 0, 1, 2, 3)
    const beatFraction = beat % 1;
    if (beatFraction < 0.25) {
      const kickT = beatFraction * beatSec;
      const kickFreq = 140 * Math.exp(-kickT * 32) + 45;
      const kickEnv = Math.exp(-kickT * 18);
      const kickSample = Math.sin(2 * Math.PI * kickFreq * kickT) * kickEnv * 0.45;
      l += kickSample;
      r += kickSample;
    }

    // 2. Snappy Snare / Clap on beats 1 and 3 (0-indexed beats 1 and 3)
    const snareBeat = (beat + 3) % 2; // peaks on beats 1 and 3
    if (snareBeat < 0.2) {
      const snareT = snareBeat * beatSec;
      const noise = (Math.random() * 2 - 1) * Math.exp(-snareT * 26);
      const tone = Math.sin(2 * Math.PI * 220 * snareT) * Math.exp(-snareT * 35);
      const snareSample = (noise * 0.7 + tone * 0.3) * 0.35;
      l += snareSample * 0.9;
      r += snareSample * 1.1;
    }

    // 3. Upbeat Hi-hats on 16th notes with groove
    const hatFraction = (beat * 4) % 1;
    if (hatFraction < 0.12) {
      const hatT = hatFraction * (beatSec / 4);
      const accent = (sixteenth % 2 === 1) ? 0.25 : 0.12; // offbeat upbeat accent
      const hatSample = (Math.random() * 2 - 1) * Math.exp(-hatT * 90) * accent;
      l += hatSample * 1.1;
      r += hatSample * 0.9;
    }

    // 4. Bouncy Funk Bassline (playing syncopated 8th notes)
    const bassEighth = (beat * 2) % 1;
    const bassNoteIdx = Math.floor(beat * 2) % 8;
    const bassMult = [1, 1, 1.5, 1, 1, 1.33, 1.5, 1.2][bassNoteIdx];
    const bassFreq = chordObj.root * bassMult;
    const bassT = bassEighth * (beatSec / 2);
    const bassEnv = Math.exp(-bassT * 8);
    // FM synth bass
    const bassMod = Math.sin(2 * Math.PI * bassFreq * 2 * bassT) * 1.5;
    const bassSample = Math.sin(2 * Math.PI * bassFreq * bassT + bassMod) * bassEnv * 0.32;
    l += bassSample;
    r += bassSample;

    // 5. Upbeat Off-beat Ska/Funk Chord Stabs (on the & of every beat: beatFraction 0.5)
    const offbeat = (beat + 0.5) % 1;
    if (offbeat < 0.2) {
      const stabT = offbeat * beatSec;
      const stabEnv = Math.exp(-stabT * 12);
      let chordSample = 0;
      for (const n of chordObj.chord) {
        chordSample += (Math.sin(2 * Math.PI * n * stabT) + 0.3 * Math.sin(2 * Math.PI * n * 2 * stabT));
      }
      chordSample = (chordSample / 3) * stabEnv * 0.22;
      l += chordSample * 1.2;
      r += chordSample * 0.8;
    }

    // 6. Playful Cheerful Lead Melody (Game Hàng Rong vibraphone / bell)
    const melStep = Math.floor(beat * 2) % melodyNotes.length;
    const melFraction = (beat * 2) % 1;
    if (melFraction < 0.45) {
      const melT = melFraction * (beatSec / 2);
      const mFreq = melodyNotes[melStep];
      const melEnv = Math.exp(-melT * 7);
      // Bright chime/vibraphone harmonic bell
      const melSample = (
        Math.sin(2 * Math.PI * mFreq * melT) * 0.6 +
        Math.sin(2 * Math.PI * mFreq * 2 * melT) * 0.3 +
        Math.sin(2 * Math.PI * mFreq * 3 * melT) * 0.15
      ) * melEnv * 0.28;
      l += melSample * 0.85;
      r += melSample * 1.15;
    }

    left[i] = Math.max(-0.95, Math.min(0.95, l));
    right[i] = Math.max(-0.95, Math.min(0.95, r));
  }

  return encodeWav(left, right, totalSamples);
}

function generateTrack2_NenXanhBungNo(durationSec = 30) {
  // 128 BPM Energetic Bull Run
  const bpm = 128;
  const beatSec = 60 / bpm;
  const totalSamples = Math.floor(durationSec * SAMPLE_RATE);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  // Energetic rising chord progression (F - G - Am - C)
  const roots = [NOTE_FREQ.F2, NOTE_FREQ.G2, NOTE_FREQ.A2, NOTE_FREQ.C3];
  const arpeggios = [
    [NOTE_FREQ.F4, NOTE_FREQ.A4, NOTE_FREQ.C5, NOTE_FREQ.E5],
    [NOTE_FREQ.G4, NOTE_FREQ.B4, NOTE_FREQ.D5, NOTE_FREQ.G5],
    [NOTE_FREQ.A4, NOTE_FREQ.C5, NOTE_FREQ.E5, NOTE_FREQ.A5],
    [NOTE_FREQ.C5, NOTE_FREQ.E5, NOTE_FREQ.G5, NOTE_FREQ.C6]
  ];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const beat = t / beatSec;
    const bar = Math.floor(beat / 4);
    const chordIdx = bar % roots.length;
    const root = roots[chordIdx];
    const arp = arpeggios[chordIdx];

    let l = 0, r = 0;

    // 1. Driving Four-on-the-Floor Kick
    const beatFrac = beat % 1;
    if (beatFrac < 0.25) {
      const kT = beatFrac * beatSec;
      const kFreq = 160 * Math.exp(-kT * 36) + 50;
      const kSample = Math.sin(2 * Math.PI * kFreq * kT) * Math.exp(-kT * 20) * 0.5;
      l += kSample;
      r += kSample;
    }

    // 2. Energetic Handclap on 2 and 4
    const clapBeat = (beat + 3) % 2;
    if (clapBeat < 0.2) {
      const cT = clapBeat * beatSec;
      const noise = (Math.random() * 2 - 1) * Math.exp(-cT * 22);
      const clapSample = noise * 0.32;
      l += clapSample * 1.1;
      r += clapSample * 0.9;
    }

    // 3. Fast 16th-note Shaker / Hi-Hat
    const hatFrac = (beat * 4) % 1;
    if (hatFrac < 0.1) {
      const hT = hatFrac * (beatSec / 4);
      const hSample = (Math.random() * 2 - 1) * Math.exp(-hT * 110) * 0.15;
      l += hSample;
      r += hSample;
    }

    // 4. Rolling Euro/Future Bassline
    const bassFrac = (beat * 2) % 1;
    const bT = bassFrac * (beatSec / 2);
    const bEnv = Math.exp(-bT * 9);
    const bSample = (Math.sin(2 * Math.PI * root * bT) * 0.7 + Math.sin(2 * Math.PI * root * 2 * bT) * 0.3) * bEnv * 0.35;
    l += bSample;
    r += bSample;

    // 5. Rising Fast Green Candle Arpeggio (16th notes ascending)
    const arpNoteIdx = Math.floor(beat * 4) % arp.length;
    const arpFrac = (beat * 4) % 1;
    if (arpFrac < 0.22) {
      const aT = arpFrac * (beatSec / 4);
      const aFreq = arp[arpNoteIdx];
      const aEnv = Math.exp(-aT * 14);
      // Sawtooth-like bright synth
      const aSample = (
        Math.sin(2 * Math.PI * aFreq * aT) * 0.5 +
        Math.sin(2 * Math.PI * aFreq * 2 * aT) * 0.3 +
        Math.sin(2 * Math.PI * aFreq * 3 * aT) * 0.2
      ) * aEnv * 0.26;
      // Stereo ping-pong
      const pan = (arpNoteIdx % 2 === 0) ? 0.3 : 1.7;
      l += aSample * (2 - pan);
      r += aSample * pan;
    }

    left[i] = Math.max(-0.95, Math.min(0.95, l));
    right[i] = Math.max(-0.95, Math.min(0.95, r));
  }

  return encodeWav(left, right, totalSamples);
}

function generateTrack3_HangRongPhoThi(durationSec = 30) {
  // 126 BPM Cheerful Retro Game Hàng Rong Chiptune & Street Groove
  const bpm = 126;
  const beatSec = 60 / bpm;
  const totalSamples = Math.floor(durationSec * SAMPLE_RATE);
  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  // Pentatonic playful street melody (G - A - B - D - E)
  const mel = [
    NOTE_FREQ.G4, NOTE_FREQ.A4, NOTE_FREQ.B4, NOTE_FREQ.D5,
    NOTE_FREQ.E5, NOTE_FREQ.D5, NOTE_FREQ.B4, NOTE_FREQ.A4,
    NOTE_FREQ.G4, NOTE_FREQ.E4, NOTE_FREQ.G4, NOTE_FREQ.A4,
    NOTE_FREQ.B4, NOTE_FREQ.D5, NOTE_FREQ.B4, NOTE_FREQ.G4
  ];

  const bassRoots = [NOTE_FREQ.G2, NOTE_FREQ.E2, NOTE_FREQ.C3, NOTE_FREQ.D3];

  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const beat = t / beatSec;
    const bar = Math.floor(beat / 4);
    const root = bassRoots[bar % bassRoots.length];

    let l = 0, r = 0;

    // 1. Playful Bouncy Kick
    const bFrac = beat % 1;
    if (bFrac < 0.22) {
      const kT = bFrac * beatSec;
      const kSample = Math.sin(2 * Math.PI * (130 * Math.exp(-kT * 30) + 50) * kT) * Math.exp(-kT * 18) * 0.42;
      l += kSample;
      r += kSample;
    }

    // 2. Woodblock / Rimshot on beat 2 and 4
    const rimBeat = (beat + 3) % 2;
    if (rimBeat < 0.15) {
      const rT = rimBeat * beatSec;
      const rimSample = Math.sin(2 * Math.PI * 850 * rT) * Math.exp(-rT * 40) * 0.3;
      l += rimSample * 1.1;
      r += rimSample * 0.9;
    }

    // 3. Upbeat Marimba / Steel Drum Melody
    const melStep = Math.floor(beat * 2) % mel.length;
    const mFrac = (beat * 2) % 1;
    if (mFrac < 0.35) {
      const mT = mFrac * (beatSec / 2);
      const freq = mel[melStep];
      const mEnv = Math.exp(-mT * 11);
      const mSample = (
        Math.sin(2 * Math.PI * freq * mT) * 0.6 +
        Math.sin(2 * Math.PI * freq * 2.76 * mT) * 0.3 + // Marimba non-harmonic overtone
        Math.sin(2 * Math.PI * freq * 5.4 * mT) * 0.1
      ) * mEnv * 0.32;
      l += mSample * 1.15;
      r += mSample * 0.85;
    }

    // 4. Bouncy Slap Bass
    const bassStep = (beat * 2) % 1;
    const bT = bassStep * (beatSec / 2);
    const bSample = Math.sin(2 * Math.PI * root * bT) * Math.exp(-bT * 7) * 0.33;
    l += bSample;
    r += bSample;

    left[i] = Math.max(-0.95, Math.min(0.95, l));
    right[i] = Math.max(-0.95, Math.min(0.95, r));
  }

  return encodeWav(left, right, totalSamples);
}

function encodeWav(left, right, totalSamples) {
  const header = createWavHeader(totalSamples, 2, SAMPLE_RATE);
  const data = Buffer.alloc(totalSamples * 4);
  for (let i = 0; i < totalSamples; i++) {
    const sL = Math.max(-32767, Math.min(32767, Math.floor(left[i] * 32767)));
    const sR = Math.max(-32767, Math.min(32767, Math.floor(right[i] * 32767)));
    data.writeInt16LE(sL, i * 4);
    data.writeInt16LE(sR, i * 4 + 2);
  }
  return Buffer.concat([header, data]);
}

console.log('Generating Track 1: Xóm Trade Rộn Ràng (124 BPM)...');
const t1 = generateTrack1_XomTradeRonRang(30);

console.log('Generating Track 2: Nến Xanh Bùng Nổ (128 BPM)...');
const t2 = generateTrack2_NenXanhBungNo(30);

console.log('Generating Track 3: Hàng Rong Phố Thị (126 BPM)...');
const t3 = generateTrack3_HangRongPhoThi(30);

const musicDir = 'c:/Users/Admin/Desktop/LiveRepo/public/assets/music';
const assetsDir = 'c:/Users/Admin/Desktop/LiveRepo/public/assets';

// Save new upbeat tracks
fs.writeFileSync(path.join(musicDir, 'xom-trade-ron-rang.wav'), t1);
fs.writeFileSync(path.join(musicDir, 'nen-xanh-bung-no.wav'), t2);
fs.writeFileSync(path.join(musicDir, 'hang-rong-pho-thi.wav'), t3);

// Replace existing .wav files with these upbeat energetic tracks
// sen-tinh.wav -> Track 1 (Xóm Trade Rộn Ràng)
fs.writeFileSync(path.join(musicDir, 'sen-tinh.wav'), t1);
// may-thien.wav -> Track 2 (Nến Xanh Bùng Nổ)
fs.writeFileSync(path.join(musicDir, 'may-thien.wav'), t2);
// truc-an.wav -> Track 3 (Hàng Rong Phố Thị)
fs.writeFileSync(path.join(musicDir, 'truc-an.wav'), t3);

console.log('All upbeat WAV tracks synthesized and written successfully!');
