const CUES = {
  activate: [
    { frequency: 520, endFrequency: 760, duration: 0.1, delay: 0, type: "sine", volume: 0.24 },
    { frequency: 810, endFrequency: 1050, duration: 0.13, delay: 0.11, type: "sine", volume: 0.2 },
  ],
  startle: [
    { frequency: 980, endFrequency: 1480, duration: 0.08, delay: 0, type: "square", volume: 0.18 },
    { frequency: 720, endFrequency: 410, duration: 0.16, delay: 0.09, type: "sine", volume: 0.24 },
    { frequency: 540, endFrequency: 650, duration: 0.09, delay: 0.27, type: "triangle", volume: 0.17 },
  ],
  alert: [
    { frequency: 880, endFrequency: 1060, duration: 0.07, delay: 0, type: "square", volume: 0.12 },
    { frequency: 880, endFrequency: 1060, duration: 0.07, delay: 0.105, type: "square", volume: 0.1 },
  ],
  curious: [
    { frequency: 390, endFrequency: 560, duration: 0.13, delay: 0, type: "sine", volume: 0.16 },
    { frequency: 610, endFrequency: 720, duration: 0.11, delay: 0.15, type: "triangle", volume: 0.14 },
  ],
  scan: [
    { frequency: 340, endFrequency: 470, duration: 0.2, delay: 0, type: "sine", volume: 0.1 },
    { frequency: 510, endFrequency: 430, duration: 0.18, delay: 0.22, type: "sine", volume: 0.09 },
    { frequency: 460, endFrequency: 620, duration: 0.16, delay: 0.43, type: "triangle", volume: 0.08 },
  ],
  roll: [
    { frequency: 250, endFrequency: 410, duration: 0.12, delay: 0, type: "triangle", volume: 0.12 },
    { frequency: 440, endFrequency: 520, duration: 0.08, delay: 0.13, type: "sine", volume: 0.09 },
  ],
  arrive: [
    { frequency: 480, endFrequency: 540, duration: 0.08, delay: 0, type: "sine", volume: 0.12 },
    { frequency: 620, endFrequency: 680, duration: 0.08, delay: 0.09, type: "sine", volume: 0.11 },
    { frequency: 790, endFrequency: 900, duration: 0.12, delay: 0.18, type: "triangle", volume: 0.1 },
  ],
};

const MIN_GAP = {
  alert: 1200,
  curious: 1800,
  scan: 3000,
  roll: 450,
  arrive: 450,
  startle: 450,
};

export function createBB8Sound(container) {
  let context = null;
  let master = null;
  let enabled = false;
  const lastPlayed = new Map();

  const ensureContext = () => {
    if (context) return true;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;

    context = new AudioContext();
    master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 5;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.2;
    master.gain.value = 0;
    master.connect(compressor);
    compressor.connect(context.destination);
    return true;
  };

  const playTone = ({ frequency, endFrequency, duration, delay, type, volume }) => {
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    filter.type = "lowpass";
    filter.frequency.value = 2400;
    filter.Q.value = 1.4;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + Math.min(0.018, duration * 0.25));
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(filter);
    filter.connect(envelope);
    envelope.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.025);
  };

  const play = (cue, force = false) => {
    if (!enabled || !context || !CUES[cue]) return;
    const now = performance.now();
    if (!force && now - (lastPlayed.get(cue) ?? -Infinity) < (MIN_GAP[cue] ?? 300)) return;
    lastPlayed.set(cue, now);
    CUES[cue].forEach(playTone);
  };

  const onCue = (event) => play(event.detail);
  container.addEventListener("bb8:sound", onCue);

  return {
    async setEnabled(next) {
      if (!next) {
        enabled = false;
        if (context && master) master.gain.setTargetAtTime(0, context.currentTime, 0.015);
        return false;
      }
      if (!ensureContext()) return false;
      try {
        if (context.state === "suspended") await context.resume();
      } catch {
        return false;
      }
      enabled = true;
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(0.1, context.currentTime, 0.012);
      play("activate", true);
      return true;
    },
    dispose() {
      container.removeEventListener("bb8:sound", onCue);
      enabled = false;
      if (context && context.state !== "closed") context.close();
    },
  };
}
