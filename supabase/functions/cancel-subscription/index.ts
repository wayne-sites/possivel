import { corsHeaders, json } from '../_shared/cors.ts';
import { userClient, admin } from '../_shared/supabase.ts';
import { MercadoPagoProvider } from '../_shared/payment-provider.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  const userDb = await userClient(req);
  const { data: { user }, error: userError } = await userDb.auth.getUser();
  if (userError || !user) return json({ error: 'Não autenticado' }, 401);

  const { data: sub, error: subError } = await userDb
    .from('subscriptions')
    .select('id,status,provider_subscription_id,current_period_end,cancel_at_period_end')
    .eq('user_id', user.id)
    .in('status', ['active', 'pending', 'grace_period'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subError) return json({ error: 'Não foi possível consultar a assinatura.' }, 400);
  if (!sub) return json({ error: 'Assinatura não encontrada' }, 404);
  if (sub.cancel_at_period_end) return json({ ok: true, alreadyScheduled: true, accessUntil: sub.current_period_end });

  if (sub.provider_subscription_id) {
    try {
      await new MercadoPagoProvider().cancelSubscription(sub.provider_subscription_id);
    } catch (error) {
      console.error('subscription cancel provider:', error);
      return json({ error: error instanceof Error ? error.message : 'Não foi possível cancelar a assinatura.' }, 502);
    }
  }

  const end = sub.current_period_end ? new Date(sub.current_period_end) : null;
  const keepsAccess = Boolean(
    (sub.status === 'active' || sub.status === 'grace_period')
      && end
      && Number.isFinite(end.getTime())
      && end.getTime() > Date.now()
  );

  const { error: updateError } = await admin().from('subscriptions').update({
    status: keepsAccess ? sub.status : 'canceled',
    cancel_at_period_end: true,
    updated_at: new Date().toISOString(),
  }).eq('id', sub.id).eq('user_id', user.id);

  if (updateError) return json({ error: 'O provedor cancelou, mas não foi possível atualizar a assinatura local.' }, 500);
  return json({ ok: true, accessUntil: keepsAccess ? sub.current_period_end : null });
});
