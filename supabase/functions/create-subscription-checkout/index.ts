import { corsHeaders, json } from '../_shared/cors.ts';
import { userClient, admin } from '../_shared/supabase.ts';
import { MercadoPagoProvider } from '../_shared/payment-provider.ts';
import { PRO_MONTHLY_PRICE_BRL } from '../_shared/plans.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  const userDb = await userClient(req);
  const { data: { user }, error: userError } = await userDb.auth.getUser();
  if (userError || !user) return json({ error: 'Não autenticado' }, 401);

  const db = admin();
  const { data: recent } = await db
    .from('subscriptions')
    .select('id,status,current_period_end,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recent?.status === 'active' || recent?.status === 'grace_period') {
    const stillValid = !recent.current_period_end || new Date(recent.current_period_end).getTime() > Date.now();
    if (stillValid) return json({ error: 'Sua assinatura Possível Pro já está ativa.' }, 409);
  }

  if (recent?.status === 'pending' && Date.now() - new Date(recent.created_at).getTime() < 90_000) {
    return json({ error: 'Aguarde um instante antes de criar outro checkout.' }, 429);
  }

  try {
    const provider = new MercadoPagoProvider();
    const checkout = await provider.createCheckoutSession({ userId: user.id, email: user.email, plan: 'pro' });
    const { error } = await db.from('subscriptions').insert({
      user_id: user.id,
      plan: 'pro',
      status: 'pending',
      provider: 'mercadopago',
      provider_subscription_id: checkout.providerSubscriptionId,
    });
    if (error) {
      console.error('subscription insert:', error);
      return json({ error: 'Não foi possível registrar a assinatura.' }, 500);
    }
    return json({ ...checkout, price: PRO_MONTHLY_PRICE_BRL, currency: 'BRL' });
  } catch (error) {
    console.error('subscription checkout:', error);
    return json({ error: error instanceof Error ? error.message : 'Checkout indisponível.' }, 502);
  }
});
