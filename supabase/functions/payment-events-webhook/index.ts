import { json } from '../_shared/cors.ts';
import { admin } from '../_shared/supabase.ts';
import { getMercadoPagoEventId, validateMercadoPagoWebhookSignature, InvalidWebhookSignatureError } from '../_shared/webhook-signature.ts';

function mapStatus(status?: string) {
  if (status === 'approved') return 'paid';
  if (status === 'refunded' || status === 'charged_back') return 'refunded';
  if (status === 'rejected' || status === 'cancelled') return 'failed';
  return 'pending';
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  const eventId = getMercadoPagoEventId(req.url);
  try {
    await validateMercadoPagoWebhookSignature({
      signature: req.headers.get('x-signature'),
      requestId: req.headers.get('x-request-id'),
      eventId,
      secret: Deno.env.get('MERCADO_PAGO_WEBHOOK_SECRET'),
    });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) return json({ error: error.message }, 401);
    console.error('payment webhook signature:', error);
    return json({ error: 'Não foi possível validar o webhook.' }, 400);
  }

  const payload = await req.json().catch(() => ({}));
  const paymentId = String((payload as { data?: { id?: unknown } }).data?.id ?? eventId ?? '');
  if (!paymentId) return json({ error: 'Evento sem ID de pagamento' }, 400);

  const token = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
  if (!token) return json({ error: 'Pagamento ainda não configurado.' }, 503);

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    console.error('mercadopago payment lookup:', response.status, await response.text());
    return json({ error: 'Não foi possível confirmar o pagamento no provedor.' }, 502);
  }
  const providerPayment = await response.json();

  const internalId = Number(providerPayment.external_reference);
  if (!Number.isSafeInteger(internalId) || internalId <= 0) return json({ error: 'Referência de pagamento inválida.' }, 400);

  const db = admin();
  const { data: internal, error: internalError } = await db
    .from('payments')
    .select('id,payer_id,amount,purpose,status,provider')
    .eq('id', internalId)
    .maybeSingle();
  if (internalError) return json({ error: 'Não foi possível validar o pagamento interno.' }, 400);
  if (!internal) return json({ error: 'Pagamento interno não encontrado.' }, 404);
  if (internal.provider !== 'mercadopago') return json({ error: 'Provedor de pagamento divergente.' }, 409);

  const providerAmount = Number(providerPayment.transaction_amount);
  const expectedAmount = Number(internal.amount);
  const currency = String(providerPayment.currency_id ?? '');
  if (!Number.isFinite(providerAmount) || Math.abs(providerAmount - expectedAmount) > 0.005 || currency !== 'BRL') {
    console.error('payment integrity mismatch:', { internalId, providerAmount, expectedAmount, currency });
    return json({ error: 'Os dados do pagamento não correspondem ao checkout registrado.' }, 409);
  }

  const status = mapStatus(providerPayment.status);
  const eventKey = `payment:${paymentId}:${providerPayment.status}`;
  const { error: eventError } = await db.from('payment_webhook_events').insert({
    provider: 'mercadopago',
    event_id: eventKey,
    event_type: String(providerPayment.status ?? 'unknown'),
    payload: providerPayment,
  });
  if (eventError?.code === '23505') return json({ ok: true, duplicate: true });
  if (eventError) return json({ error: 'Não foi possível registrar o evento de pagamento.' }, 400);

  const { data: updated, error: updateError } = await db.from('payments').update({
    status,
    provider_reference: String(paymentId),
    updated_at: new Date().toISOString(),
  }).eq('id', internalId).eq('provider', 'mercadopago').select('id,payer_id,purpose').maybeSingle();
  if (updateError) return json({ error: 'Não foi possível atualizar o pagamento.' }, 400);

  if (updated?.payer_id) {
    await db.from('notifications').insert({
      user_id: updated.payer_id,
      type: 'payment',
      title: status === 'paid' ? 'Pagamento confirmado' : 'Pagamento atualizado',
      body: `${updated.purpose || 'Pagamento'}: ${status}`,
      link: '#causes',
    });
  }

  await db.from('payment_webhook_events').update({ processed_at: new Date().toISOString() })
    .eq('provider', 'mercadopago').eq('event_id', eventKey);

  return json({ ok: true, status });
});
