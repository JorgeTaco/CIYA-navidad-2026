type Receipt = {
  id: string;
  email: string;
  nombre: string;
  tickets: string[];
  created_at: string;
};

type Outcome = 'accepted' | 'failed' | 'retry';

async function sendReceipt(receipt: Receipt, apiKey: string, sender: string): Promise<Outcome> {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        sender: { name: 'CIYA Navidad 2026', email: sender },
        to: [{ email: receipt.email, name: receipt.nombre }],
        subject: 'Comprobante · Gran Ruleta Digital CIYA 2026',
        textContent: [
          'Hola ' + receipt.nombre + ',',
          'Tus boletos vigentes al ' + new Date(receipt.created_at).toLocaleString('es-EC', {
            timeZone: 'America/Guayaquil', dateStyle: 'short', timeStyle: 'medium'
          }) + ' (hora de Ecuador):',
          receipt.tickets.join('\n') || 'Todavía no tienes boletos.',
          'Si ganas, presenta tu identificación ante la Comisión en 45 segundos.'
        ].join('\n\n'),
        headers: { idempotencyKey: receipt.id }
      })
    });
    if (response.ok) return 'accepted';
    const body = await response.json().catch(() => ({}));
    if (body.code === 'duplicate_parameter' && /idempotency/i.test(body.message ?? '')) return 'accepted';
    return response.status >= 500 || response.status === 429 ? 'retry' : 'failed';
  } catch {
    return 'retry';
  }
}

Deno.serve(async (request) => {
  const workerSecret = Deno.env.get('CIYA_WORKER_SECRET');
  if (request.method !== 'POST' || !workerSecret || request.headers.get('x-ciya-worker-secret') !== workerSecret) {
    return new Response(null, { status: 403 });
  }
  const project = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('CIYA_SERVICE_ROLE_KEY');
  const apiKey = Deno.env.get('BREVO_API_KEY');
  const sender = Deno.env.get('CIYA_SENDER_EMAIL');
  if (!project || !serviceKey || !apiKey || !sender) {
    return new Response('Falta configurar el correo transaccional.', { status: 503 });
  }

  async function rpc(name: string, args: Record<string, unknown>) {
    const response = await fetch(project + '/rest/v1/rpc/' + name, {
      method: 'POST',
      headers: { apikey: serviceKey!, Authorization: 'Bearer ' + serviceKey, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify(args)
    });
    if (!response.ok) throw new Error(name + ' falló: ' + response.status);
    return response.json();
  }

  try {
    const receipts: Receipt[] = await rpc('ciya_receipts_take', {});
    for (let start = 0; start < receipts.length; start += 5) {
      await Promise.allSettled(receipts.slice(start, start + 5).map(async (receipt) => {
        const outcome = await sendReceipt(receipt, apiKey, sender);
        await rpc('ciya_receipts_finish', { receipt_id: receipt.id, outcome });
      }));
    }
    return Response.json({ processed: receipts.length });
  } catch {
    return new Response('Cola temporalmente no disponible.', { status: 503 });
  }
});
