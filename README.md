# CIYA Navidad 2026

Aplicación web responsive para **CIYA 4.0 Ingenio que Ilumina la Navidad**, del
viernes 4 de diciembre de 2026. El frontend es HTML, CSS y JavaScript sin build;
el backend es el proyecto Supabase de `supabase/`.

## Rediseño visual

- El HTML de referencia proporcionado define la paleta azul hielo, azul marino, rojo carmesí y verde, la tipografía y la composición del portal. La ilustración del Cotopaxi y el motivo de circuitos se reutilizan como SVG locales. Plus Jakarta Sans y los Material Symbols Outlined utilizados se sirven en WOFF2 con sus licencias en `apps/web/shared/fonts/`.
- El selector de acceso permanece en la portada. El portal presenta la ilustración, métricas, tarjetas de actividades, Mar de Linternas y accesos rápidos. Las métricas indican si están consultando, en vivo o mostrando la última consulta disponible. El botón principal abre el **Cronograma**, y las URL antiguas de bases siguen redirigiendo al programa.
- La navegación pública se muestra abajo en móvil y en la cabecera en escritorio. **Acceso** abre el selector con `index.html?modo=acceso` también después de entrar como asistente. Recepción, Administración y Escenario muestran la navegación habilitada para la cuenta. En la consola local se oculta esa barra.
- El Mar de Linternas usa los tonos y el marco LED del ejemplo. Los botones **Mín.**, **Med.** y **Máx.** ajustan el brillo visual y guardan la preferencia localmente. La URL directa dibuja solo la linterna y permite cambiar de mensaje, carrera y nivel de brillo tras desconectar la red. La pausa de la marquesina, las partes de movimiento reducido y la pantalla completa siguen disponibles en sus modos correspondientes.
- Ruta QR, Cronograma, Recepción, Administración y Escenario comparten tarjetas, formularios, tablas y estados visuales. La superficie proyectada permanece oscura y conserva la relación 16:9. El servidor de escenario sirve las fuentes desde la laptop. Se conservan los contratos de Supabase, los archivos de respaldo y las exportaciones.

## Qué cambió en esta reorganización

El comportamiento funcional se conservó. Cambió la ubicación y la propiedad de
cada archivo:

- Las páginas funcionales viven en `apps/web/` y cada módulo renderiza su contenido
  en un punto de montaje. `cronograma.html` muestra las actividades del evento
  con filtros por momento del día y detalles desplegables.
- `assets/css/app.css` se dividió en `shared/css/` (tokens, base, componentes y
  responsive) y en los CSS de cada módulo. Se respetó el orden original de la
  cascada cargando `responsive.css` al final.
- `assets/js/` se distribuyó entre `shared/js/` y los cuatro módulos. La lógica
  de inscripción y buzón salió de `portal.js` hacia `formularios-datos/`, y la
  lógica de puerto serial/cuenta/relé salió de `escenario.js` hacia
  `hardware-encendido/js/encendido.js`.
- `supabase-schema.sql` se dividió en migraciones ordenadas; `legacy-import.sql`
  pasó a ser la cuarta y `0005_role_discovery.sql` la quinta. Cada migración es
  una transacción independiente.
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
│  ├─ cronograma.html              # programa interactivo de actividades
│  ├─ recepcion.html               # acreditación, donaciones, canjes y cierre
│  ├─ admin.html                   # curaduría, puertas, impresión e importación
│  ├─ escenario.html               # proyección, ranking, villancicos, ruleta y encendido
│  ├─ shared/
│  │  ├─ css/ tokens.css · base.css · components.css · responsive.css
│  │  ├─ fonts/                     # fuentes WOFF2 locales y licencias
│  │  └─ js/  config.js · data.js · store.js · ui.js · sound.js
│  └─ modules/
│     ├─ portal-linterna/          # portal, ruta QR y letrero de focos
│     ├─ cronograma/               # cronograma.css y cronograma.js
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
│  └─ functions/ciya-receipts/     # Edge Function → Brevo
├─ tests/
│  └─ unit/                        # draw.test.cjs y ui.test.cjs
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
| RF-02 Selección de carrera | Sí | Los focos del letrero y su rótulo usan el color de la carrera seleccionada. |
| RF-03 Mensajes personalizables | Sí | Frases predefinidas o texto libre de hasta 60 caracteres en una matriz de focos. El letrero se adapta automáticamente al giro del dispositivo. En horizontal usa una línea y en vertical aprovecha hasta tres. Los mensajes que exceden el espacio se desplazan con pausa o se muestran por partes si el dispositivo solicita movimiento reducido. |
| RF-04 Pantalla completa y ejecución local | Sí | El botón “Pantalla completa” usa `requestFullscreen()` con vista CSS de respaldo. El QR `portal.html?modo=linterna#linterna` abre el letrero y el navegador dibuja los focos con recursos locales. |
| RF-05 Ruta de códigos QR | Sí | `qr.html` y `qr.js` sirven mensajes, trivias y memes; `ciya.gold` tiene 3 ranuras y admin genera las URLs `qr.html#dorado=<secret>` para los QR Dorados. |

Matiz de RF-04: al no existir service worker —la PWA fue excluida del SRS—, la
continuidad tras cortar el Wi-Fi depende de que la página ya haya sido cargada y
quede en caché del navegador. La prueba real en Chrome Android, Safari iOS y Edge
está prevista en el ensayo del 3 de diciembre (`docs/operacion/runbook.md`).

## Cómo ejecutar el proyecto

El frontend **no lee `.env`**: `.env.example` solo lista los secretos de la Edge
Function. Los dos valores públicos que necesita el navegador **ya están llenos**
en `apps/web/shared/js/config.js`: la URL del proyecto
`jrrvsouvnuorzucyeuzf`, su anon key, `syncIntervalMs: 3000`,
`relayCommand: 'RELAY_ON\n'` y `serialBaudRate: 9600`. No vuelvas a pegar la
anon key: es pública por diseño y ya activa el modo remoto. **Nunca** pongas
`service_role`, tokens de Brevo ni secretos en ese archivo ni en el frontend.

### Antes de ejecutar: migraciones de la base de datos

Si la base de datos aún no tiene el esquema, la forma más simple es copiar y
pegar cada archivo de `supabase/migrations/` en **Supabase → SQL Editor → New
query** y ejecutarlo **uno por uno**, en este orden exacto:

```text
0001_schema_core.sql       esquema ciya, tablas, roles y horarios
0002_rpc_read_write.sql    RPC de lectura, escritura, acceso y sorteo
0003_receipts.sql          cola de comprobantes por correo
0004_legacy_import.sql     importador del respaldo v1
0005_role_discovery.sql    RPC ciya_my_roles() para acceso por rol
```

No pegar los cinco juntos. Si uno marca error, detenerse y corregir antes de
seguir. Si alguno ya está aplicado, omitirlo y continuar desde el siguiente;
nunca editar una migración ya aplicada. Con esto listo, seguir con el servidor
estático de abajo.

### Ejecutar el sitio con Supabase configurado

No se necesita Node, npm ni build. Con el repositorio ya clonado:

```bash
cd /home/eser/Documentos/GitHub/CIYA-navidad-2026
git pull --ff-only
cd apps/web
python3 -m http.server 8000
```

Abrir `http://127.0.0.1:8000/index.html`. En el portal y los paneles conectados,
el indicador muestra **Sincronización activa** cuando `ciya_read` responde y
**Sin sincronización** si se pierde la conexión.

En la pantalla de acceso hay dos entradas:

- **Estudiantes y Docentes**: botón **Ingresar como Estudiante / Docente**. Lleva
  a `portal.html`, desde donde se usan la linterna
  (`portal.html?modo=linterna#linterna`), la Ruta QR (`qr.html`) y el cronograma
  (`cronograma.html`). El acceso es libre.
- **Organización**: correo y contraseña de una cuenta creada en Supabase Auth
  con al menos un rol en `ciya.roles` (`recepcion`, `escenario` o `admin`). Si la
  cuenta tiene un solo rol, entra directo a ese panel; si tiene varios, muestra
  las tarjetas de los paneles permitidos.

Las URL públicas también se pueden abrir directamente:

```text
http://127.0.0.1:8000/portal.html
http://127.0.0.1:8000/qr.html
http://127.0.0.1:8000/cronograma.html
```

Para copiar el frontend a un servidor estático:

```bash
cd /home/eser/Documentos/GitHub/CIYA-navidad-2026
bash scripts/deploy-static.sh /ruta/al/destino
```

El script prepara el frontend y las redirecciones de compatibilidad en
`/ruta/al/destino`. El esquema de Supabase y la Edge Function se despliegan por
separado.

Para la consola de escenario sin red:

```bash
cd /home/eser/Documentos/GitHub/CIYA-navidad-2026
python3 tools/local-stage.py
```

Pedir una contraseña local de al menos 8 caracteres ASCII y abrir
`http://127.0.0.1:8080/escenario.html?modo=local` con usuario `escenario`. Ese
servidor sirve únicamente los archivos de escenario y no almacena nada en la nube.

### Si el backend aún no está listo

Estos pasos solo son necesarios la primera vez o si el proyecto Supabase no tiene
el esquema, los roles o la función de comprobantes. Si ya están aplicados,
**omitir `supabase db push`**: nunca editar una migración ya aplicada.

Instalar la CLI de Supabase (solo la primera vez). Sin npm, en Linux:

```bash
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz -o supabase.tar.gz
tar -xf supabase.tar.gz supabase
sudo mv supabase /usr/local/bin/supabase
rm supabase.tar.gz
supabase --version
```

Con npm, si ya hay Node.js instalado:

```bash
sudo dnf install nodejs-npm -y   # Fedora / RHEL
sudo apt install npm -y          # Ubuntu / Debian
npm install -g supabase
```

Iniciar sesión, vincular, aplicar migraciones y desplegar la Edge Function:

```bash
cd /home/eser/Documentos/GitHub/CIYA-navidad-2026
supabase login
supabase link --project-ref jrrvsouvnuorzucyeuzf
supabase db push
supabase functions deploy ciya-receipts
```

`supabase db push` aplica en orden los 5 archivos de `supabase/migrations/`:

| Archivo | Qué crea |
|---------|----------|
| `0001_schema_core.sql` | Schema `ciya`, tablas, roles y horarios |
| `0002_rpc_read_write.sql` | Funciones RPC de lectura, escritura, acceso y sorteo |
| `0003_receipts.sql` | Cola de comprobantes por correo |
| `0004_legacy_import.sql` | Importador de respaldo v1 |
| `0005_role_discovery.sql` | RPC `ciya_my_roles()` para acceso por rol |

Si las migraciones ya están aplicadas, omitir `supabase db push`. Si falta
alguna, no editar los archivos anteriores: agregar una migración nueva.

### Alternativas sin CLI

Opción 1: abrir **SQL Editor → New query** en el dashboard de Supabase y ejecutar
cada archivo de `supabase/migrations/` en el orden de la tabla anterior, uno por
uno. Cada archivo es su propia transacción `begin; ... commit;`.

Opción 2: usar `psql` contra la conexión directa de Postgres (esta máquina ya
tiene `psql`; no usa la anon key). Copiar la URI completa de
**Project Settings → Database → Connection string → URI**, reemplazar la
contraseña y pegarla cuando el comando la pida; no compartirla ni guardarla en el
repositorio:

```bash
cd /home/eser/Documentos/GitHub/CIYA-navidad-2026
read -rsp 'URI directa de Postgres: ' DATABASE_URL; printf '\n'
export DATABASE_URL
for f in supabase/migrations/000*.sql; do
  psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f "$f"
done
unset DATABASE_URL
```

Usar la conexión directa al puerto `5432`, no el pooler transaccional, para DDL.
Si algún archivo falla, detenerse antes de continuar. Verificación rápida:

```bash
psql "$DATABASE_URL" -X -c '\dt ciya.*'
psql "$DATABASE_URL" -X -c "select proname from pg_proc where proname like 'ciya_%' order by proname"
```

Crear cuentas en **Authentication → Users** y asignar roles. Ejemplo para
recepción:

```sql
insert into ciya.roles (user_id, panel)
select id, 'recepcion' from auth.users where email = '<correo-del-organizador>';
```

Repetir con `escenario` y `admin` según corresponda; una misma cuenta puede
tener varios roles. Configurar secretos de la Edge Function:

```bash
supabase secrets set CIYA_WORKER_SECRET='<secreto>' BREVO_API_KEY='<clave>' CIYA_SENDER_EMAIL='<correo-del-remitente>'
```

La programación con `pg_cron`/`pg_net` y el resto de la operación están en
`docs/operacion/runbook.md`; los nombres de variables están en `.env.example`.

### Sin modo demo

El portal, la linterna, el cronograma y los QR informativos pueden abrirse sin
cuenta ni configuración de Supabase. El ranking en vivo, los formularios, el
canje y los paneles de organización requieren conexión al proyecto configurado.
La consola de escenario puede importar un respaldo sellado y operar sin red
mediante `tools/local-stage.py`.

### Publicación en GitHub Pages

El repositorio incluye `.github/workflows/deploy-pages.yml`, que toma `apps/web/`
y lo publica como raíz del sitio. En GitHub entrar a **Settings → Pages → Build
and deployment → Source** y elegir **GitHub Actions**. Después, cada push a
`main` —o la ejecución manual del workflow— actualiza
`https://jorgetaco.github.io/CIYA-navidad-2026/`.

El workflow ejecuta `scripts/check.sh`, empaqueta el frontend y comprueba las
rutas publicadas. La entrada está en `/` y el portal en `/portal.html`, ambos
bajo la URL del proyecto. Los enlaces anteriores bajo `/apps/web/` redirigen a
la ruta correspondiente y conservan sus parámetros y fragmentos.

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
cd /home/eser/Documentos/GitHub/CIYA-navidad-2026
bash scripts/check.sh
```

Ese comando revisa la sintaxis de todos los JS, valida IDs duplicados, recursos
locales, orden de carga y migraciones. Ejecuta `node --test tests/unit/*.test.cjs`
y `unittest` de Python. El conjunto offline cubre la linterna, el respaldo
sellado, la recuperación del sorteo, el audio local y el puerto serial simulado.
Las pruebas Python comprueban la autenticación del servidor de escenario y la
carga de todos sus archivos mediante una conexión de bucle local.

Para comprobar el rediseño se comparó el portal con la referencia a 390 px. En
Chromium se recorrieron las vistas públicas y los tres paneles a 360, 768 y
1440 px, con respuestas de prueba para los roles, los formularios y los QR
Dorados. También se comprobó la recuperación de las métricas después de un
corte, el brillo y la orientación de la linterna sin red. La consola de
laptop se probó sin acceso externo con JSON de prueba, ranking, ruleta, audio
y disparo simulado. Las pruebas del servidor local incluyen las fuentes de
escenario.

## Límites y decisiones a vigilar

- **Orden de scripts**: sin build, el orden de `<link>` y `<script>` en cada HTML
  define la cascada. Hoy funciona con este número de archivos; si el proyecto
  crece, conviene migrar a `type="module"` con `import`, sin necesidad de build.
- **`shared/`** no debe ser un basurero: solo queda ahí lo usado por dos o más
  módulos. Lo que usa un solo módulo se queda dentro de ese módulo. Los helpers
  `format.js` y `dom.js` siguen dentro de `ui.js` porque todavía no hay código
  suficiente para extraerlos.
- Las páginas de `apps/web/` cargan CSS y JS y definen contenedores. La lógica
  y el contenido dinámico viven en `modules/`. En `portal.html` se carga
  `lantern-matrix.js` antes de `portal.js`, seguido de `inscripciones.js` y
  `buzon.js`. En `escenario.html`, `encendido.js` se carga antes de `escenario.js`
  para exponer `CIYA_IGNITE` y permitir `CIYA_STAGE.mount()`.
- **Migraciones**: nunca editar una migración ya aplicada; agregar una nueva,
  por ejemplo `0006_...`. Los secretos solo en entorno o Vault, nunca en el
  repositorio.
- **Pruebas**: la cobertura actual vive en `tests/unit`. No hay carpetas
  auxiliares vacías: los nuevos casos se agregan ahí cuando se necesiten.
- **Offline**: no hay service worker porque el SRS excluyó la PWA. Desconectar
  la red después de cargar depende de la caché del navegador; está previsto
  documentar la comprobación en el ensayo del 3 de diciembre.
