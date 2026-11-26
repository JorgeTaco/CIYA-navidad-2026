# Arquitectura

El sitio es estático y se publica desde `apps/web/`. El backend es el proyecto
Supabase en `supabase/`. No hay servidor propio ni build.

## Contrato con Supabase

`shared/js/store.js` es el único módulo que llama a Supabase. Los demás usan:

- `CIYA_STORE.init(panel)` con `public`, `qr`, `recepcion`, `escenario` o `admin`.
- `CIYA_STORE.action(accion, payload, privada)` para `wish`, `group`, `checkin`,
  `donate`, `redeem`, `seal`, `score`, `door` y `moderate`.
- `CIYA_STORE.gold(secret)`, `CIYA_STORE.ranking()` y `CIYA_STORE.subscribe()`.

Las RPC están definidas en `supabase/migrations/0002_rpc_read_write.sql` y
`0005_role_discovery.sql`. El acceso se controla con `ciya.roles`,
`ciya_access(panel)` y `ciya_my_roles()`.

## Contratos entre módulos

- Cada HTML funcional en `apps/web/` es un shell delgado con un punto de montaje:
  `#acceso-root` (`index.html`), `#portal-root` (`portal.html`), `#qr-root`,
  `#recepcion-root`, `#admin-root` y `#escenario-root`. El JS dueño renderiza allí
  todo el markup dinámico. `bases.html` es contenido oficial estático y no tiene
  JS propio.
- `index.html` autentica la cuenta mediante `CIYA_STORE.loginAccount()` (o
  `CIYA_STORE.enterAsistente()` para participantes) y redirige exclusivamente hacia
  el/los panel(es) asignados al rol; los menús de navegación filtran las pestañas
  mediante `CIYA_UI.initNav()`.
- `CIYA_PORTAL.mount()` crea además `#inscripciones-root` y `#buzon-root`, donde
  `CIYA_INSCRIPCIONES.init()` y `CIYA_BUZON.init()` colocan sus formularios.
- `CIYA_RECEPCION.mount()` y `CIYA_ADMIN.mount()` renderizan sus paneles antes de
  pedir cuenta y suscribirse al store.
- `CIYA_IGNITE.mount()` dibuja el panel de hardware en `#encendido-root`, que
  `CIYA_STAGE.mount()` crea dentro del panel “Encendido 5 en 1”. `CIYA_IGNITE`
  expone `status`, `renderSequence`, `start`, `connect` y `setup`; `escenario.js`
  expone `CIYA_STAGE_RENDER` para que el encendido actualice la proyección sin
  depender de la ruleta ni del ranking.
- `CIYA_DRAW` valida y gestiona el sorteo con el respaldo sellado versión 2.

## Orden de carga

Sin build, el orden de `<link>` y `<script>` en cada HTML define la cascada y la
disponibilidad de los objetos globales: `shared/` primero, después los módulos y
al final `shared/css/responsive.css`. Dos órdenes son obligatorios por los puntos
de montaje:

- `portal.html`: `portal.js` antes que `inscripciones.js` y `buzon.js`, para que
  `CIYA_PORTAL.mount()` cree `#inscripciones-root` y `#buzon-root` antes de que
  los formularios busquen esos contenedores.
- `escenario.html`: `encendido.js` antes que `escenario.js`, para que exista
  `CIYA_IGNITE` cuando `CIYA_STAGE.mount()` llame a `CIYA_IGNITE.mount()` y luego
  a `CIYA_IGNITE.setup()`.
