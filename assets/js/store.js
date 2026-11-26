(function () {
  const CFG = window.CIYA_CONFIG;
  const KEY = 'ciya2026:state';
  const CHANNEL = 'ciya2026:state';
  const REMOTE_ID = 'event';

  function emptyState() {
    return {
      id: REMOTE_ID,
      updatedAt: 0,
      attendees: [],
      donations: [],
      groups: [],
      deseos: [],
      scores: [],
      puertas: [],
      qrClaims: [],
      muro: [],
      winners: [],
      recepcionCerrada: false,
      roulette: { history: [], current: null, excluded: [] },
      ignition: { lastRun: null, relay: false }
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  let state = emptyState();
  const listeners = new Set();
  let channel = null;
  let pushTimer = null;
  let remoteReady = false;
  let pulling = false;

  function readLocal() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return false;
      state = Object.assign(emptyState(), parsed);
      return true;
    } catch (error) {
      return false;
    }
  }

  function writeLocal() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('No se pudo guardar en el almacenamiento local', error);
    }
  }

  function emit(source) {
    listeners.forEach(function (fn) {
      try {
        fn(clone(state), source);
      } catch (error) {
        console.error(error);
      }
    });
  }

  function remoteConfigured() {
    return Boolean(CFG.supabaseUrl && CFG.supabaseAnonKey);
  }

  function remoteHeaders(extra) {
    return Object.assign({
      apikey: CFG.supabaseAnonKey,
      Authorization: 'Bearer ' + CFG.supabaseAnonKey,
      'Content-Type': 'application/json'
    }, extra || {});
  }

  function remoteCollectionUrl() {
    return CFG.supabaseUrl.replace(/\/$/, '') + '/rest/v1/ciya_state';
  }

  function remoteUrl() {
    return remoteCollectionUrl() + '?id=eq.' + REMOTE_ID;
  }

  async function pullRemote() {
    if (!remoteConfigured() || pulling) return;
    pulling = true;
    try {
      const response = await fetch(remoteUrl() + '&select=data', { headers: remoteHeaders(), cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const rows = await response.json();
      const remote = rows && rows[0] && rows[0].data;
      if (remote && Number(remote.updatedAt || 0) > Number(state.updatedAt || 0)) {
        state = Object.assign(emptyState(), remote);
        writeLocal();
        emit('remote');
      }
      remoteReady = true;
    } catch (error) {
      console.warn('Sincronización remota no disponible; se usa modo local', error);
    } finally {
      pulling = false;
    }
  }

  function pushRemote() {
    if (!remoteConfigured()) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(async function () {
      try {
        const response = await fetch(remoteCollectionUrl(), {
          method: 'POST',
          headers: remoteHeaders({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
          body: JSON.stringify([{ id: REMOTE_ID, data: clone(state), updated_at: new Date().toISOString() }])
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
      } catch (error) {
        console.warn('No se pudo publicar el estado remoto', error);
      }
    }, 350);
  }

  function notify(source) {
    writeLocal();
    emit(source);
    if (channel && source !== 'remote') channel.postMessage({ type: 'changed', updatedAt: state.updatedAt });
    pushRemote();
  }

  const Store = {
    async init() {
      readLocal();
      if ('BroadcastChannel' in window) {
        channel = new BroadcastChannel(CHANNEL);
        channel.onmessage = function () {
          const before = state.updatedAt;
          readLocal();
          if (state.updatedAt !== before) emit('channel');
        };
      }
      window.addEventListener('storage', function (event) {
        if (event.key !== KEY) return;
        const before = state.updatedAt;
        readLocal();
        if (state.updatedAt !== before) emit('storage');
      });
      await pullRemote();
      if (remoteConfigured()) setInterval(pullRemote, CFG.syncIntervalMs || 3000);
      return clone(state);
    },

    get() {
      return clone(state);
    },

    update(mutator) {
      const draft = clone(state);
      const result = mutator(draft);
      draft.updatedAt = Date.now();
      state = draft;
      notify('local');
      return result;
    },

    subscribe(fn) {
      listeners.add(fn);
      fn(clone(state), 'init');
      return function () { listeners.delete(fn); };
    },

    isRemote() {
      return remoteConfigured() && remoteReady;
    },

    exportJson() {
      return JSON.stringify(clone(state), null, 2);
    },

    importJson(text) {
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.attendees)) throw new Error('Archivo de respaldo no válido');
      state = Object.assign(emptyState(), parsed);
      state.updatedAt = Date.now();
      notify('import');
    },

    reset() {
      state = emptyState();
      state.updatedAt = Date.now();
      notify('reset');
    },

    carrera(id) {
      return window.CIYA_DATA.carreras.find(function (c) { return c.id === id; }) || { id: id, nombre: id, color: '#ffffff', sigla: '?' };
    },

    ticketBreakdown(cedula) {
      const current = clone(state);
      const asistente = current.attendees.find(function (a) { return a.cedula === cedula; });
      const base = asistente && asistente.checkin ? window.CIYA_DATA.ponderaciones.base : 0;
      const muro = current.muro.filter(function (m) { return m.cedula === cedula; }).length * window.CIYA_DATA.ponderaciones.muro;
      const donaciones = current.donations.filter(function (d) { return d.cedula === cedula; })
        .reduce(function (sum, d) { return sum + Number(d.puntos || 0); }, 0);
      const dorados = current.qrClaims.filter(function (q) { return q.cedula === cedula && q.canjeado; }).length * window.CIYA_DATA.ponderaciones.qrDorado;
      return {
        base: base,
        muro: muro,
        donaciones: donaciones,
        dorados: dorados,
        total: base + muro + donaciones + dorados,
        ganado: current.winners.some(function (w) { return w.cedula === cedula; })
      };
    },

    ranking() {
      const rows = window.CIYA_DATA.carreras.map(function (carrera) {
        const donaciones = state.donations.filter(function (d) { return d.carrera === carrera.id; });
        const juguetes = donaciones.filter(function (d) { return d.tipo === 'juguete'; })
          .reduce(function (sum, d) { return sum + Number(d.cantidad || 0); }, 0);
        const caramelos = donaciones.filter(function (d) { return d.tipo === 'caramelos'; })
          .reduce(function (sum, d) { return sum + Number(d.cantidad || 0); }, 0);
        return {
          id: carrera.id,
          nombre: carrera.nombre,
          color: carrera.color,
          juguetes: juguetes,
          caramelos: caramelos,
          puntos: donaciones.reduce(function (sum, d) { return sum + Number(d.puntos || 0); }, 0),
          donantes: new Set(donaciones.map(function (d) { return d.cedula; })).size
        };
      });
      rows.sort(function (a, b) {
        return b.puntos - a.puntos || b.juguetes - a.juguetes || b.donantes - a.donantes;
      });
      return rows;
    },

    nextGroupOrder() {
      return state.groups.length + 1;
    }
  };

  window.CIYA_STORE = Store;
})();
