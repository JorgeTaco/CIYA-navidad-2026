const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const { runInNewContext } = require('node:vm');

const source = readFileSync(join(__dirname, '../../apps/web/shared/js/sound.js'), 'utf8');

function fixture(AudioContext) {
  const pending = [];
  const window = { AudioContext };
  runInNewContext(source, { window, setTimeout: (callback, time) => pending.push({ callback, time }) });
  return { sound: window.CIYA_SOUND, pending };
}

test('el audio de escenario falla de forma silenciosa cuando el navegador no tiene dispositivo', async () => {
  const { sound, pending } = fixture(undefined);
  assert.equal(await sound.enable(), false);
  sound.ignite();
  sound.success();
  pending.forEach(note => note.callback());
  assert.equal(pending.length, 7);
});

test('el audio comparte una sola activación local entre varias llamadas', async () => {
  let start;
  let calls = 0;
  const { sound } = fixture(class {
    state = 'suspended';
    resume() {
      calls++;
      return new Promise(resolve => {
        start = () => { this.state = 'running'; resolve(); };
      });
    }
  });
  const first = sound.enable();
  const second = sound.enable();
  assert.equal(calls, 1);
  start();
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.equal(await sound.enable(), true);
  assert.equal(calls, 1);
});

test('un rechazo del dispositivo no impide volver a activar el audio local', async () => {
  let attempts = 0;
  const { sound } = fixture(class {
    state = 'suspended';
    async resume() {
      if (++attempts === 1) throw new Error('Dispositivo bloqueado');
      this.state = 'running';
    }
  });
  assert.equal(await sound.enable(), false);
  assert.equal(await sound.enable(), true);
});

test('las señales del encendido y la ruleta se sintetizan con osciladores locales', () => {
  const frequencies = [];
  let notes = 0;
  const { sound, pending } = fixture(class {
    state = 'running';
    currentTime = 0;
    createOscillator() {
      return {
        frequency: { setValueAtTime: value => frequencies.push(value), exponentialRampToValueAtTime() {} },
        connect() {}, start() { notes++; }, stop() {}
      };
    }
    createGain() {
      return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
    }
  });
  sound.countdown();
  sound.go();
  sound.tick();
  sound.ignite();
  sound.success();
  for (const { callback } of pending) callback();
  assert.deepEqual(frequencies, [520, 1200, 240, 110, 392, 494, 587, 784, 523, 659, 784]);
  assert.equal(notes, frequencies.length);
});
