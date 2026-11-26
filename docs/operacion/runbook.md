# Operación del evento

## Antes del evento

1. Aplicar `supabase/migrations/` en orden con `supabase db push`.
2. Crear cuentas y asignar `recepcion`, `escenario` o `admin` en `ciya.roles`.
3. Configurar `supabaseUrl` y `supabaseAnonKey` en `apps/web/shared/js/config.js`.
4. Desplegar `ciya-receipts`, secretos de Brevo y el trabajo de `pg_cron`.
5. Generar los QR impresos con las URL privadas de Administración.

## Día del evento

- 08:00–17:45: donaciones y canjes.
- 17:00–17:45: acreditación.
- 17:45: marcar cierre de recepción y descargar el respaldo sellado.
- Escenario sin red: `python3 tools/local-stage.py` y abrir
  `http://127.0.0.1:8080/escenario.html?modo=local`.
- 17:45–18:25: villancicos.
- 18:20: proyectar el QR de la linterna.
- 18:25–18:55: acto central y encendido.
- 18:55–19:25: ruleta con 45 segundos de comparecencia.

El archivo de respaldo contiene nombres y números de boleto. Guardarlo en la
laptop de escenario.

## Comprobación offline en el ensayo

1. Ejecutar `bash scripts/check.sh` para comprobar el respaldo, la ruleta,
   el servidor local, la linterna y el encendido con puerto simulado.
2. En la instancia de ensayo, sellar recepción y descargar el JSON desde la
   consola conectada. Abrir la consola local e importar ese mismo archivo.
3. Desconectar internet de la laptop. Comparar el marcador y el número de boletos
   con el cierre. Girar, recargar durante los 45 segundos de comparecencia y
   comprobar el nuevo giro por ausencia. Entregar un premio y verificar que el
   ganador salga de los sorteos posteriores.
4. Probar la proyección 16:9, el audio y el encendido con la placa y el relé del
   evento. Confirmar la cuenta de diez segundos con sensor y con barra espaciadora.
5. Abrir el QR en Android y iPhone. Con la página abierta, cortar Wi-Fi y datos
   móviles y comprobar el giro del celular, los colores, el cambio de mensaje y
   la pantalla completa.
