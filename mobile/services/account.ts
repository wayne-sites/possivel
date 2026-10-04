import { supabase } from '@/lib/supabase';
import type { Notification, Profile } from '@/types/database';
import { one } from './common';

export async function fetchNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('id,user_id,actor_id,type,title,body,link,read_at,created_at,actor:profiles!notifications_actor_id_fkey(id,name,handle,avatar_url,bio)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ ...row, id: Number(row.id), actor: one<Profile>(row.actor) })) as Notification[];
}

export async function markNotificationRead(id: number, userId: string) {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', userId).is('read_at', null);
  if (error) throw error;
}

export async function getPlan(userId: string) {
  const [{ data: plan, error }, { data: entitlements, error: entitlementError }, { data: subscription, error: subscriptionError }] = await Promise.all([
    supabase.rpc('get_effective_plan', { p_user_id: userId }),
    supabase.rpc('get_user_entitlements', { p_user_id: userId }),
    supabase.from('subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (error) throw error;
  if (entitlementError) throw entitlementError;
  if (subscriptionError) throw subscriptionError;
  return { plan: String(plan ?? 'free') as 'free' | 'pro', entitlements: entitlements ?? [], subscription };
}

export async function startProCheckout() {
  const { data, error } = await supabase.functions.invoke('create-subscription-checkout', { body: {} });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.checkoutUrl) throw new Error('O checkout do plano Pro não retornou um link.');
  return String(data.checkoutUrl);
}

export async function cancelSubscription() {
  const { data, error } = await supabase.functions.invoke('cancel-subscription', { body: {} });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

export async function createCallRoom(recipientId: string, mode: 'audio' | 'video') {
  const { data, error } = await supabase.functions.invoke('create-call-room', { body: { recipientId, mode } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.room_url) throw new Error('A sala não retornou um link.');
  return String(data.room_url);
}

export async function createReport(userId: string, input: { postId?: number; reason: 'spam' | 'harassment' | 'violence' | 'illegal' | 'other'; details: string }) {
  const { error } = await supabase.from('reports').insert({ reporter_id: userId, post_id: input.postId ?? null, reason: input.reason, details: input.details.trim() });
  if (error) throw error;
}
