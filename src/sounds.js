let audioCtx = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone({
  freq = 440,
  duration = 0.12,
  type = "square",
  gain = 0.08,
  slideTo = null,
}) {
  const ctx = getCtx();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slideTo != null) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, slideTo),
      ctx.currentTime + duration
    );
  }

  amp.gain.setValueAtTime(gain, ctx.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.02);
}

function playNoise({ duration = 0.2, gain = 0.12 }) {
  const ctx = getCtx();
  if (!ctx) return;

  const size = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < size; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / size);
  }

  const src = ctx.createBufferSource();
  const amp = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;

  src.buffer = buffer;
  amp.gain.setValueAtTime(gain, ctx.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  src.connect(filter);
  filter.connect(amp);
  amp.connect(ctx.destination);
  src.start();
}

export function unlockAudio() {
  getCtx();
}

export const sfx = {
  placeBomb() {
    playTone({ freq: 120, duration: 0.1, type: "triangle", gain: 0.1, slideTo: 60 });
  },
  explode() {
    playNoise({ duration: 0.35, gain: 0.18 });
    playTone({ freq: 90, duration: 0.28, type: "sawtooth", gain: 0.07, slideTo: 40 });
  },
  pickup() {
    playTone({ freq: 660, duration: 0.08, type: "square", gain: 0.06 });
    setTimeout(() => {
      playTone({ freq: 880, duration: 0.1, type: "square", gain: 0.05 });
    }, 70);
  },
  countdown() {
    playTone({ freq: 520, duration: 0.12, type: "square", gain: 0.07 });
  },
  go() {
    playTone({ freq: 440, duration: 0.1, type: "square", gain: 0.08 });
    setTimeout(() => {
      playTone({ freq: 660, duration: 0.18, type: "square", gain: 0.08 });
    }, 90);
  },
  win() {
    [523, 659, 784, 1046].forEach((freq, i) => {
      setTimeout(() => {
        playTone({ freq, duration: 0.16, type: "triangle", gain: 0.08 });
      }, i * 120);
    });
  },
  lose() {
    playTone({ freq: 300, duration: 0.2, type: "sawtooth", gain: 0.07, slideTo: 90 });
  },
  death() {
    playTone({ freq: 220, duration: 0.25, type: "triangle", gain: 0.08, slideTo: 70 });
  },
  kick() {
    playTone({ freq: 180, duration: 0.2, type: "square", gain: 0.07, slideTo: 80 });
  },
  abilityCast() {
    playTone({ freq: 500, duration: 0.08, type: "square", gain: 0.06 });
    playTone({ freq: 700, duration: 0.1, type: "triangle", gain: 0.05 });
  },
  abilityHit() {
    playTone({ freq: 340, duration: 0.14, type: "sawtooth", gain: 0.06, slideTo: 180 });
  },
  abilityCooldown() {
    playTone({ freq: 140, duration: 0.1, type: "square", gain: 0.05, slideTo: 80 });
  },
};
