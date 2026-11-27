(function () {
  'use strict';

  const config = window.CIYA_CONFIG;
  const sessionKey = 'ciya2026:session:v2';
  const rolesKey = 'ciya2026:roles:v1';
  const staffPanels = ['recepcion', 'escenario', 'admin'];
  const allRoles = ['asistente', 'recepcion', 'escenario', 'admin'];
  const empty = { attendees: [], donations: [], groups: [], deseos: [], scores: [], puertas: [],
    qrClaims: [], ranking: [], counts: {}, receipts: {}, recepcionCerrada: false, sealed: false, snapshot: null };
  const listeners = new Set();
  let state = { ...empty };
  let scope = 'public';
  let online = false;
  let refreshPromise;
  let readPromise;
  let syncTimer = null;
  let visibilityBound = false;
  let pending = new Map();

  function configured() {
    return Boolean(config.supabaseUrl && config.supabaseAnonKey);
  }

  function requireConfig() {
    if (!configured()) throw new Error('Falta la configuración de Supabase en apps/web/shared/js/config.js.');
  }

  function session() {
    try { return JSON.parse(sessionStorage.getItem(sessionKey)); }
    catch { return null; }
  }

  function saveRoles(roles, email, mode) {
    const clean = Array.isArray(roles) ? roles.filter(function (panel) {
      return allRoles.includes(panel);
    }) : [];
    sessionStorage.setItem(rolesKey, JSON.stringify({ email: email || '', roles: clean, mode: mode || '' }));
    return clean;
  }

  function cachedRoles() {
    const activeSession = session();
    try {
      const parsed = JSON.parse(sessionStorage.getItem(rolesKey) || 'null');
      if (parsed && Array.isArray(parsed.roles)) {
        const valid = parsed.roles.filter(function (role) { return allRoles.includes(role); });
        if (parsed.mode === 'asistente' || activeSession) {
          return { email: parsed.email || '', roles: valid, mode: parsed.mode || '' };
        }
      }
    } catch {}
    return { email: '', roles: [], mode: '' };
  }

  async function hashKey(text) {
    if (globalThis.crypto && crypto.subtle) {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(digest)).join('.');
    }
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < text.length; i++) {
      const ch = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ (ch >>> 8), 0x811c9dc5) >>> 0;
    }
    return h1.toString(16) + '.' + h2.toString(16);
  }

  async function request(path, body, token) {
    requireConfig();
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
    requireConfig();
    if (readPromise) return readPromise;
    readPromise = rpc('ciya_read', { panel: scope }, scope !== 'public').then(function (value) {
      const next = { ...empty, ...value };
      const changed = !online || JSON.stringify(next) !== JSON.stringify(state);
      state = next;
      online = true;
      if (changed) listeners.forEach(function (listener) { listener(state); });
    }).catch(function () {
      if (!online) return;
      online = false;
      listeners.forEach(function (listener) { listener(state); });
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
    hasSession: function () { return configured() && Boolean(session()); },
    hasAccessSession: function () { return configured() && Boolean(session() || cachedRoles().roles.length); },
    sessionRoles: function () { return configured() ? cachedRoles().roles : []; },
    sessionInfo: function () { return configured() ? cachedRoles() : { email: '', roles: [], mode: '' }; },
    enterAsistente: function () {
      requireConfig();
      sessionStorage.removeItem(sessionKey);
      saveRoles(['asistente'], 'Estudiante / Docente', 'asistente');
    },
    async myRoles() {
      const token = await tokenFor();
      try {
        const info = await request('/rest/v1/rpc/ciya_my_roles', {}, token);
        const roles = saveRoles(info && info.roles, info && info.email, 'staff');
        return { email: (info && info.email) || '', roles };
      } catch (error) {
        const current = session();
        const checks = await Promise.allSettled(staffPanels.map(function (panel) {
          return request('/rest/v1/rpc/ciya_access', { panel }, token).then(function () { return panel; });
        }));
        const roles = checks.filter(function (item) { return item.status === 'fulfilled'; })
          .map(function (item) { return item.value; });
        if (!roles.length && checks.every(function (item) {
          return item.status === 'rejected' && !/no tiene acceso/i.test(item.reason && item.reason.message || '');
        })) {
          throw error;
        }
        const email = (current && current.user && current.user.email) || '';
        return { email, roles: saveRoles(roles, email, 'staff') };
      }
    },
    async loginAccount(email, password) {
      requireConfig();
      const credentials = await request('/auth/v1/token?grant_type=password', { email, password });
      sessionStorage.setItem(sessionKey, JSON.stringify(credentials));
      try {
        const info = await this.myRoles();
        if (!info.roles.length) {
          await this.logout();
          throw new Error('Esta cuenta no tiene un rol de organización asignado.');
        }
        return info;
      } catch (error) {
        await this.logout();
        throw error;
      }
    },
    async login(email, password, panel) {
      requireConfig();
      const credentials = await request('/auth/v1/token?grant_type=password', { email, password });
      await request('/rest/v1/rpc/ciya_access', { panel }, credentials.access_token);
      sessionStorage.setItem(sessionKey, JSON.stringify(credentials));
      await this.myRoles().catch(function () {
        saveRoles([panel], email, 'staff');
      });
    },
    async authorize(panel) {
      requireConfig();
      return rpc('ciya_access', { panel }, true);
    },
    async logout() {
      const current = session();
      sessionStorage.removeItem(sessionKey);
      sessionStorage.removeItem(rolesKey);
      if (current && configured()) {
        await request('/auth/v1/logout?scope=local', {}, current.access_token).catch(function () {});
      }
    },
    async init(panel) {
      scope = panel || 'public';
      if (scope === 'offline') return;
      requireConfig();
      await load();
      if (!syncTimer) syncTimer = setInterval(function () { if (!document.hidden) load(); }, config.syncIntervalMs);
      if (!visibilityBound) {
        visibilityBound = true;
        document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
      }
    },
    get: function () { return state; },
    subscribe(listener) {
      listeners.add(listener);
      listener(state);
      return function () { listeners.delete(listener); };
    },
    isRemote: function () { return online; },
    async action(action, payload, privateCall) {
      requireConfig();
      const key = JSON.stringify([action, payload]);
      if (pending.has(key)) return pending.get(key).promise;
      const fingerprint = await hashKey(key);
      if (pending.has(key)) return pending.get(key).promise;
      const storageKey = 'ciya:retry:' + action + ':' + fingerprint;
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
    gold: function (secret) {
      return rpc('ciya_gold', { secret }, false);
    },
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
