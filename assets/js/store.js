(function () {
  'use strict';

  const config = window.CIYA_CONFIG;
  const sessionKey = 'ciya2026:session:v2';
  const empty = { attendees: [], donations: [], groups: [], deseos: [], scores: [], puertas: [],
    qrClaims: [], ranking: [], counts: {}, receipts: {}, recepcionCerrada: false, snapshot: null };
  const listeners = new Set();
  let state = { ...empty };
  let scope = 'public';
  let online = false;
  let refreshPromise;
  let readPromise;
  let pending = new Map();

  function configured() {
    return Boolean(config.supabaseUrl && config.supabaseAnonKey);
  }

  function session() {
    try { return JSON.parse(sessionStorage.getItem(sessionKey)); }
    catch { return null; }
  }

  async function request(path, body, token) {
    if (!configured()) throw new Error('Configura Supabase para usar esta función.');
    const bearer = token || (config.supabaseAnonKey.startsWith('eyJ') ? config.supabaseAnonKey : '');
    let response;
    try {
      response = await fetch(config.supabaseUrl.replace(/\/$/, '') + path, {
        method: 'POST',
        headers: { apikey: config.supabaseAnonKey,
          ...(bearer ? { Authorization: 'Bearer ' + bearer } : {}), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000)
      });
    } catch {
      throw new Error('Sin conexión con el servidor. Puedes reintentar la misma operación.');
    }
    const result = await response.json().catch(function () { throw new Error('El servidor devolvió una respuesta inesperada.'); });
    if (!response.ok) throw new Error(result.message || result.msg || 'La operación no se pudo completar.');
    return result;
  }

  async function tokenFor() {
    const current = session();
    if (!current) throw new Error('Inicia sesión con tu cuenta de organización.');
    if (Date.now() < current.expires_at * 1000 - 60000) return current.access_token;
    if (!refreshPromise) {
      refreshPromise = request('/auth/v1/token?grant_type=refresh_token', { refresh_token: current.refresh_token })
        .then(function (fresh) {
          sessionStorage.setItem(sessionKey, JSON.stringify(fresh));
          return fresh.access_token;
        }).finally(function () { refreshPromise = null; });
    }
    return refreshPromise;
  }

  async function rpc(name, args, privateCall) {
    return request('/rest/v1/rpc/' + name, args, privateCall ? await tokenFor() : null);
  }

  async function load() {
    if (readPromise) return readPromise;
    readPromise = rpc('ciya_read', { panel: scope }, scope !== 'public').then(function (value) {
      const next = { ...empty, ...value };
      const changed = JSON.stringify(next) !== JSON.stringify(state);
      state = next;
      online = true;
      if (changed) listeners.forEach(function (listener) { listener(state); });
    }).catch(function () {
      online = false;
    }).finally(function () { readPromise = null; });
    return readPromise;
  }

  function uuid() {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, function (value) { return value.toString(16).padStart(2, '0'); }).join('');
    return hex.replace(/^(........)(....)(....)(....)/, '$1-$2-$3-$4-');
  }

  window.CIYA_STORE = {
    configured,
    hasSession: function () { return Boolean(session()); },
    async login(email, password, panel) {
      const credentials = await request('/auth/v1/token?grant_type=password', { email, password });
      await request('/rest/v1/rpc/ciya_access', { panel }, credentials.access_token);
      sessionStorage.setItem(sessionKey, JSON.stringify(credentials));
    },
    async authorize(panel) { return rpc('ciya_access', { panel }, true); },
    async logout() {
      const current = session();
      sessionStorage.removeItem(sessionKey);
      if (current) await request('/auth/v1/logout?scope=local', {}, current.access_token).catch(function () {});
    },
    async init(panel) {
      scope = panel || 'public';
      if (!configured() || scope === 'offline') return;
      await load();
      setInterval(function () { if (!document.hidden) load(); }, config.syncIntervalMs);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
    },
    get: function () { return state; },
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
    },
    isRemote: function () { return online; },
    async action(action, payload, privateCall) {
      const key = JSON.stringify([action, payload]);
      if (pending.has(key)) return pending.get(key).promise;
      const fingerprint = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
      if (pending.has(key)) return pending.get(key).promise;
      const storageKey = 'ciya:retry:' + action + ':' + Array.from(new Uint8Array(fingerprint)).join('.');
      const entry = { id: sessionStorage.getItem(storageKey) || uuid() };
      sessionStorage.setItem(storageKey, entry.id);
      entry.promise = rpc('ciya_write', { action, payload, request_id: entry.id }, privateCall)
        .then(async function (result) {
          sessionStorage.removeItem(storageKey);
          if (readPromise) await readPromise;
          await load();
          return result;
        }).finally(function () { pending.delete(key); });
      pending.set(key, entry);
      return entry.promise;
    },
    async importLegacy(backup, verified, importId) {
      const result = await rpc('ciya_import_v1', { backup, verified, import_id: importId }, true);
      await load();
      return result;
    },
    newRequestId: uuid,
    gold: function (secret) { return rpc('ciya_gold', { secret }, false); },
    ranking: function () {
      return state.ranking.length ? state.ranking : window.CIYA_DATA.carreras.map(function (carrera) {
        return { ...carrera, puntos: 0, juguetes: 0, caramelos: 0, total: 0, donantes: 0, puesto: 1 };
      });
    },
    carrera: function (id) {
      return window.CIYA_DATA.carreras.find(function (carrera) { return carrera.id === id; }) ||
        { id, nombre: id, color: '#ffffff', sigla: '?' };
    }
  };

})();
