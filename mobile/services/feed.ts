import { supabase } from '@/lib/supabase';
import type { Comment, Post, Profile } from '@/types/database';
import { one } from './common';

function mapPost(row: any, userId?: string): Post {
  const likes = Array.isArray(row.post_likes) ? row.post_likes : [];
  const comments = Array.isArray(row.comments) ? row.comments : [];
  return {
    id: Number(row.id),
    author_id: row.author_id,
    body: row.body,
    kind: row.kind,
    media_url: row.media_url,
    media_type: row.media_type,
    created_at: row.created_at,
    author: one<Profile>(row.author) ?? { id: row.author_id, name: 'Pessoa', handle: 'usuario', avatar_url: null, bio: '' },
    likes_count: likes.length,
    comments_count: comments.length,
    liked_by_me: Boolean(userId && likes.some((like: { user_id: string }) => like.user_id === userId)),
  };
}

const postSelect = `id,author_id,body,kind,media_url,media_type,created_at,
  author:profiles!posts_author_id_fkey(id,name,handle,avatar_url,bio),
  post_likes(user_id),comments(id)`;

export async function fetchFeed(userId?: string, search = '') {
  let query = supabase.from('posts').select(postSelect).order('created_at', { ascending: false }).limit(50);
  if (search.trim()) query = query.ilike('body', `%${search.trim()}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapPost(row, userId));
}

export async function fetchPost(postId: number, userId?: string) {
  const { data, error } = await supabase.from('posts').select(postSelect).eq('id', postId).single();
  if (error) throw error;
  return mapPost(data, userId);
}

export async function createPost(userId: string, input: { body: string; mediaUrl?: string | null; mediaType?: string | null }) {
  const body = input.body.trim();
  if (!body) throw new Error('Escreva algo para publicar.');
  const kind = input.mediaType?.startsWith('video') ? 'Vídeo' : input.mediaUrl ? 'Foto' : 'Post';
  const { data, error } = await supabase
    .from('posts')
    .insert({ author_id: userId, body, kind, media_url: input.mediaUrl ?? null, media_type: input.mediaType ?? null })
    .select('id')
    .single();
  if (error) throw error;
  return Number(data.id);
}

export async function deletePost(postId: number, userId: string) {
  const { error } = await supabase.from('posts').delete().eq('id', postId).eq('author_id', userId);
  if (error) throw error;
}

export async function toggleLike(postId: number, userId: string) {
  const { data, error } = await supabase.from('post_likes').select('post_id').eq('post_id', postId).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  const result = data
    ? await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId)
    : await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
  if (result.error) throw result.error;
  return !data;
}

export async function fetchComments(postId: number) {
  const { data, error } = await supabase
    .from('comments')
    .select('id,post_id,author_id,body,created_at,author:profiles!comments_author_id_fkey(id,name,handle,avatar_url,bio)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({ ...row, id: Number(row.id), post_id: Number(row.post_id), author: one<Profile>(row.author) })) as Comment[];
}

export async function addComment(postId: number, userId: string, body: string) {
  if (!body.trim()) throw new Error('Escreva um comentário.');
  const { error } = await supabase.from('comments').insert({ post_id: postId, author_id: userId, body: body.trim() });
  if (error) throw error;
}

export async function deleteComment(commentId: number, userId: string) {
  const { error } = await supabase.from('comments').delete().eq('id', commentId).eq('author_id', userId);
  if (error) throw error;
}
