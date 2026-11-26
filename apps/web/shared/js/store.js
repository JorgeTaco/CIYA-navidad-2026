(function () {
  'use strict';

  const config = window.CIYA_CONFIG;
  const sessionKey = 'ciya2026:session:v2';
  const rolesKey = 'ciya2026:roles:v1';
  const demoStateKey = 'ciya2026:demo:v1';
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

  const DEMO_ACCOUNTS = {
    'recepcion@ciya.local': { role: 'recepcion', pass: 'ciya2026' },
    'escenario@ciya.local': { role: 'escenario', pass: 'ciya2026' },
    'admin@ciya.local': { role: 'admin', pass: 'ciya2026' }
  };

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

  function configured() {
    return Boolean(config.supabaseUrl && config.supabaseAnonKey);
  }

  function session() {
    try { return JSON.parse(sessionStorage.getItem(sessionKey)); }
    catch { return null; }
  }

  function isDemoSession() {
    const current = session();
    return Boolean(!configured() && current && current.demo);
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

  function demoSeed() {
    const carreras = (window.CIYA_DATA && window.CIYA_DATA.carreras) || [];
    const now = new Date().toISOString();
    return {
      attendees: [
        { id: '11111111-1111-4111-8111-111111111111', cedula: '0500000001', nombre: 'Ana Pérez', email: 'ana@ciya.local', carrera: 'sistemas', checked_in_at: now }
      ],
      donations: [
        { tipo: 'juguete', carrera: 'sistemas', cantidad: 2, creado: now, cedula: '0500000001', nombre: 'Ana Pérez', puntos: 10 },
        { tipo: 'caramelos', carrera: 'industrial', cantidad: 3, creado: now, cedula: '0500000001', nombre: 'Ana Pérez', puntos: 6 }
      ],
      groups: [
        { id: 'g-demo-1', orden: 1, nombre: 'Bits Navideños', representante: 'Carlos Ruiz', carrera: 'sistemas', cancion: 'Noche de Paz Byte', categoria: 'Acústico / Rock Navideño', integrantes: ['Carlos Ruiz', 'Ana Pérez'] },
        { id: 'g-demo-2', orden: 2, nombre: 'Coro Industrial', representante: 'Lucía Mora', carrera: 'industrial', cancion: 'Campana sobre Campana', categoria: 'Coro de Carrera', integrantes: ['Lucía Mora', 'Mateo Vega'] }
      ],
      deseos: [
        { id: 'd-demo-1', nombre: 'Ana Pérez', rol: 'estudiante', carrera: 'Sistemas y Software', frase: 'Graduarme en 2027 sin errores en producción.', aprobado: true, creado: now },
        { id: 'd-demo-2', nombre: 'Ing. Marcos Silva', rol: 'docente', carrera: 'Industrial', frase: 'Seguir impulsando proyectos solidarios desde las aulas.', aprobado: false, creado: now }
      ],
      scores: [],
      puertas: [],
      qrClaims: [
        { slot: 1, canjeado: false },
        { slot: 2, canjeado: false },
        { slot: 3, canjeado: false }
      ],
      goldLinks: [
        { slot: 1, secret: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' },
        { slot: 2, secret: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2' },
        { slot: 3, secret: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3' }
      ],
      receipts: {},
      sealed: false,
      recepcionCerrada: false,
      snapshot: null,
      _carreras: carreras
    };
  }

  function computeDemoRanking(data) {
    const carreras = (window.CIYA_DATA && window.CIYA_DATA.carreras) || [];
    const rows = carreras.map(function (c) {
      const items = data.donations.filter(function (d) { return d.carrera === c.id; });
      const juguetes = items.filter(function (d) { return d.tipo === 'juguete'; }).reduce(function (s, d) { return s + Number(d.cantidad || 0); }, 0);
      const caramelos = items.filter(function (d) { return d.tipo === 'caramelos'; }).reduce(function (s, d) { return s + Number(d.cantidad || 0); }, 0);
      const donantes = new Set(items.map(function (d) { return d.cedula; })).size;
      return {
        id: c.id, nombre: c.nombre, color: c.color,
        juguetes, caramelos, total: juguetes + caramelos,
        puntos: juguetes * 5 + caramelos * 2, donantes, puesto: 1
      };
    });
    rows.sort(function (a, b) {
      return (b.puntos - a.puntos) || (b.juguetes - a.juguetes) || (b.donantes - a.donantes) || a.id.localeCompare(b.id);
    });
    rows.forEach(function (row, idx) {
      if (idx > 0 && row.puntos === rows[idx - 1].puntos && row.juguetes === rows[idx - 1].juguetes && row.donantes === rows[idx - 1].donantes) {
        row.puesto = rows[idx - 1].puesto;
      } else {
        row.puesto = idx + 1;
      }
    });
    return rows;
  }

  function loadDemoState() {
    let raw;
    try { raw = JSON.parse(sessionStorage.getItem(demoStateKey) || 'null'); }
    catch { raw = null; }
    const data = raw && Array.isArray(raw.donations) ? raw : demoSeed();
    const ranking = computeDemoRanking(data);
    const approved = data.deseos.filter(function (w) { return w.aprobado; });
    return {
      ...empty,
      ...data,
      ranking,
      counts: {
        attendees: data.attendees.filter(function (a) { return a.checked_in_at; }).length,
        tickets: Math.max(1, data.attendees.length + data.donations.length * 2),
        donations: data.donations.length,
        groups: data.groups.length,
        wishes: approved.length
      }
    };
  }

  function saveDemoState(next) {
    sessionStorage.setItem(demoStateKey, JSON.stringify(next));
    state = loadDemoState();
    listeners.forEach(function (listener) { listener(state); });
    return state;
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
    if (!current || current.demo) throw new Error('Inicia sesión con tu cuenta de organización.');
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
    if (!configured()) {
      state = loadDemoState();
      online = false;
      listeners.forEach(function (listener) { listener(state); });
      return;
    }
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

  function demoAction(action, payload) {
    const roles = cachedRoles().roles;
    if (['checkin', 'donate', 'redeem', 'seal'].includes(action) && !roles.includes('recepcion')) {
      throw new Error('La cuenta no tiene acceso a recepción.');
    }
    if (action === 'score' && !roles.includes('escenario')) {
      throw new Error('La cuenta no tiene acceso a escenario.');
    }
    if (['door', 'moderate'].includes(action) && !roles.includes('admin')) {
      throw new Error('La cuenta no tiene acceso a administración.');
    }
    const current = loadDemoState();
    const now = new Date().toISOString();
    if (action === 'group') {
      current.groups.push({ ...payload, id: 'g-' + Date.now(), orden: current.groups.length + 1 });
      saveDemoState(current);
      return { ok: true };
    }
    if (action === 'wish') {
      current.deseos.push({ ...payload, id: 'd-' + Date.now(), aprobado: false, creado: now });
      saveDemoState(current);
      return { ok: true };
    }
    if (action === 'moderate') {
      if (payload.decision === 'approve') {
        current.deseos = current.deseos.map(function (d) { return d.id === payload.id ? { ...d, aprobado: true } : d; });
      } else {
        current.deseos = current.deseos.filter(function (d) { return d.id !== payload.id; });
      }
      saveDemoState(current);
      return { ok: true };
    }
    if (action === 'door') {
      const total = Object.values(payload.criterios || {}).reduce(function (s, v) { return s + Number(v || 0); }, 0);
      current.puertas = current.puertas.filter(function (p) { return p.carrera !== payload.subject; });
      current.puertas.push({ carrera: payload.subject, criterios: payload.criterios, total, observaciones: payload.observaciones || '' });
      saveDemoState(current);
      return { ok: true };
    }
    if (action === 'score') {
      const total = Object.values(payload.criterios || {}).reduce(function (s, v) { return s + Number(v || 0); }, 0);
      current.scores = current.scores.filter(function (s) { return s.grupoId !== payload.subject; });
      current.scores.push({ grupoId: payload.subject, criterios: payload.criterios, aplauso: payload.criterios.aplauso || 0, total });
      saveDemoState(current);
      return { ok: true };
    }
    if (action === 'checkin') {
      let person = current.attendees.find(function (a) { return a.cedula === payload.cedula; });
      if (!person) {
        person = { id: uuid(), cedula: payload.cedula, nombre: payload.nombre, email: payload.email, carrera: payload.carrera, checked_in_at: now };
        current.attendees.unshift(person);
      }
      if (payload.donation) {
        const pts = payload.donation.cantidad * (payload.donation.tipo === 'juguete' ? 5 : 2);
        current.donations.unshift({ ...payload.donation, creado: now, cedula: payload.cedula, nombre: person.nombre, puntos: pts });
      }
      saveDemoState(current);
      return { id: uuid(), nombre: person.nombre, tickets: ['CIYA-0000000000000000001'] };
    }
    if (action === 'donate') {
      const pts = payload.cantidad * (payload.tipo === 'juguete' ? 5 : 2);
      current.donations.unshift({ ...payload, creado: now, nombre: payload.cedula, puntos: pts });
      saveDemoState(current);
      return { id: uuid(), nombre: payload.cedula, tickets: ['CIYA-0000000000000000002'] };
    }
    if (action === 'redeem') {
      const next = current.qrClaims.find(function (q) { return !q.canjeado; });
      if (next) next.canjeado = true;
      saveDemoState(current);
      return { id: uuid(), nombre: payload.cedula, tickets: ['CIYA-0000000000000000003'] };
    }
    if (action === 'seal') {
      current.sealed = true;
      current.recepcionCerrada = true;
      current.snapshot = {
        version: 2,
        event: 'ciya-navidad-2026',
        sealedAt: now,
        ranking: current.ranking,
        wishes: current.deseos.filter(function (d) { return d.aprobado; }),
        tickets: current.attendees.map(function (a, idx) {
          return { number: 'CIYA-' + String(idx + 1).padStart(19, '0'), person: a.id, nombre: a.nombre || 'Asistente' };
        })
      };
      saveDemoState(current);
      return { sealed: true };
    }
    return { ok: true };
  }

  window.CIYA_STORE = {
    configured,
    isDemo: isDemoSession,
    hasSession: function () { return Boolean(session()); },
    hasAccessSession: function () { return Boolean(session() || cachedRoles().roles.length); },
    sessionRoles: function () { return cachedRoles().roles; },
    sessionInfo: cachedRoles,
    enterAsistente: function () {
      sessionStorage.removeItem(sessionKey);
      saveRoles(['asistente'], 'Estudiante / Docente', 'asistente');
    },
    async myRoles() {
      if (isDemoSession()) {
        const info = cachedRoles();
        return { email: info.email, roles: info.roles };
      }
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
      if (!configured()) {
        const cleanEmail = String(email || '').trim().toLowerCase();
        const account = DEMO_ACCOUNTS[cleanEmail];
        if (!account || account.pass !== password) {
          throw new Error('Credenciales demo inválidas. Usa recepcion@ciya.local, escenario@ciya.local o admin@ciya.local (clave: ciya2026).');
        }
        sessionStorage.setItem(sessionKey, JSON.stringify({ demo: true, email: cleanEmail }));
        saveRoles([account.role], cleanEmail, 'demo');
        return { email: cleanEmail, roles: [account.role], demo: true };
      }
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
      if (!configured()) {
        const info = await this.loginAccount(email, password);
        if (!info.roles.includes(panel)) {
          await this.logout();
          throw new Error('La cuenta demo no tiene acceso a este panel.');
        }
        return;
      }
      const credentials = await request('/auth/v1/token?grant_type=password', { email, password });
      await request('/rest/v1/rpc/ciya_access', { panel }, credentials.access_token);
      sessionStorage.setItem(sessionKey, JSON.stringify(credentials));
      await this.myRoles().catch(function () {
        saveRoles([panel], email, 'staff');
      });
    },
    async authorize(panel) {
      if (isDemoSession()) {
        if (!cachedRoles().roles.includes(panel)) throw new Error('La cuenta no tiene acceso a este panel.');
        return true;
      }
      return rpc('ciya_access', { panel }, true);
    },
    async logout() {
      const current = session();
      sessionStorage.removeItem(sessionKey);
      sessionStorage.removeItem(rolesKey);
      if (current && !current.demo) {
        await request('/auth/v1/logout?scope=local', {}, current.access_token).catch(function () {});
      }
    },
    async init(panel) {
      scope = panel || 'public';
      if (scope === 'offline') return;
      if (!configured()) {
        await load();
        return;
      }
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
      if (!configured()) {
        return demoAction(action, payload);
      }
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
      if (!configured()) throw new Error('Importación disponible únicamente con Supabase configurado.');
      const result = await rpc('ciya_import_v1', { backup, verified, import_id: importId }, true);
      await load();
      return result;
    },
    newRequestId: uuid,
    gold: function (secret) {
      if (!configured()) {
        return Promise.resolve({ status: 'available', code: 'DEMO1234ABCD5678', seconds: 120 });
      }
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
