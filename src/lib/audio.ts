export type Sfx = 'tap' | 'place' | 'invalid' | 'undo' | 'complete' | 'ui' | 'buy';

type AudioKit = {
  ctx: AudioContext;
  master: GainNode;
  musicLevel: GainNode;
  sfxLevel: GainNode;
};

let kit: AudioKit | null = null;
let musicStarted = false;
let sfxAmt = 0.7;
let musicAmt = 0.28;

function ensure(): AudioKit | null {
  if (typeof window === 'undefined') return null;
  if (kit) return kit;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0.85;
  master.connect(ctx.destination);
  const musicLevel = ctx.createGain();
  musicLevel.gain.value = musicAmt * 0.16;
  musicLevel.connect(master);
  const sfxLevel = ctx.createGain();
  sfxLevel.gain.value = sfxAmt;
  sfxLevel.connect(master);
  kit = { ctx, master, musicLevel, sfxLevel };
  return kit;
}

export function setAudioLevels(sfx: number, music: number): void {
  sfxAmt = Math.max(0, Math.min(1, sfx / 100));
  musicAmt = Math.max(0, Math.min(1, music / 100));
  if (!kit) return;
  kit.sfxLevel.gain.value = sfxAmt;
  kit.musicLevel.gain.value = musicAmt * 0.16;
}

export function unlockAudio(): void {
  const audio = ensure();
  if (!audio) return;
  if (audio.ctx.state === 'suspended') void audio.ctx.resume();
  startMusic(audio);
}

function startMusic(audio: AudioKit): void {
  if (musicStarted) return;
  musicStarted = true;
  const { ctx, musicLevel } = audio;

  const voice = (freq: number, detune: number, gain: number) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    const g = ctx.createGain();
    g.gain.value = gain;
    osc.connect(filter);
    filter.connect(g);
    g.connect(musicLevel);
    osc.start();
  };

  voice(110, -7, 0.45);
  voice(164.81, 9, 0.28);
  voice(220, -4, 0.16);
}

function tone(
  audio: AudioKit,
  freq: number,
  dur: number,
  type: OscillatorType,
  gain: number,
  at = 0,
  slide?: number,
): void {
  const t = audio.ctx.currentTime;
  const osc = audio.ctx.createOscillator();
  const g = audio.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t + at);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + at + dur);
  g.gain.setValueAtTime(0.0001, t + at);
  g.gain.exponentialRampToValueAtTime(gain, t + at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
  osc.connect(g);
  g.connect(audio.sfxLevel);
  osc.start(t + at);
  osc.stop(t + at + dur + 0.03);
}

export function playSfx(kind: Sfx): void {
  const audio = ensure();
  if (!audio || sfxAmt <= 0.001) return;
  if (audio.ctx.state === 'suspended') void audio.ctx.resume();
  switch (kind) {
    case 'tap':
      tone(audio, 880, 0.05, 'sine', 0.11);
      break;
    case 'ui':
      tone(audio, 660, 0.06, 'triangle', 0.09);
      break;
    case 'place':
      tone(audio, 523.25, 0.09, 'sine', 0.15);
      tone(audio, 659.25, 0.1, 'sine', 0.11, 0.05);
      tone(audio, 783.99, 0.14, 'sine', 0.09, 0.1);
      break;
    case 'invalid':
      tone(audio, 170, 0.2, 'square', 0.07, 0, 88);
      break;
    case 'undo': {
      const t = audio.ctx.currentTime;
      const len = Math.floor(audio.ctx.sampleRate * 0.11);
      const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = audio.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = audio.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 980;
      const g = audio.ctx.createGain();
      g.gain.setValueAtTime(0.1, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      src.connect(filter);
      filter.connect(g);
      g.connect(audio.sfxLevel);
      src.start(t);
      break;
    }
    case 'complete':
      tone(audio, 523.25, 0.16, 'sine', 0.16);
      tone(audio, 659.25, 0.16, 'sine', 0.14, 0.12);
      tone(audio, 783.99, 0.18, 'sine', 0.14, 0.24);
      tone(audio, 1046.5, 0.3, 'triangle', 0.12, 0.38);
      break;
    case 'buy':
      tone(audio, 784, 0.1, 'sine', 0.13);
      tone(audio, 1046.5, 0.16, 'sine', 0.11, 0.08);
      break;
  }
}
