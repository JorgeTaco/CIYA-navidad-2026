# Arquitectura

El sitio es estático y se publica desde `apps/web/`. El backend es el proyecto
Supabase en `supabase/`. No hay servidor propio ni build.

## Contrato con Supabase

`shared/js/store.js` es el único módulo que llama a Supabase. Los demás usan:

- `CIYA_STORE.init(panel)` con `public`, `qr`, `recepcion`, `escenario` o `admin`.
- `CIYA_STORE.action(accion, payload, privada)` para `wish`, `group`, `checkin`,
  `donate`, `redeem`, `seal`, `score`, `door` y `moderate`.
- `CIYA_STORE.gold(secret)`, `CIYA_STORE.ranking()` y `CIYA_STORE.subscribe()`.
- `CIYA_STORE.groupDetails(id)` consulta `ciya_group_details(group_id)` al abrir
  una ficha pública de villancicos. La RPC incluye representante, nómina y
  obra musical junto con los datos resumidos del grupo.

Las RPC están definidas en `supabase/migrations/0002_rpc_read_write.sql`,
`0005_role_discovery.sql`, `0006_ciclo.sql` y `0007_group_details.sql`. El acceso se controla con
`ciya.roles`, `ciya_access(panel)` y `ciya_my_roles()`. La migración `0006`
agrega el ciclo (Nivelación a 8vo) a acreditaciones y grupos inscritos.

| Vista | Datos que entrega `ciya_read` |
| --- | --- |
| Pública | Marcador de las cinco carreras, totales, estado del cierre, orden de los grupos inscritos y deseos aprobados. |
| Recepción | Hasta 30 registros recientes de acreditación y donación por lista, estado de los QR Dorados y de los últimos 100 comprobantes. |
| Escenario | Grupos, evaluaciones, deseos aprobados y respaldo sellado con los boletos elegibles. |
| Administración | Grupos, evaluaciones, deseos para moderar y enlaces privados de los QR Dorados. |

## Contratos entre módulos

- Cada HTML funcional en `apps/web/` es un shell delgado con un punto de montaje:
  `#acceso-root` (`index.html`), `#portal-root` (`portal.html`), `#qr-root`,
  `#recepcion-root`, `#admin-root`, `#escenario-root` y `#schedule-list`
  (`cronograma.html`). Cada módulo renderiza su vista dinámica. El cronograma
  toma los horarios de `CIYA_DATA.cronograma` y los agrupa por fase.
- `index.html` autentica las cuentas de organización mediante
  `CIYA_STORE.loginAccount()` y muestra los paneles asignados al rol. El portal y
  la ruta QR admiten acceso directo. `CIYA_UI.initNav()` adapta el menú al rol y
  permite navegar entre las páginas públicas sin sesión.
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

- `portal.html`: `lantern-matrix.js` antes de `portal.js` para dibujar el letrero.
  `portal.js` se carga antes que `inscripciones.js` y `buzon.js`, para que
  `CIYA_PORTAL.mount()` cree `#inscripciones-root` y `#buzon-root` antes de que
  los formularios busquen esos contenedores.
- `escenario.html`: `encendido.js` antes que `escenario.js`, para que exista
  `CIYA_IGNITE` cuando `CIYA_STAGE.mount()` llame a `CIYA_IGNITE.mount()` y luego
  a `CIYA_IGNITE.setup()`.
