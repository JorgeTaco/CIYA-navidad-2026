(function () {
  let context = null;

  function ensure() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!context) context = new AudioContextClass();
    if (context.state === 'suspended') context.resume();
    return context;
  }

  function tone(frequency, duration, options) {
    const ctx = ensure();
    if (!ctx) return;
    const opts = options || {};
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = opts.type || 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    if (opts.slideTo) oscillator.frequency.exponentialRampToValueAtTime(opts.slideTo, ctx.currentTime + duration);
    const volume = opts.volume == null ? 0.12 : opts.volume;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration + 0.02);
  }

  function sequence(notes, gap) {
    notes.forEach(function (note, index) {
      setTimeout(function () {
        tone(note.frequency, note.duration || 0.18, note);
      }, index * (gap || 220));
    });
  }

  const Sound = {
    enable() { return Boolean(ensure()); },
    beep() { tone(880, 0.12, { type: 'square', volume: 0.07 }); },
    countdown() { tone(520, 0.18, { type: 'square', volume: 0.11 }); },
    go() { tone(1200, 0.45, { type: 'sawtooth', volume: 0.14, slideTo: 1800 }); },
    tick() { tone(240, 0.05, { type: 'triangle', volume: 0.06 }); },
    success() {
      sequence([
        { frequency: 523, duration: 0.16 },
        { frequency: 659, duration: 0.16 },
        { frequency: 784, duration: 0.28 }
      ], 150);
    },
    ignite() {
      tone(110, 1.4, { type: 'sawtooth', volume: 0.1, slideTo: 220 });
      sequence([
        { frequency: 392, duration: 0.5, type: 'triangle', volume: 0.1 },
        { frequency: 494, duration: 0.5, type: 'triangle', volume: 0.1 },
        { frequency: 587, duration: 0.5, type: 'triangle', volume: 0.1 },
        { frequency: 784, duration: 1.2, type: 'triangle', volume: 0.14 }
      ], 230);
    }
  };

  window.CIYA_SOUND = Sound;
})();
