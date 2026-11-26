# ADR-001: Supabase como backend

## Contexto

La aplicación necesita acreditación, donaciones, canjes, curaduría y un sorteo
con reglas anti-duplicado, además de sincronización entre puestos y una cola de
comprobantes por correo.

## Decisión

Usar Supabase (Postgres + Auth + RPC + Edge Functions) como único backend.

## Consecuencias

- Las reglas críticas viven en `ciya_write` con transacciones e idempotencia por
  `request_id`, no en el navegador.
- Los permisos se resuelven con cuentas y roles en `ciya.roles`; no hay PIN de
  interfaz como autenticación.
- La cola de correos usa `ciya.receipts` y la función `ciya-receipts` con Brevo.
- El frontend depende de dos valores públicos configurables en `config.js`.
