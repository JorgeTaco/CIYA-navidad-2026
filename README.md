# CIYA Navidad 2026

Aplicación web responsive para **CIYA 4.0 Ingenio que Ilumina la Navidad**, del
viernes 4 de diciembre de 2026. El frontend es HTML, CSS y JavaScript sin build;
el backend es el proyecto Supabase de `supabase/`.

## Qué cambió en esta reorganización

El comportamiento funcional se conservó. Cambió la ubicación y la propiedad de
cada archivo:

- Las seis páginas pasaron a `apps/web/`; siguen siendo los *shells* de entrada.
- `assets/css/app.css` se dividió en `shared/css/` (tokens, base, componentes y
  responsive) y en los CSS de cada módulo. Se respetó el orden original de la
  cascada cargando `responsive.css` al final.
- `assets/js/` se distribuyó entre `shared/js/` y los cuatro módulos. La lógica
  de inscripción y buzón salió de `portal.js` hacia `formularios-datos/`, y la
  lógica de puerto serial/cuenta/relé salió de `escenario.js` hacia
  `hardware-encendido/js/encendido.js`.
- `supabase-schema.sql` se dividió en tres migraciones ordenadas; `legacy-import.sql`
  pasó a ser la cuarta. Cada migración es una transacción independiente.
- `tests/draw.test.cjs` pasó a `tests/unit/` y ahora apunta a las nuevas rutas.
- `tools/local-stage.py` sirve `apps/web/` en `127.0.0.1:8080` y su lista de
  archivos permitidos incluye los nuevos CSS y JS.
- Se agregaron `scripts/check.sh`, `scripts/deploy-static.sh` y
  `tools/check-structure.py`. El detalle de arquitectura, decisiones y
  operación vive en `docs/`; hay un único `README.md` en la raíz.

## Estructura

```text
CIYA-navidad-2026/
├─ README.md                       # este documento: cambio, uso, operación y límites
├─ .env.example                    # nombres de variables; los secretos van a Supabase
├─ docs/
│  ├─ arquitectura.md              # contratos web ↔ RPC y entre módulos
│  ├─ decisiones/                  # ADR-001: Supabase como backend
│  ├─ operacion/                   # runbook del 4 de diciembre
│  └─ fuentes/                     # SRS v2, bases oficiales y ruta QR
├─ apps/web/                       # FRONTEND: publicar esta carpeta tal cual
│  ├─ index.html                   # portal + linterna + puntos de montaje
│  ├─ qr.html                      # ruta QR y QR Dorados
│  ├─ bases.html                   # bases oficiales
│  ├─ recepcion.html               # acreditación, donaciones, canjes y cierre
│  ├─ admin.html                   # curaduría, puertas, impresión e importación
│  ├─ escenario.html               # proyección, ranking, villancicos, ruleta y encendido
│  ├─ public/                      # favicon y archivos estáticos
│  ├─ shared/
│  │  ├─ css/ tokens.css · base.css · components.css · responsive.css
│  │  └─ js/  config.js · data.js · store.js · ui.js · sound.js
│  └─ modules/
│     ├─ portal-linterna/          # portal.css, linterna.css, qr.css / portal.js, qr.js
│     ├─ formularios-datos/        # forms.css, recepcion.css, admin.css / inscripciones.js, buzon.js, recepcion.js, admin.js
│     ├─ pantalla-gigante/         # ranking.css, villancicos.css, ruleta.css, respaldo.css / escenario.js, draw.js
│     └─ hardware-encendido/       # encendido.css / encendido.js
├─ supabase/                       # BACKEND: proyecto Supabase
│  ├─ config.toml                  # verify_jwt=false para ciya-receipts
│  ├─ migrations/
│  │  ├─ 0001_schema_core.sql      # esquema, tablas, roles y horarios
│  │  ├─ 0002_rpc_read_write.sql   # RPC de lectura, escritura, acceso y sorteo
│  │  ├─ 0003_receipts.sql         # cola de comprobantes y permisos
│  │  └─ 0004_legacy_import.sql    # importación del respaldo v1
│  ├─ functions/ciya-receipts/     # Edge Function → Brevo
│  └─ seeds/                       # datos ficticios
├─ tests/
│  ├─ unit/                        # reglas puras, incluido draw.test.cjs
│  ├─ integration/                 # RPC SQL con hora simulada
│  ├─ hardware/                    # mock de Web Serial
│  ├─ e2e/                         # navegadores a 360 px
│  └─ fixtures/                    # respaldos v1 y v2 ficticios
├─ tools/
│  ├─ local-stage.py               # consola local con Basic auth
│  └─ check-structure.py           # IDs y recursos locales
└─ scripts/
   ├─ check.sh                     # node --check + node --test + estructura
   └─ deploy-static.sh             # copia apps/web/ al destino indicado
```

## Contratos entre módulos

- `CIYA_STORE` en `shared/js/store.js` es el único acceso a Supabase.
- `CIYA_INSCRIPCIONES.init()` y `CIYA_BUZON.init()` montan sus formularios en el
  portal; `portal.js` no contiene esa lógica.
- `CIYA_IGNITE` expone el encendido (serial, cuenta, relé y tecla) y
  `CIYA_STAGE_RENDER` permite actualizar la proyección desde ese módulo.
- `CIYA_DRAW` valida el respaldo sellado versión 2 y gestiona la ruleta.

## Arranque y configuración

1. `python3 -m http.server 8000` desde `apps/web/` para inspeccionar el sitio.
   La ruta QR y la linterna funcionan sin Supabase.
2. Crear el proyecto Supabase, aplicar `supabase/migrations/` en orden y crear
   cuentas con roles en `ciya.roles`.
3. Completar `supabaseUrl` y `supabaseAnonKey` en `apps/web/shared/js/config.js`.
4. Desplegar `ciya-receipts`, configurar Brevo, Vault y `pg_cron` según
   `docs/operacion/runbook.md`.
5. Publicar `apps/web/` con `scripts/deploy-static.sh <destino>` o el hosting
   estático que se use.

## Operación

- Donaciones y canjes: 08:00–17:45. Acreditación: 17:00–17:45.
- A las 17:45, sellar desde recepción y descargar el JSON versión 2.
- Sin red: `python3 tools/local-stage.py` y abrir
  `http://127.0.0.1:8080/escenario.html?modo=local` con usuario `escenario`.
- 18:20: proyectar el QR de la linterna. 18:25–18:55: acto central.
  18:55–19:25: ruleta con 45 segundos de comparecencia.

Las horas son de Ecuador continental (UTC−05:00). Ante discrepancias entre los
documentos fuente prevalece el cronograma de las bases oficiales.

## Verificación

```bash
bash scripts/check.sh
```

Ese comando revisa la sintaxis de todos los JS, valida IDs duplicados, recursos
locales y migraciones. Si hay `node`, también ejecuta `tests/unit`; si no, usa
`esprima` para verificar la sintaxis. Las pruebas de integración, hardware y e2e
se documentan en `tests/` a medida que se implementan.

## Límites y decisiones a vigilar

- **Orden de scripts**: sin build, el orden de `<link>` y `<script>` en cada HTML
  define la cascada. Hoy funciona con este número de archivos; si el proyecto
  crece, conviene migrar a `type="module"` con `import`, sin necesidad de build.
- **`shared/`** no debe ser un basurero: solo queda ahí lo usado por dos o más
  módulos. Lo que usa un solo módulo se queda dentro de ese módulo. Los helpers
  `format.js` y `dom.js` siguen dentro de `ui.js` porque todavía no hay código
  suficiente para extraerlos.
- **Shells delgados**: `index.html` y `escenario.html` deben seguir siendo solo
  contenedores; la lógica va en `modules/` mediante puntos de montaje.
- **Migraciones**: nunca editar una migración ya aplicada; agregar `0005_...`.
  Los secretos solo en entorno o Vault, nunca en el repositorio.
- **Pruebas**: hoy hay cobertura real en `tests/unit`; `integration/`,
  `hardware/` y `e2e/` están preparados pero requieren más casos.
- **Offline**: no hay service worker porque el SRS excluyó la PWA. Desconectar
  la red después de cargar depende de la caché del navegador; está previsto
  documentar la comprobación en el ensayo del 3 de diciembre.
