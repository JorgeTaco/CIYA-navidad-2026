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
- 18:20: proyecto el QR de la linterna.
- 18:25–18:55: acto central y villancicos.
- 18:55–19:25: ruleta con 45 segundos de comparecencia.

El archivo de respaldo contiene nombres y números de boleto: debe permanecer en
la laptop de escenario.
