# CIYA Navidad 2026

Aplicación web responsive para el evento **CIYA 4.0 Ingenio que Ilumina la Navidad** del viernes 4 de diciembre de 2026, en la Facultad de Ciencias de la Ingeniería y Aplicadas. Las seis páginas se sirven como HTML, CSS y JavaScript. La recepción y los formularios usan Supabase. La laptop de escenario puede ejecutar el encendido, el ranking y la ruleta en local.

La versión 2.0 de la especificación, las Bases Oficiales de Concursos y Actividades y el documento Ruta de Códigos QR de CIYA Navidad 2026 son las fuentes funcionales. Se aplican los horarios del cronograma oficial, el plazo de inscripción del 3 de diciembre y la validación del QR Dorado con pantalla activa y credencial. Todas las horas indicadas corresponden a Ecuador continental (UTC−05:00).

## Cambios de esta versión

| Requisito | Cambio y cómo comprobarlo |
| --- | --- |
| RF-01 a RF-05 · Portal y ruta | La URL `index.html?modo=linterna#linterna` abre una vista sin consultas ni dependencias externas. Incluye las cinco carreras con color e icono, seis frases, texto personal, destello alineado con el reloj del dispositivo, movimiento reducido y pantalla completa con vista CSS de respaldo. La ruta conserva siete mensajes, cinco trivias y cinco memes, actualiza sus referencias horarias y enlaza al Buzón y a la Linterna. Abrir desde un QR y desconectar la red después de cargar. |
| RF-06 a RF-09 · Recepción | La acreditación requiere confirmar identidad y elegibilidad en el hall. Una acreditación con mensaje verificado da un boleto base, incluso si recepción confirma el mensaje en un segundo paso. Un juguete aporta **5 puntos y 2 boletos**. Una funda aporta **2 puntos y 1 boleto**. Un QR Dorado aporta **3 boletos**. Los aportes previos se asocian a la cédula y se habilitan para el sorteo al acreditar el ingreso. La mesa puede agregar aportes durante o después del registro. |
| RF-06 a RF-09 · Comprobantes y Copa Solidaria | Cada boleto tiene un número estable. Acreditaciones y nuevos boletos generan un comprobante en pantalla, copiable y con estado del envío automático. El ranking y su CSV incluyen juguetes, fundas, total, puntos y donantes únicos. Los empates se resuelven por juguetes y luego por donantes únicos. Una igualdad persistente comparte puesto. |
| RF-05 y RF-08 · QR Dorados | Administración obtiene las tres URL de impresión privadas. La página del hallazgo muestra una clave válida por dos minutos. Recepción confirma la pantalla activa, credencial y juego limpio. La base de datos acepta un único canje por impreso y uno por estudiante. |
| RF-10 y RF-11 · Villancicos | El formulario solicita el representante y una carrera, guarda el orden de inscripción y cierra el 3 de diciembre a las 17:30. Escenario conserva el cronómetro de tres minutos, la rúbrica 30/30/20/20 y el aplausómetro. El micrófono muestra dBFS, una medida relativa de la señal del equipo, y hay control manual. |
| RF-12 a RF-14 · Buzón y curaduría | Los deseos pendientes solo están disponibles en administración. Tras aprobarlos se pueden mostrar en el portal, rotar en escenario y exportar a CSV. Se conserva la evaluación de puertas. El CSV neutraliza entradas que una hoja de cálculo podría interpretar como fórmulas. |
| RF-15 a RF-17 y RNF-04 · Escenario | Recepción sella el evento a las 17:45. Escenario descarga e importa el JSON versión 2 con el ranking, los boletos elegibles y los deseos aprobados al cierre. La ruleta usa los números de boleto, oculta el resultado durante el giro, recupera el avance tras recargar, da 45 segundos desde la primera visualización del resultado y excluye de futuros premios a quien ya recibió uno. La proyección es 16:9 y el encendido usa una cuenta local de 10 segundos, audio, puerto serial y barra espaciadora de respaldo. |
| RNF-06 · Datos y permisos | Las escrituras usan transacciones y un identificador de reintento. Los datos de recepción solo se consultan con una cuenta autorizada. El público recibe resultados agregados, el orden sin nóminas y las frases aprobadas. La sincronización consulta el servidor cada tres segundos con la pestaña visible. Las políticas anónimas de la tabla de la primera versión se retiran al ejecutar el esquema. |

## Páginas

- `index.html` contiene el portal, el Mar de Linternas, los villancicos y el Buzón. `qr.html` contiene la ruta y `bases.html` publica las reglas del evento.
- `recepcion.html` contiene acreditación, donaciones, canjes y cierre. `escenario.html` contiene la proyección, los módulos de escenario y el respaldo. `admin.html` contiene curaduría, evaluación de puertas, impresión privada e importación.

## Instalación y configuración

1. **Frontend.** Publicar la carpeta raíz en un hospedaje estático con HTTPS. Para inspeccionarla en local, ejecutar `python3 -m http.server 8000 --bind 127.0.0.1`. La ruta informativa y la linterna funcionan sin configurar Supabase.
2. **Supabase.** Crear un proyecto y ejecutar `supabase-schema.sql` en el SQL Editor. Si hay datos de la primera versión, respaldarlos antes. Ejecutar después `legacy-import.sql` para habilitar la importación privada. Para crear cuentas en producción, deshabilitar el registro público en Auth y crear cuentas de correo y contraseña desde el panel. Para cada usuario asignar el permiso correspondiente con su UUID real.

   ```sql
   insert into ciya.roles (user_id, panel)
   values ('00000000-0000-0000-0000-000000000000', 'recepcion');
   ```

   Repetir con `escenario` o `admin` según corresponda. En `assets/js/config.js`, establecer `supabaseUrl` y `supabaseAnonKey` usando la URL y la clave publicable del proyecto. Las claves de servicio y de correo se guardan en el servidor.
3. **Correo automático.** Configurar un remitente institucional verificado en Brevo. Guardar `BREVO_API_KEY`, `CIYA_SENDER_EMAIL` y un secreto aleatorio `CIYA_WORKER_SECRET` entre los secretos de la función. La función usa `SUPABASE_SERVICE_ROLE_KEY` del entorno o `CIYA_SERVICE_ROLE_KEY` si se configura explícitamente. Desde la raíz, desplegar con `supabase functions deploy ciya-receipts --project-ref TU_PROYECTO`. La función verifica el secreto del trabajador para aceptar invocaciones. La validación de JWT en la pasarela se deshabilita para esa función mediante `supabase/config.toml`.

   Habilitar las extensiones `pg_cron` y `pg_net` y crear en Vault un secreto llamado `ciya_worker_secret` con el mismo valor de `CIYA_WORKER_SECRET`. Sustituir `TU_PROYECTO` y ejecutar en Supabase:

   ```sql
   select cron.schedule('ciya-receipts', '* * * * *', $job$
     select net.http_post(
       url := 'https://TU_PROYECTO.supabase.co/functions/v1/ciya-receipts',
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'x-ciya-worker-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'ciya_worker_secret')
       ),
       body := '{}'::jsonb,
       timeout_milliseconds := 60000
     );
   $job$);
   ```

   La cola reintenta fallas transitorias y usa el ID del comprobante como clave de idempotencia de Brevo. Si el proveedor no confirma el envío en la ventana de reintento, recepción muestra «Envío sin confirmación». Verificar el registro de Brevo antes de un reenvío y usar la copia en pantalla si hace falta. «Aceptado por el proveedor» indica aceptación del correo por su API. El plan gratuito de Brevo incluye 300 envíos diarios. Contar las emisiones adicionales por aportes y canjes al estimar capacidad. [Cuota de Brevo](https://help.brevo.com/hc/en-us/articles/208580669-FAQs-What-are-the-limits-of-the-Free-plan) · [Idempotencia de Brevo](https://developers.brevo.com/docs/heterogenous-versions-batch-emails) · [Programación en Supabase](https://supabase.com/docs/guides/cron)

## Migración desde la primera versión

- Guardar el JSON local de la versión anterior usando su opción de respaldo o exportar el campo `data` de la fila `event` de `public.ciya_state` desde un acceso autorizado. Conservar ese archivo en un lugar privado. La migración deshabilita el acceso anónimo a la tabla anterior y conserva la fila.
- Desde `admin.html`, abrir **Importar respaldo de la primera versión**, seleccionar el archivo y revisar los duplicados. Marcar solo las acreditaciones comprobadas presencialmente. Los demás registros conservan su cédula y los aportes vinculados, pendientes de acreditar en recepción. Para grupos con varias carreras se usa la primera y, si falta representante, el primer integrante. Los ganadores previos de registros confirmados quedan excluidos del nuevo sorteo.
- Importar una sola vez en una instancia nueva y verificar las donaciones, canjes y boletos recalculados. La importación conserva los deseos y las evaluaciones reconocidas. Los números de boleto se generan durante la importación y los comprobantes previos quedan en el respaldo original. El historial anterior de la ruleta y de encendido se consulta en ese archivo. Importar los datos anteriores no genera correos retroactivos.

## Impresión y operación del evento

- **Ruta pública.** Usar `qr.html?id=…` con los IDs que enlaza el índice de la ruta. Para el buzón usar `index.html#buzon`. Desde **Administración → Impresión privada de los QR Dorados**, copiar las tres URL con fragmento `#dorado=…` y generar los impresos con un generador QR. Distribuir solo los impresos y guardar el listado en privado. Reemplazar cualquier impreso anterior que use `?id=oro-01`, `oro-02` u `oro-03`.
- **Recepción.** Donaciones y canjes de 08:00 a 17:45; acreditación de 17:00 a 17:45. Si se pierde la conexión, conservar el formulario y reintentar la misma operación. A las 17:45, seleccionar **Marcar cierre de recepción** y esperar la confirmación de sellado. En la consola conectada, descargar **Respaldo Local (JSON)** en la pestaña Respaldo.
- **Laptop local.** Iniciar `python3 tools/local-stage.py` desde la raíz del repositorio. Establecer una contraseña local de ocho caracteres ASCII o más. Con Chrome o Edge de escritorio, abrir `http://127.0.0.1:8080/escenario.html?modo=local` con el usuario `escenario` y esa contraseña. En **Respaldo**, importar el archivo sellado. La consola admite una única pestaña activa por perfil. Conservar el mismo perfil de navegador para recuperar el avance tras recargar. Usar un perfil separado para el ensayo. El archivo almacena nombres y números de boleto, por lo que debe quedar en la laptop del equipo.
- **Encendido.** A las 18:20, proyectar el QR de linterna para que se cargue antes del acto central de 18:25 a 18:55. Dar permiso al puerto en la pestaña **Encendido**, activar el audio y armar el sensor. Configuración inicial: 9600 baudios. La placa envía una línea terminada en salto de línea con `SENSOR`, `TRIGGER`, `DISPARO`, `IGNITE` o `1`. La consola envía `RELAY_ON\n` al llegar a cero. La barra espaciadora inicia la cuenta si el área de proyección tiene el foco. Si falla la conexión serial, Electricidad dispone de su interruptor físico independiente. Confirmar el pulso físico durante el ensayo.
- **Ruleta.** Entre 18:55 y 19:25, operar desde la consola local con el respaldo cargado. Ingresar el nombre del premio antes del giro. Marcar **Premio entregado** después de verificar identidad o **Ausente** para girar de nuevo por el mismo premio. Al vencerse los 45 segundos, la rueda gira de nuevo automáticamente si quedan candidatos. Usar la vista de proyección para mostrar únicamente el nombre del seleccionado y su boleto. A las 19:25, la consola conectada puede rotar las aprobaciones recientes y la local puede rotar las incluidas al sellar el JSON.

## Verificación

- `node --test tests/draw.test.cjs` verifica recuperación, reloj de comparecencia, ausencia, exclusión del ganador y rechazo de un respaldo con un boleto duplicado. `node --check` revisa todos los JavaScript del sitio.
- Pruebas locales de PostgreSQL con hora simulada: permisos, límites horarios, donación y canje antes de acreditar, correo repetido, clave vencida, siete boletos por ingreso con mensaje más un juguete, una funda y un QR Dorado, siete puntos por los dos aportes, cola de comprobantes, sellado y migración. Dos conexiones simultáneas verificaron que se conservan ambos aportes y se aceptan solo un registro por correo y un canje por código.
- Pruebas en Chromium: 360 px, linterna tras desconexión, trivia, formularios con respuestas simuladas, pantalla dorada, descarga del respaldo, ranking y recuperación del sorteo en el servidor local sin acceso externo. La tecla de respaldo se ensayó en simulación. La linterna quedó lista en 1,45 s con caché desactivada, 150 ms de latencia y 400 kbit/s de descarga simulados. La función de correo se comprobó con respuestas simuladas de Brevo, incluidos reintento, deduplicación y rechazo definitivo.
- **Pendiente para el ensayo del 3 de diciembre.** Desplegar en el proyecto Supabase del evento y probar la entrega real de Brevo. Hacer un ensayo con dos puestos, Internet desconectado en escenario, proyector 16:9, audio, micrófono, placa, relé y respaldo manual. Abrir el QR real en Chrome para Android y Safari para iPhone y medir el objetivo de carga de menos de dos segundos en la red del hall.


### Horarios del ensayo en una instancia separada

Configurar cuentas y datos ficticios en otro proyecto Supabase. En ese proyecto, la siguiente consulta abre una ventana de 45 minutos para probar de extremo a extremo. El portal conserva los textos con las horas oficiales.

```sql
update ciya.event
set donations_start = now() - interval '5 minutes',
    checkin_start = now() - interval '1 minute',
    reception_end = now() + interval '45 minutes',
    group_deadline = now() + interval '45 minutes';
```

Para ensayar el sellado al terminar los registros, ajustar `reception_end` a `now()` en la instancia de ensayo y pulsar **Marcar cierre de recepción**. Mantener las horas predeterminadas del esquema en el proyecto del evento.
