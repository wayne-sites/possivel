import { supabase } from '@/lib/supabase';
import type { Conversation, Message, Profile } from '@/types/database';

export async function searchProfiles(userId: string, search = '') {
  let query = supabase.from('profiles').select('id,name,handle,avatar_url,bio').neq('id', userId).order('name').limit(50);
  if (search.trim()) query = query.or(`name.ilike.%${search.trim()}%,handle.ilike.%${search.trim()}%`);
  const [{ data: profiles, error }, { data: follows, error: followsError }] = await Promise.all([
    query,
    supabase.from('follows').select('following_id').eq('follower_id', userId),
  ]);
  if (error) throw error;
  if (followsError) throw followsError;
  const following = new Set((follows ?? []).map((item) => item.following_id));
  return (profiles ?? []).map((profile) => ({ profile: profile as Profile, following: following.has(profile.id) }));
}

export async function toggleFollow(userId: string, targetId: string) {
  const { data, error } = await supabase.from('follows').select('following_id').eq('follower_id', userId).eq('following_id', targetId).maybeSingle();
  if (error) throw error;
  const result = data
    ? await supabase.from('follows').delete().eq('follower_id', userId).eq('following_id', targetId)
    : await supabase.from('follows').insert({ follower_id: userId, following_id: targetId });
  if (result.error) throw result.error;
  return !data;
}

export async function toggleBlock(userId: string, targetId: string) {
  const { data, error } = await supabase.from('user_blocks').select('blocked_id').eq('blocker_id', userId).eq('blocked_id', targetId).maybeSingle();
  if (error) throw error;
  const result = data
    ? await supabase.from('user_blocks').delete().eq('blocker_id', userId).eq('blocked_id', targetId)
    : await supabase.from('user_blocks').insert({ blocker_id: userId, blocked_id: targetId });
  if (result.error) throw result.error;
  return !data;
}

export async function fetchConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id,sender_id,receiver_id,body,created_at,read_at')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw error;
  const messages = (data ?? []) as Message[];
  const ids = [...new Set(messages.map((message) => (message.sender_id === userId ? message.receiver_id : message.sender_id)))];
  if (!ids.length) return [];
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('id,name,handle,avatar_url,bio').in('id', ids);
  if (profileError) throw profileError;
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile as Profile]));
  return ids
    .map((id) => {
      const related = messages.filter((message) => message.sender_id === id || message.receiver_id === id);
      const lastMessage = related[0];
      const profile = profileMap.get(id);
      if (!lastMessage || !profile) return null;
      const unread = related.filter((message) => message.receiver_id === userId && !message.read_at).length;
      return { profile, lastMessage, unread };
    })
    .filter((item): item is Conversation => Boolean(item))
    .sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
}

export async function fetchMessages(userId: string, otherId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('id,sender_id,receiver_id,body,created_at,read_at')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) throw error;
  await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('sender_id', otherId).eq('receiver_id', userId).is('read_at', null);
  return (data ?? []) as Message[];
}

export async function sendMessage(userId: string, receiverId: string, body: string) {
  if (!body.trim()) return;
  const { error } = await supabase.from('messages').insert({ sender_id: userId, receiver_id: receiverId, body: body.trim() });
  if (error) throw error;
}
