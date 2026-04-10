// Procedural 8-bit audio engine using Web Audio API

let audioContext: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export function resumeAudio(): void {
  const ctx = getCtx();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType,
  gainPeak: number,
  startTime: number,
): void {
  const ctx = getCtx();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);

  // Attack
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gainPeak, startTime + 0.01);
  // Release
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.01);
}

// Short high-pitched beep for swap
export function playSwapSound(): void {
  const ctx = getCtx();
  const now = ctx.currentTime;
  playTone(880, 0.08, 'square', 0.15, now);
}

// Error sound — low dry note
export function playErrorSound(): void {
  const ctx = getCtx();
  const now = ctx.currentTime;
  playTone(150, 0.15, 'sawtooth', 0.2, now);
}

// Match sound — ascending arpeggio, faster if comboLevel > 0
export function playMatchSound(comboLevel: number = 0): void {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  const noteDuration = 0.07;
  const baseInterval = Math.max(0.04, 0.08 - comboLevel * 0.01);

  for (let i = 0; i < notes.length; i++) {
    const freq = notes[i] * (1 + comboLevel * 0.05);
    playTone(freq, noteDuration, 'square', 0.15, now + i * baseInterval);
  }
}

// Game over — descending sequence
export function playGameOverSound(): void {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const notes = [523, 440, 349, 262]; // C5, A4, F4, C4
  for (let i = 0; i < notes.length; i++) {
    playTone(notes[i], 0.18, 'sawtooth', 0.2, now + i * 0.18);
  }
}

// Reshuffle — ascending/descending sweep
export function playReshuffleSound(): void {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const notes = [392, 440, 494, 523, 494, 440, 392];
  for (let i = 0; i < notes.length; i++) {
    playTone(notes[i], 0.08, 'square', 0.12, now + i * 0.07);
  }
}
