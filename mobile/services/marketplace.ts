import { supabase } from '@/lib/supabase';
import type { Listing, Profile } from '@/types/database';
import { one } from './common';

const listingSelect = `id,seller_id,title,description,listing_type,price,location,image_url,category,images,status,created_at,
 seller:profiles!listings_seller_id_fkey(id,name,handle,avatar_url,bio)`;

export async function fetchListings(search = '', type = 'todos') {
  let query = supabase.from('listings').select(listingSelect).eq('status', 'active').order('created_at', { ascending: false }).limit(60);
  if (search.trim()) query = query.or(`title.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%,location.ilike.%${search.trim()}%`);
  if (type !== 'todos') query = query.eq('listing_type', type);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ ...row, id: Number(row.id), price: row.price === null ? null : Number(row.price), seller: one<Profile>(row.seller) })) as Listing[];
}

export async function fetchListing(id: number) {
  const { data, error } = await supabase.from('listings').select(listingSelect).eq('id', id).single();
  if (error) throw error;
  return { ...data, id: Number(data.id), price: data.price === null ? null : Number(data.price), seller: one<Profile>((data as any).seller) } as Listing;
}

export async function createListing(userId: string, input: Omit<Listing, 'id' | 'seller_id' | 'status' | 'created_at' | 'seller' | 'images'>) {
  const { data: allowed, error: limitError } = await supabase.rpc('check_plan_limit', { p_user_id: userId, p_feature_key: 'active_listings' });
  if (limitError) throw limitError;
  if (!allowed) throw new Error('Você atingiu o limite de anúncios ativos do seu plano.');
  const { data, error } = await supabase.from('listings').insert({
    seller_id: userId,
    title: input.title.trim(),
    description: input.description.trim(),
    listing_type: input.listing_type,
    price: input.listing_type === 'venda' ? input.price : null,
    location: input.location.trim(),
    image_url: input.image_url,
    category: input.category,
    images: input.image_url ? [input.image_url] : [],
  }).select('id').single();
  if (error) throw error;
  return Number(data.id);
}

export async function updateListingStatus(id: number, userId: string, status: Listing['status']) {
  const { error } = await supabase.from('listings').update({ status }).eq('id', id).eq('seller_id', userId);
  if (error) throw error;
}
