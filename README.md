# CIYA Navidad 2026

Aplicación web responsive para la Facultad de Ciencias de la Ingeniería y Aplicadas (CIYA), desarrollada para el evento **“CIYA 4.0 Ingenio que Ilumina la Navidad 2026”** del viernes 4 de diciembre de 2026.

El proyecto centraliza la operación logística, participativa y escénica del evento en una sola plataforma accesible desde el navegador del celular mediante QR o enlace directo, sin instalación de PWA ni APK. El núcleo del encendido del árbol funciona en modo local/offline.

## Contexto general

La solución se construyó a partir de tres documentos oficiales:

1. **SISTEMA CIYA 4-0 — Aplicación Web Responsive V1** (especificación de requisitos, versión 2.0): define 17 requisitos funcionales, 7 no funcionales, 4 micro-equipos, stack gratuito y ensayo obligatorio del 3 de diciembre.
2. **V1 — Bases Oficiales de Concursos y Actividades**: reglamento de las cinco actividades oficiales, ponderaciones, premios y cronograma.
3. **Ruta de Códigos QR de CIYA Navidad 2026**: mensajes docentes, trivias, memes y tres QR Dorados.

Cuando los documentos presentan horarios distintos, se aplica el cronograma de las **bases oficiales**: villancicos 17:45–18:25, acto central y encendido 18:25–18:55, sorteo 18:55–19:25. El protocolo técnico proyecta el QR del Mar de Linternas a las 18:20, cinco minutos antes del acto.

## Tecnologías utilizadas

| Capa | Tecnología | Uso |
| --- | --- | --- |
| Frontend | HTML5, CSS3, JavaScript ES2017 puro | Seis páginas estáticas, sin compilación ni dependencias externas. |
| Diseño | CSS propio con variables, Grid/Flexbox y media queries | Mobile-first desde 360 px, consola de escenario 16:9 y optimización nocturna. |
| Estado | LocalStorage + `BroadcastChannel` + evento `storage` | Persistencia local y sincronización instantánea entre pestañas del mismo navegador. |
| Base de datos opcional | Supabase Free (REST sobre tabla `ciya_state`) | Sincronización entre dispositivos por sondeo de 3 segundos; última escritura ganante por `updatedAt`. |
| Audio | Web Audio API | Beeps, cuenta regresiva, música de encendido y suspenso de la ruleta generados en el navegador. |
| Micrófono | `getUserMedia` + `AnalyserNode` | Aplausómetro con respaldo manual. |
| Hardware | Web Serial API | Lectura del sensor Arduino/ESP32 y pulso al relé de Electricidad. |
| Despliegue | Vercel / Netlify (sitio estático) | Costo $0, sin build command; también funciona con cualquier servidor estático. |

Se eligió la alternativa permitida por la especificación “HTML5 / CSS / JavaScript puro” en lugar de React + Vite porque no se requiere toolchain de Node, no hay dependencias que cargar en una red congestionada y el modo offline queda garantizado tras la primera carga.

## Estructura del repositorio

```text
CIYA-navidad-2026/
├── index.html            Portal estudiantil
├── recepcion.html        Panel de recepción, donaciones y QR Dorados
├── escenario.html        Consola de pantalla gigante
├── admin.html            Curaduría y evaluación privada
├── qr.html               Índice y vistas individuales de la Ruta QR
├── bases.html            Bases oficiales completas
├── supabase-schema.sql   Esquema y políticas RLS para Supabase
└── assets/
    ├── css/app.css       Sistema visual completo
    └── js/
        ├── config.js     Configuración editable
        ├── data.js       Datos oficiales y contenido QR
        ├── store.js      Estado, reglas de negocio y sincronización
        ├── ui.js         Toasts, PIN, exportaciones y utilidades
        ├── sound.js      Sonidos sintetizados
        ├── portal.js     Lógica del portal
        ├── recepcion.js  Lógica de recepción
        ├── escenario.js  Lógica de escenario y hardware
        ├── admin.js      Lógica administrativa
        └── qr.js         Lógica de la Ruta QR
```

## Funcionalidades por interfaz

### 1. Portal estudiantil (`index.html`)

- **Mar de Linternas**: elección entre las cinco carreras con color y sigla propios, frases predefinidas, mensaje libre de hasta 60 caracteres, tipografía gigante, alto contraste y parpadeo suave sincronizado mediante desfase de animación.
- **Pantalla completa**: uso de Fullscreen API con fallback de clase CSS para navegadores que no la soportan. Botón explícito de salida.
- **Ejecución local**: colores, carrera, mensaje y parpadeo se procesan 100% en JavaScript del navegador; tras la carga no dependen del Wi-Fi.
- **Registro para el sorteo**: nombre, cédula única, correo único, carrera y mensaje opcional para el Muro de la Empatía. Genera comprobante con desglose de boletos, botón `mailto:` y copia al portapapeles.
- **Inscripción a villancicos**: nombre artístico, nómina de integrantes, carrera(s), canción y una de las tres modalidades oficiales. Muestra el orden de presentación y marca las inscripciones realizadas durante el evento si pasó el plazo del 3 de diciembre.
- **Buzón Compilando Deseos 2027**: nombre, rol (estudiante/docente/personal), carrera/área y frase; los envíos quedan pendientes de curaduría.
- **Muro de la Empatía**: mensajes breves asociados a una cédula registrada; cada mensaje suma 1 boleto.
- **Puertas Decoradas**: espacios asignados por carrera y matriz de evaluación 30/30/25/15.
- **Copa Solidaria**: ranking público en vivo con puntos, juguetes, fundas y regla de desempate.
- **Resumen global**: contadores de asistentes, boletos, grupos y deseos.

### 2. Panel de recepción (`recepcion.html`)

- Acceso protegido por PIN.
- **Registro rápido** en un solo flujo: asistente, carrera, correo, mensaje de muro y donación opcional (juguete o funda, cantidad y carrera beneficiada).
- **Ranking en vivo** con desglose y exportación CSV.
- **Validación de QR Dorados**: selección de `CIYA-ORO-01/02/03`, cédula del estudiante y declaración de juego limpio. Cada código se desactiva al primer canje; máximo un QR por estudiante; +3 boletos automáticos.
- **Listados** de asistentes y donaciones con boletos calculados.
- **Cierre de recepción** a las 17:45, que habilita operativamente el respaldo local desde escenario.

### 3. Consola de escenario (`escenario.html`)

Pantalla 16:9 con seis pestañas:

- **Villancicos**: orden de presentación, cronómetro regresivo de 3 minutos, aplausómetro con micrófono o control manual, calificación del jurado 30/30/20/20 y guardado de puntajes.
- **Ranking**: barras animadas con totales por carrera y desempate por juguetes operativos y donantes únicos.
- **Deseos 2027**: rotación automática cada 8 segundos de las frases aprobadas durante la chocolatada.
- **Encendido 5 en 1**: conexión serial con Arduino/ESP32, disparo por señal del sensor, cuenta regresiva de 10 segundos con audio, secuencia Industrial → Hidráulica → Electromecánica → Sistemas → Electricidad, pulso al relé y tecla de emergencia con barra espaciadora. Funciona sin red.
- **Gran Ruleta Digital**: ponderación real de todos los boletos (base, muro, donaciones y QR Dorados), giro animado con audio de suspenso, conteo de 45 segundos para presentarse, control de premio entregado, control de ganador ausente con nuevo giro y registro histórico. Un estudiante solo puede ganar un premio.
- **Respaldo local**: descarga e importación de JSON con todo el estado (boletos, donaciones, marcador, ganadores y configuración operativa).

### 4. Panel administrativo (`admin.html`)

- Acceso privado por PIN para docentes organizadores y asociación estudiantil.
- **Curaduría del buzón**: aprobación o descarte de frases y exportación CSV de aprobadas o de todas.
- **Evaluación de puertas**: matriz 30/30/25/15 por carrera, observaciones y ranking final.
- **Revisión de calificaciones** de villancicos con desglose por criterio y nivel de aplauso.

### 5. Ruta de Códigos QR (`qr.html`)

Contenido de los códigos distribuidos en gradas, pasillos, bar, laboratorios y baños:

- 7 mensajes navideños (general, una por carrera y solidario).
- 5 trivias con opción correcta y respuesta inmediata.
- 5 ideas de memes con plantillas.
- 3 QR Dorados con código único, instrucciones de canje y estado `Disponible`/`Canjeado`.
- Botón fijo en cada vista hacia el Buzón 2027 y el Modo Linterna.
- Listado imprimible y URL base copiable para generar los códigos QR.

### 6. Bases oficiales (`bases.html`)

Transcripción íntegra de las cinco actividades, criterios, premios sugeridos, reglas de juego limpio, disposiciones finales y cronograma oficial.

## Reglas de negocio implementadas

| Concepto | Valor |
| --- | --- |
| Boleto base | 1 por ingreso presencial con mensaje en el Muro de la Empatía |
| Mensaje adicional en el muro | 1 boleto |
| Juguete funcional | 5 puntos para la carrera y 5 boletos para el donante |
| Funda de caramelos | 2 puntos para la carrera y 2 boletos para el donante |
| QR Dorado | 3 boletos adicionales, válido solo para el primero en canjearlo |
| Desempate solidario | Mayor cantidad de juguetes operativos y luego mayor número de donantes únicos |
| Validez del sorteo | 45 segundos para presentarse con identificación; giro inmediato si hay ausencia |
| Límite de premios | 1 premio por estudiante |

## Configuración necesaria

### 1. PIN de acceso

Editar `assets/js/config.js`:

```js
adminPin: 'ciya2026'
```

Cambiar ese valor antes del evento. Aplica a recepción, escenario y administración. Las sesiones se guardan solo en `sessionStorage` y se cierran con “Cerrar sesión”.

### 2. Supabase opcional (sincronización entre dispositivos)

1. Crear un proyecto gratuito en Supabase.
2. Ejecutar `supabase-schema.sql` en el SQL Editor. Crea la tabla `ciya_state` con `id`, `data jsonb` y `updated_at`, más políticas RLS para el rol `anon`.
3. Copiar en `assets/js/config.js` los valores:

```js
supabaseUrl: 'https://TU-PROYECTO.supabase.co',
supabaseAnonKey: 'TU-ANON-KEY'
```

Sin estos datos la aplicación funciona en modo local: guarda en `LocalStorage` y sincroniza entre pestañas del mismo navegador. Con ellos, sondea el estado remoto cada `syncIntervalMs` (3000 ms por defecto) y publica los cambios por REST.

La clave `anon` es pública por diseño; el PIN protege la interfaz, no sustituye a autenticación ni a RLS. Para un evento abierto se usa una única fila compartida `id = event`; no almacenar credenciales ni datos sensibles reales en esa tabla.

### 3. Hardware del encendido

En `assets/js/config.js`:

```js
relayCommand: 'RELAY_ON\n',
serialBaudRate: 9600
```

El Arduino/ESP32 debe enviar por puerto serial una línea que contenga `SENSOR`, `TRIGGER`, `DISPARO`, `IGNITE` o `1` para disparar la cuenta regresiva. La consola escribe `relayCommand` al llegar a cero. Web Serial está disponible en Chrome y Edge de escritorio; en Safari se usa el botón manual o la barra espaciadora.

### 4. Códigos QR

Generar los QR apuntando a la URL pública del sitio más el parámetro `id`:

- Mensajes: `mensaje-general`, `mensaje-electricidad`, `mensaje-electromecanica`, `mensaje-industrial`, `mensaje-hidraulica`, `mensaje-sistemas`, `mensaje-solidario`.
- Trivias: `trivia-gradas`, `trivia-bar`, `trivia-laboratorios`, `trivia-sistemas`, `trivia-banos`.
- Memes: `meme-cheems`, `meme-drake`, `meme-botones`, `meme-spiderman`, `meme-gato`.
- QR Dorados: `oro-01`, `oro-02`, `oro-03`.

Ejemplo: `https://TU-DOMINIO/qr.html?id=oro-01`.

El QR del Mar de Linternas debe proyectarse a las 18:20. La página `qr.html` incluye un botón para imprimir el listado completo.

### 5. Despliegue

El repositorio es un sitio estático: publicar la carpeta raíz en Vercel o Netlify sin comandos de build ni directorio de salida especial. Para probar localmente:

```bash
python3 -m http.server 8000
```

Luego abrir `http://localhost:8000`. El micrófono y Web Serial requieren `https://` o `localhost`.

## Datos y persistencia

- Clave principal: `ciya2026:state` en `LocalStorage`.
- Preferencias de linterna: `ciya2026:linterna`.
- Sesiones PIN: `ciya2026:auth:<scope>` en `sessionStorage`.
- El estado contiene asistentes, donaciones, grupos, deseos, calificaciones, evaluaciones de puertas, QR canjeados, muro, ganadores e historial de ruleta.
- El botón “Descargar Respaldo Local (JSON)” de escenario exporta ese estado completo; “Cargar respaldo” lo restaura.

## Ensayo y operación del 4 de diciembre

1. **3 de diciembre**: prueba integral de sensor, relé, tecla de emergencia, audio, proyección 16:9, respaldo JSON, carga por QR y linterna en Android/iPhone.
2. **15:00–16:45**: evaluación de puertas desde administración.
3. **17:45**: cerrar recepción y descargar respaldo local JSON desde escenario.
4. **18:20**: proyectar QR del Mar de Linternas.
5. **18:25**: acto central y encendido 5 en 1 en modo local.
6. **18:55**: ruleta con boletos consolidados; respetar los 45 segundos de comparecencia y el límite de un premio por estudiante.
7. **19:25**: rotación de deseos aprobados en pantalla gigante durante la chocolatada.

## Limitaciones conocidas

- El envío de comprobantes usa `mailto:` del dispositivo, no un servidor SMTP; no requiere credenciales ni costo.
- Los códigos QR se generan externamente a partir de las URLs listadas; la app aloja el contenido, no un generador de imágenes QR.
- Web Serial no existe en Safari/iOS; la operación crítica tiene disparo manual y respaldo local.
- El PIN es una barrera de interfaz, no autenticación criptográfica.
- No se incluye `manifest.json` ni service worker porque la versión 2.0 eliminó el alcance PWA instalable.
