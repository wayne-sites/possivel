import { corsHeaders, json } from '../_shared/cors.ts';
import { userClient, admin } from '../_shared/supabase.ts';

function env(name: string) {
  return Deno.env.get(name);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  const userDb = await userClient(req);
  const { data: { user }, error: userError } = await userDb.auth.getUser();
  if (userError || !user) return json({ error: 'Não autenticado' }, 401);

  const { paymentId } = await req.json().catch(() => ({ paymentId: null }));
  if (!paymentId || !Number.isFinite(Number(paymentId))) return json({ error: 'paymentId inválido' }, 400);

  const db = admin();
  const { data: payment, error: paymentError } = await db
    .from('payments')
    .select('id,payer_id,listing_id,cause_id,kind,amount,purpose,status,provider_reference')
    .eq('id', Number(paymentId))
    .eq('payer_id', user.id)
    .maybeSingle();

  if (paymentError) return json({ error: 'Não foi possível consultar o pagamento.' }, 400);
  if (!payment) return json({ error: 'Pagamento não encontrado' }, 404);
  if (payment.status !== 'pending') return json({ error: 'Pagamento não está pendente' }, 409);
  if (payment.provider_reference) return json({ error: 'Este pagamento já possui um checkout aberto.' }, 409);

  let authoritativeAmount = Number(payment.amount);
  let authoritativePurpose = String(payment.purpose || 'Pagamento Possível');

  if (payment.kind === 'purchase') {
    if (!payment.listing_id) return json({ error: 'Anúncio inválido para compra.' }, 400);
    const { data: listing } = await db
      .from('listings')
      .select('id,seller_id,title,listing_type,price,status')
      .eq('id', payment.listing_id)
      .maybeSingle();
    if (!listing || listing.status !== 'active' || listing.listing_type !== 'venda' || listing.seller_id === user.id) {
      return json({ error: 'Este anúncio não está disponível para compra.' }, 409);
    }
    authoritativeAmount = Number(listing.price);
    authoritativePurpose = String(listing.title);
  } else if (payment.kind === 'donation') {
    if (!payment.cause_id) return json({ error: 'Causa inválida para apoio.' }, 400);
    const { data: cause } = await db.from('causes').select('id,title,status').eq('id', payment.cause_id).maybeSingle();
    if (!cause || cause.status !== 'active') return json({ error: 'Esta causa não está disponível para apoio.' }, 409);
    authoritativePurpose = `Apoio: ${cause.title}`;
  } else {
    return json({ error: 'Tipo de pagamento não permitido neste checkout.' }, 400);
  }

  if (!Number.isFinite(authoritativeAmount) || authoritativeAmount < 1 || authoritativeAmount > 100_000) {
    return json({ error: 'Valor de pagamento inválido.' }, 400);
  }

  const token = env('MERCADO_PAGO_ACCESS_TOKEN');
  if (!token) return json({ error: 'Pagamento ainda não configurado.' }, 503);

  const appUrl = env('APP_URL') ?? 'https://possivel2026.github.io/possivel/';
  const notificationUrl = env('PAYMENT_WEBHOOK_URL');
  const preference = {
    items: [{
      id: String(payment.id),
      title: authoritativePurpose.slice(0, 120),
      quantity: 1,
      currency_id: 'BRL',
      unit_price: authoritativeAmount,
    }],
    payer: { email: user.email },
    external_reference: String(payment.id),
    back_urls: {
      success: `${appUrl}?payment=success`,
      pending: `${appUrl}?payment=pending`,
      failure: `${appUrl}?payment=failure`,
    },
    auto_return: 'approved',
    ...(notificationUrl ? { notification_url: notificationUrl } : {}),
  };

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(preference),
  });

  if (!response.ok) {
    console.error('mercadopago preference:', response.status, await response.text());
    return json({ error: 'O provedor de pagamento está temporariamente indisponível.' }, 502);
  }

  const data = await response.json();
  const checkoutUrl = data.init_point ?? data.sandbox_init_point;
  if (!checkoutUrl || !data.id) return json({ error: 'O provedor não retornou um checkout válido.' }, 502);

  const { error: updateError } = await db.from('payments').update({
    amount: authoritativeAmount,
    purpose: authoritativePurpose,
    provider: 'mercadopago',
    provider_reference: String(data.id),
    updated_at: new Date().toISOString(),
  }).eq('id', payment.id).eq('status', 'pending');

  if (updateError) {
    console.error('payment update:', updateError);
    return json({ error: 'Não foi possível registrar o checkout.' }, 500);
  }

  return json({ checkout_url: String(checkoutUrl), preference_id: String(data.id) });
});
