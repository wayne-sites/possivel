import { supabase } from '@/lib/supabase';
import type { Cause, Profile } from '@/types/database';
import { one } from './common';

const causeSelect = `id,creator_id,title,description,goal_amount,raised_amount,support_count,image_url,status,created_at,
 creator:profiles!causes_creator_id_fkey(id,name,handle,avatar_url,bio)`;

export async function fetchCauses(search = '') {
  let query = supabase.from('causes').select(causeSelect).eq('status', 'active').order('created_at', { ascending: false }).limit(60);
  if (search.trim()) query = query.or(`title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    ...row,
    id: Number(row.id),
    goal_amount: Number(row.goal_amount),
    raised_amount: Number(row.raised_amount),
    support_count: Number(row.support_count),
    creator: one<Profile>(row.creator),
  })) as Cause[];
}

export async function fetchCause(id: number) {
  const { data, error } = await supabase.from('causes').select(causeSelect).eq('id', id).single();
  if (error) throw error;
  return {
    ...data,
    id: Number(data.id),
    goal_amount: Number(data.goal_amount),
    raised_amount: Number(data.raised_amount),
    support_count: Number(data.support_count),
    creator: one<Profile>((data as any).creator),
  } as Cause;
}

export async function createCause(userId: string, input: { title: string; description: string; goalAmount: number; imageUrl?: string | null }) {
  const { data, error } = await supabase.from('causes').insert({
    creator_id: userId,
    title: input.title.trim(),
    description: input.description.trim(),
    goal_amount: input.goalAmount,
    image_url: input.imageUrl ?? null,
  }).select('id').single();
  if (error) throw error;
  return Number(data.id);
}

export async function createPaymentCheckout(input: { kind: 'purchase' | 'donation'; amount: number; listingId?: number; causeId?: number; purpose: string }) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw authError ?? new Error('Não autenticado.');
  const { data: payment, error: paymentError } = await supabase.from('payments').insert({
    payer_id: authData.user.id,
    listing_id: input.listingId ?? null,
    cause_id: input.causeId ?? null,
    kind: input.kind,
    amount: input.amount,
    provider: 'mercadopago',
    purpose: input.purpose,
    status: 'pending',
  }).select('id').single();
  if (paymentError) throw paymentError;
  const { data, error } = await supabase.functions.invoke('create-payment-checkout', { body: { paymentId: payment.id } });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  const url = data?.checkout_url ?? data?.checkoutUrl ?? data?.init_point;
  if (!url) throw new Error('O checkout não retornou um link.');
  return String(url);
}
