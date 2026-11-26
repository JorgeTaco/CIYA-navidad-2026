# CIYA Navidad 2026

Aplicación web responsive para **CIYA 4.0 Ingenio que Ilumina la Navidad**, del
viernes 4 de diciembre de 2026. El frontend es HTML, CSS y JavaScript sin build;
el backend es el proyecto Supabase de `supabase/`.

## Qué cambió en esta reorganización

El comportamiento funcional se conservó. Cambió la ubicación y la propiedad de
cada archivo:

- Las cinco páginas funcionales pasaron a `apps/web/` y son *shells* delgados:
  header, footer y un punto de montaje (`#portal-root`, `#qr-root`,
  `#recepcion-root`, `#admin-root`, `#escenario-root`); el contenido lo renderiza
  el JS del módulo. `bases.html` sigue siendo un documento estático de consulta.
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
- Se agregaron `scripts/check.sh`, `scripts/deploy-static.sh`,
  `tools/check-structure.py` y `.github/workflows/deploy-pages.yml`, que publica
  `apps/web/` como raíz de GitHub Pages. El detalle de arquitectura, decisiones
  y operación vive en `docs/`; hay un único `README.md` en la raíz.

## Estructura

```text
CIYA-navidad-2026/
├─ README.md                       # este documento: cambio, uso, operación y límites
├─ .env.example                    # nombres de variables; los secretos van a Supabase
├─ .github/workflows/
│  └─ deploy-pages.yml             # publica apps/web/ en GitHub Pages
├─ docs/
│  ├─ arquitectura.md              # contratos web ↔ RPC y entre módulos
│  ├─ decisiones/                  # ADR-001: Supabase como backend
│  ├─ operacion/                   # runbook del 4 de diciembre
│  └─ fuentes/                     # SRS v2, bases oficiales y ruta QR
├─ apps/web/                       # FRONTEND: publicar esta carpeta tal cual
│  ├─ index.html                   # puerta de entrada: login por rol y acceso asistentes
│  ├─ portal.html                  # portal estudiantil + linterna + puntos de montaje
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
│     ├─ formularios-datos/        # forms.css, recepcion.css, admin.css / acceso.js, inscripciones.js, buzon.js, recepcion.js, admin.js
│     ├─ pantalla-gigante/         # ranking.css, villancicos.css, ruleta.css, respaldo.css / escenario.js, draw.js
│     └─ hardware-encendido/       # encendido.css / encendido.js
├─ supabase/                       # BACKEND: proyecto Supabase
│  ├─ config.toml                  # verify_jwt=false para ciya-receipts
│  ├─ migrations/
│  │  ├─ 0001_schema_core.sql      # esquema, tablas, roles y horarios
│  │  ├─ 0002_rpc_read_write.sql   # RPC de lectura, escritura, acceso y sorteo
│  │  ├─ 0003_receipts.sql         # cola de comprobantes y permisos
│  │  ├─ 0004_legacy_import.sql    # importación del respaldo v1
│  │  └─ 0005_role_discovery.sql   # RPC ciya_my_roles para acceso por rol
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
- Cada shell expone un punto de montaje y su JS dueño: `CIYA_ACCESO.mount()` en
  `#acceso-root` (`index.html`), `CIYA_PORTAL.mount()` en `#portal-root`
  (`portal.html`), `CIYA_RECEPCION.mount()` en `#recepcion-root`,
  `CIYA_ADMIN.mount()` en `#admin-root` y `CIYA_STAGE.mount()` en
  `#escenario-root`. La ruta QR usa `qr.js` sobre `#qr-root`.
- `CIYA_UI.initNav()` filtra las pestañas de navegación según el rol de la
  sesión (`asistente`, `recepcion`, `escenario`, `admin`), de modo que cada
  usuario vea únicamente las vistas correspondientes a su rol.
- `CIYA_INSCRIPCIONES.init()` y `CIYA_BUZON.init()` montan sus formularios dentro
  del portal en `#inscripciones-root` y `#buzon-root`; `portal.js` no contiene esa
  lógica.
- `CIYA_IGNITE.mount()` dibuja el panel de hardware dentro de `#encendido-root`;
  `CIYA_IGNITE.setup()` enlaza serial, cuenta, relé y tecla, y
  `CIYA_STAGE_RENDER` permite actualizar la proyección desde ese módulo.
- `CIYA_DRAW` valida el respaldo sellado versión 2 y gestiona la ruleta.

## Actores del sistema (stakeholders)

| Actor | Acceso y responsabilidad | Implementación |
| --- | --- | --- |
| Estudiantes y Docentes (Asistentes) | Portal móvil responsive: Mar de Linternas, inscripción de villancicos, buzón “Compilando Deseos 2027” y Ruta de Códigos QR. | `apps/web/portal.html`, `modules/portal-linterna/`, `modules/formularios-datos/js/inscripciones.js`, `modules/formularios-datos/js/buzon.js` y `qr.html`; acciones públicas `group` y `wish`. |
| Equipo de Recepción (Delegados Estudiantiles de Industrial) | Panel desde celular o laptop, 17:00–17:45: registrar asistentes, contabilizar donaciones por carrera y validar QR Dorados. | `recepcion.html` y `recepcion.js`; rol `recepcion`; acciones `checkin`, `donate`, `redeem` y `seal`; franjas en `ciya.event`. |
| Equipo de Producción / Escenario (Sistemas y Software) | Consola conectada a proyector y Arduino/ESP32: ranking en vivo, villancicos, Encendido 5 en 1 y Gran Ruleta Digital. | `escenario.html`, `modules/pantalla-gigante/` y `modules/hardware-encendido/`; rol `escenario`; modo local sin red. |
| Docentes Organizadores y Asociación Estudiantil (Curadores) | Vista privada del buzón para moderar, aprobar y exportar las frases en enero. | `admin.html` y `admin.js`; rol `admin`; acción `moderate`; CSV de deseos aprobados o todos. |

Los permisos no son solo visuales: `ciya_access` y `ciya_write` validan roles y
horarios en `supabase/migrations/0002_rpc_read_write.sql`. La exportación en
enero es la actividad operativa prevista; no hay un bloqueo de fecha que impida
exportar antes, porque la curaduría puede realizarse apenas se reciben las frases.

## Requisitos funcionales — Módulo A: Portal y Mar de Linternas

| RF | Cumplimiento | Evidencia |
| --- | --- | --- |
| RF-01 Acceso inmediato sin instalación | Sí | Sitio estático servido por URL/QR desde GitHub Pages; HTML/CSS/JS puro, sin build, `manifest`, service worker ni tiendas de aplicaciones. |
| RF-02 Selección de carrera | Sí | Las 5 carreras están en `apps/web/shared/js/data.js:9` con `color` e `icono`; `applyLantern()` aplica `--lantern-color` y muestra el icono en `#lantern-carrera`. |
| RF-03 Mensajes personalizables | Sí | Frases predefinidas (“Feliz Navidad CIYA”, “Orgullo Industrial”, “Compilando el 2027”) y campo libre de 60 caracteres; tipografía `clamp(2rem, 9vw, 7rem)`, alto contraste y animación `lanternPulse` de 1,6 s con botón “Sincronizar destello”. |
| RF-04 Pantalla completa y ejecución local | Sí | El botón “Pantalla completa” usa `requestFullscreen()` con vista CSS de respaldo. En `portal.html?modo=linterna#linterna` (o `index.html?modo=linterna#linterna`), `init()` termina antes de `Store.init()`: color, carrera, mensaje y parpadeo se resuelven solo en JS/CSS del navegador. |
| RF-05 Ruta de códigos QR | Sí | `qr.html` y `qr.js` sirven mensajes, trivias y memes; `ciya.gold` tiene 3 ranuras y admin genera las URLs `qr.html#dorado=<secret>` para los QR Dorados. |

Matiz de RF-04: al no existir service worker —la PWA fue excluida del SRS—, la
continuidad tras cortar el Wi-Fi depende de que la página ya haya sido cargada y
quede en caché del navegador. La prueba real en Chrome Android, Safari iOS y Edge
está prevista en el ensayo del 3 de diciembre (`docs/operacion/runbook.md`).

## Cómo ejecutar el proyecto

El frontend **no lee `.env`**: `.env.example` es solo la plantilla de secretos
para Supabase/Edge Functions. Las dos URLs públicas que necesita el navegador se
ponen en `apps/web/shared/js/config.js`.

### Caso A: todavía sin variables reales de Supabase

Dejar `supabaseUrl: ''` y `supabaseAnonKey: ''` como están en el repositorio y
servir solo el frontend:

```bash
cd apps/web
python3 -m http.server 8000
```

Abrir `http://127.0.0.1:8000/index.html`. El sistema inicia en la pantalla de
acceso por rol:

- **Estudiantes y Docentes**: botón **Ingresar como Estudiante / Docente** para
  entrar a `portal.html`, la linterna (`portal.html?modo=linterna#linterna`), las
  bases (`bases.html`) y la ruta QR (`qr.html`).
- **Modo demo local (solo mientras `supabaseUrl` y `supabaseAnonKey` estén vacíos)**:
  permite probar cada rol visualmente con `recepcion@ciya.local`,
  `escenario@ciya.local` o `admin@ciya.local` (clave `ciya2026`). En cuanto se
  configura Supabase en `config.js`, el modo demo se desactiva automáticamente.

Qué no ocurre en la nube mientras Supabase esté sin configurar:

- Los datos de demostración viven únicamente en el `sessionStorage` del
  navegador y no se guardan en Postgres ni envían correos.
- Los QR Dorados devuelven una clave de prueba local sin validar en servidor.

Para revisar la consola de escenario sin red ni Supabase:

```bash
python3 tools/local-stage.py
```

Pedir una contraseña local de al menos 8 caracteres ASCII y abrir
`http://127.0.0.1:8080/escenario.html?modo=local` con usuario `escenario`. Ese
servidor sirve únicamente los archivos de escenario y no almacena nada en la nube.

### Caso B: con Supabase configurado

1. Completar en `apps/web/shared/js/config.js` los valores públicos del proyecto:

```js
window.CIYA_CONFIG = {
  supabaseUrl: 'https://<ref>.supabase.co',
  supabaseAnonKey: '<anon-public-key>',
  syncIntervalMs: 3000,
  relayCommand: 'RELAY_ON\n',
  serialBaudRate: 9600
};
```

   Usar solo la clave `anon` pública. **Nunca** poner `service_role`, tokens de
   Brevo ni secretos en este archivo ni en el frontend.

2. Instalar la CLI de Supabase (solo la primera vez).

   **Opción A — sin npm, descarga directa del binario (recomendada en Linux):**

   ```bash
   curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz -o supabase.tar.gz
   tar -xf supabase.tar.gz supabase
   sudo mv supabase /usr/local/bin/supabase
   rm supabase.tar.gz
   supabase --version
   ```

   **Opción B — con npm (requiere Node.js instalado):**

   Si el sistema dice `npm: instrucción no encontrada`, primero instalar Node.js.
   En **Fedora / RHEL**:

   ```bash
   sudo dnf install nodejs-npm -y
   ```

   En **Ubuntu / Debian**:

   ```bash
   sudo apt install npm -y
   ```

   Luego instalar la CLI:

   ```bash
   npm install -g supabase
   ```

3. Vincular el proyecto local con el proyecto remoto de Supabase y aplicar las migraciones:

```bash
supabase link --project-ref <ref>
supabase db push
```

   Reemplazar `<ref>` con el ID del proyecto (se ve en **Project Settings → General → Reference ID** en el dashboard de Supabase, por ejemplo `abcdefghijklmnopqrst`).

   `supabase db push` aplica en orden los 5 archivos de `supabase/migrations/`:

   | Archivo | Qué crea |
   |---------|----------|
   | `0001_schema_core.sql` | Schema `ciya`, tablas, roles y horarios |
   | `0002_rpc_read_write.sql` | Funciones RPC de lectura, escritura y sorteo |
   | `0003_receipts.sql` | Cola de comprobantes por correo |
   | `0004_legacy_import.sql` | Importador de respaldo v1 |
   | `0005_role_discovery.sql` | RPC `ciya_my_roles()` para acceso por rol |

   **Alternativa sin CLI:** abrir el editor SQL de Supabase (**SQL Editor → New query**) y ejecutar cada archivo en el orden indicado, uno por uno.

4. Desplegar la Edge Function de comprobantes:

```bash
supabase functions deploy ciya-receipts
```

5. Crear las cuentas en Supabase Auth y asignar roles. Ejemplo para recepción:

```sql
insert into ciya.roles (user_id, panel)
select id, 'recepcion' from auth.users where email = 'correo@ejemplo.com';
```

   Repetir con `escenario` y `admin` según corresponda.

6. Configurar los secretos de `ciya-receipts`, Brevo, Vault y `pg_cron` según
   `docs/operacion/runbook.md`; los nombres están en `.env.example`.

7. Servir o publicar el frontend:

```bash
cd apps/web
python3 -m http.server 8000
```

   O desde la raíz: `bash scripts/deploy-static.sh <destino>`.

Con la configuración correcta, la barra indica **Sincronización activa** y se
puede iniciar sesión en recepción, escenario y administración. Si las claves
están puestas pero el proyecto no responde, la barra indica **Sin sincronización**
y las operaciones muestran el error de conexión.

### Publicación en GitHub Pages

El repositorio incluye `.github/workflows/deploy-pages.yml`, que toma `apps/web/`
y lo publica como raíz del sitio. En GitHub entrar a **Settings → Pages → Build
and deployment → Source** y elegir **GitHub Actions**. Después, cada push a
`main` —o la ejecución manual del workflow— actualiza
`https://jorgetaco.github.io/CIYA-navidad-2026/`.

Antes aparecía el `README.md` porque GitHub Pages buscaba `index.html` en la
raíz y el archivo quedó en `apps/web/index.html:1`. Para dominio propio, agregar
un archivo `CNAME` dentro de `apps/web/` con el dominio deseado.

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
- **Shells delgados**: los cinco HTML funcionales de `apps/web/` solo cargan
  CSS/JS y definen un contenedor; la lógica y el markup dinámico viven en
  `modules/` mediante puntos de montaje. `bases.html` es la excepción: contenido
  oficial estático sin JS. El orden de scripts es parte del contrato: en `portal.html`,
  `portal.js` se carga antes que `inscripciones.js` y `buzon.js` para que el
  portal cree sus raíces; en `escenario.html`, `encendido.js` se carga antes que
  `escenario.js` para exponer `CIYA_IGNITE` y permitir `CIYA_STAGE.mount()`.
- **Migraciones**: nunca editar una migración ya aplicada; agregar `0005_...`.
  Los secretos solo en entorno o Vault, nunca en el repositorio.
- **Pruebas**: hoy hay cobertura real en `tests/unit`; `integration/`,
  `hardware/` y `e2e/` están preparados pero requieren más casos.
- **Offline**: no hay service worker porque el SRS excluyó la PWA. Desconectar
  la red después de cargar depende de la caché del navegador; está previsto
  documentar la comprobación en el ensayo del 3 de diciembre.
