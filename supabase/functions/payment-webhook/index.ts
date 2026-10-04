import { corsHeaders, json } from '../_shared/cors.ts';
import { admin } from '../_shared/supabase.ts';
import { InvalidWebhookSignatureError } from '../_shared/webhook-signature.ts';
import { MercadoPagoProvider } from '../_shared/payment-provider.ts';

function mapStatus(status?: string) {
  if (status === 'authorized') return 'active';
  if (status === 'paused') return 'past_due';
  if (status === 'cancelled') return 'canceled';
  if (status === 'pending') return 'pending';
  return 'pending';
}

function validDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  const provider = new MercadoPagoProvider();
  let event;

  try {
    event = await provider.validateWebhook(req);
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) return json({ error: error.message }, 401);
    console.error('subscription webhook validation:', error);
    return json({ error: 'Não foi possível validar o webhook de assinatura.' }, 400);
  }

  const db = admin();
  const { error: insertError } = await db.from('payment_webhook_events').insert({
    provider: 'mercadopago',
    event_id: event.id,
    event_type: event.type,
    payload: event.payload,
  });

  if (insertError?.code === '23505') return json({ ok: true, duplicate: true });
  if (insertError) return json({ error: 'Não foi possível registrar o evento.' }, 400);

  if (event.providerSubscriptionId) {
    const { data: existing, error: existingError } = await db
      .from('subscriptions')
      .select('id,user_id,status,current_period_start,current_period_end,cancel_at_period_end')
      .eq('provider_subscription_id', event.providerSubscriptionId)
      .maybeSingle();

    if (existingError) return json({ error: 'Não foi possível consultar a assinatura interna.' }, 400);

    if (existing) {
      const subscription = await provider.getSubscription(event.providerSubscriptionId);
      if (subscription.external_reference && subscription.external_reference !== existing.user_id) {
        console.error('subscription external_reference mismatch:', { providerSubscriptionId: event.providerSubscriptionId });
        return json({ error: 'A assinatura do provedor não corresponde à conta registrada.' }, 409);
      }

      const nextPayment = validDate(subscription.next_payment_date);
      const createdAt = validDate(subscription.date_created);
      let status = mapStatus(subscription.status);
      let cancelAtPeriodEnd = existing.cancel_at_period_end;

      if (status === 'active' && !nextPayment) {
        status = 'pending';
      }

      const existingEnd = validDate(existing.current_period_end);
      if (status === 'canceled' && existing.cancel_at_period_end && existingEnd && existingEnd.getTime() > Date.now()) {
        status = existing.status === 'grace_period' ? 'grace_period' : 'active';
        cancelAtPeriodEnd = true;
      } else if (status === 'active') {
        cancelAtPeriodEnd = false;
      }

      const update: Record<string, unknown> = {
        status,
        plan: 'pro',
        cancel_at_period_end: cancelAtPeriodEnd,
        updated_at: new Date().toISOString(),
      };
      if (!existing.current_period_start && createdAt) update.current_period_start = createdAt.toISOString();
      if (nextPayment) update.current_period_end = nextPayment.toISOString();

      const { error: updateError } = await db.from('subscriptions').update(update).eq('id', existing.id);
      if (updateError) return json({ error: 'Não foi possível atualizar a assinatura.' }, 400);
    }
  }

  await db
    .from('payment_webhook_events')
    .update({ processed_at: new Date().toISOString() })
    .eq('provider', 'mercadopago')
    .eq('event_id', event.id);

  return json({ ok: true });
});
