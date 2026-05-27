// Synthesized military UI sounds — ACE Combat terminal aesthetic
// All sounds are procedurally generated via Web Audio API; no audio files needed.

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!_ctx) _ctx = new AudioContext();
    if (_ctx.state === "suspended") _ctx.resume();
    return _ctx;
  } catch {
    return null;
  }
}

function whiteNoise(ac: AudioContext, dur: number): AudioBufferSourceNode {
  const n = Math.ceil(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, n, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  return src;
}

// Crisp metallic snap — bandpass noise + square-wave ping descending
export function playClick(): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;

  const n = whiteNoise(ac, 0.065);
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 4200;
  bp.Q.value = 1.1;
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.38, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  n.connect(bp); bp.connect(ng); ng.connect(ac.destination);
  n.start(t); n.stop(t + 0.065);

  const osc = ac.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(1350, t);
  osc.frequency.exponentialRampToValueAtTime(680, t + 0.042);
  const og = ac.createGain();
  og.gain.setValueAtTime(0.13, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.042);
  osc.connect(og); og.connect(ac.destination);
  osc.start(t); osc.stop(t + 0.042);
}

// Heavier click + ascending electronic confirm tone
export function playConfirm(): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;

  const n = whiteNoise(ac, 0.08);
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 3000;
  bp.Q.value = 0.9;
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.5, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
  n.connect(bp); bp.connect(ng); ng.connect(ac.destination);
  n.start(t); n.stop(t + 0.08);

  const osc1 = ac.createOscillator();
  osc1.type = "square";
  osc1.frequency.setValueAtTime(1500, t);
  osc1.frequency.exponentialRampToValueAtTime(750, t + 0.05);
  const og1 = ac.createGain();
  og1.gain.setValueAtTime(0.15, t);
  og1.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  osc1.connect(og1); og1.connect(ac.destination);
  osc1.start(t); osc1.stop(t + 0.05);

  // Delayed high sine — the "lock-on" beep
  const osc2 = ac.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(2200, t + 0.07);
  const og2 = ac.createGain();
  og2.gain.setValueAtTime(0, t + 0.07);
  og2.gain.linearRampToValueAtTime(0.18, t + 0.09);
  og2.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  osc2.connect(og2); og2.connect(ac.destination);
  osc2.start(t + 0.07); osc2.stop(t + 0.23);
}

// Descending sawtooth buzz — negative feedback
export function playError(): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;

  const n = whiteNoise(ac, 0.18);
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 700;
  bp.Q.value = 0.5;
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.42, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  n.connect(bp); bp.connect(ng); ng.connect(ac.destination);
  n.start(t); n.stop(t + 0.18);

  const osc = ac.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(280, t);
  osc.frequency.exponentialRampToValueAtTime(110, t + 0.18);
  const og = ac.createGain();
  og.gain.setValueAtTime(0.2, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  osc.connect(og); og.connect(ac.destination);
  osc.start(t); osc.stop(t + 0.18);
}

// Sharp snap — pitch indicates selection state (on = bright, off = dull)
export function playToggle(on: boolean): void {
  const ac = getCtx();
  if (!ac) return;
  const t = ac.currentTime;

  const n = whiteNoise(ac, 0.055);
  const bp = ac.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = on ? 5000 : 2500;
  bp.Q.value = 1.4;
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.32, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
  n.connect(bp); bp.connect(ng); ng.connect(ac.destination);
  n.start(t); n.stop(t + 0.055);

  const osc = ac.createOscillator();
  osc.type = "square";
  osc.frequency.value = on ? 1800 : 900;
  const og = ac.createGain();
  og.gain.setValueAtTime(0.11, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.032);
  osc.connect(og); og.connect(ac.destination);
  osc.start(t); osc.stop(t + 0.032);
}
