import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { extFrom } from './common';

export async function pickMedia(kind: 'image' | 'all' = 'all') {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Permita o acesso à galeria para escolher uma mídia.');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: kind === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.All,
    quality: 0.82,
    allowsEditing: kind === 'image',
  });
  if (result.canceled) return null;
  return result.assets[0] ?? null;
}

export async function uploadMedia(userId: string, uri: string, mimeType?: string | null) {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Não foi possível ler a mídia escolhida.');
  const bytes = await response.arrayBuffer();
  const extension = extFrom(uri, mimeType);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
  const contentType = mimeType || (extension === 'mp4' ? 'video/mp4' : `image/${extension === 'jpg' ? 'jpeg' : extension}`);
  const { error } = await supabase.storage.from('posts-media').upload(path, bytes, { contentType, upsert: false });
  if (error) throw error;
  return supabase.storage.from('posts-media').getPublicUrl(path).data.publicUrl;
}
