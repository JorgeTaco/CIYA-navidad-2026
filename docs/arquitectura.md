# Arquitectura

El sitio es estático y se publica desde `apps/web/`. El backend es el proyecto
Supabase en `supabase/`. No hay servidor propio ni build.

## Contrato con Supabase

`shared/js/store.js` es el único módulo que llama a Supabase. Los demás usan:

- `CIYA_STORE.init(panel)` con `public`, `qr`, `recepcion`, `escenario` o `admin`.
- `CIYA_STORE.action(accion, payload, privada)` para `wish`, `group`, `checkin`,
  `donate`, `redeem`, `seal`, `score`, `door` y `moderate`.
- `CIYA_STORE.gold(secret)`, `CIYA_STORE.ranking()` y `CIYA_STORE.subscribe()`.

Las RPC están definidas en `supabase/migrations/0002_rpc_read_write.sql`. El
acceso se controla con `ciya.roles` y `ciya_access(panel)`.

## Contratos entre módulos

- `CIYA_INSCRIPCIONES.init()` y `CIYA_BUZON.init()` montan sus formularios en
  `index.html`; `portal.js` solo dibuja el portal y la linterna.
- `CIYA_IGNITE` expone `status`, `renderSequence`, `start`, `connect` y `setup`.
  `escenario.js` expone `CIYA_STAGE_RENDER` para que el encendido actualice la
  proyección sin depender de la ruleta ni del ranking.
- `CIYA_DRAW` valida y gestiona el sorteo con el respaldo sellado versión 2.

## Orden de carga

Sin build, el orden de `<link>` y `<script>` en cada HTML define la cascada y la
disponibilidad de los objetos globales: `shared/` primero, después los módulos y
al final `shared/css/responsive.css`.
