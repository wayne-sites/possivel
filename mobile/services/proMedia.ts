import { supabase } from '@/lib/supabase';

export type ProMediaKind = 'movie' | 'series' | 'book' | 'music';

export type ProMediaItem = {
  id: number;
  owner_id: string;
  kind: ProMediaKind;
  title: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number;
  created_at: string;
};

export async function fetchProMediaLibrary(userId: string) {
  const { data, error } = await supabase
    .from('pro_media_library')
    .select('id,owner_id,kind,title,storage_path,mime_type,size_bytes,created_at')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProMediaItem[];
}

function safeFileName(name: string) {
  return name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(-120) || 'arquivo';
}

export async function uploadProMedia(input: {
  userId: string;
  kind: ProMediaKind;
  title: string;
  fileName: string;
  mimeType?: string | null;
  size?: number | null;
  uri: string;
}) {
  const title = input.title.trim().slice(0, 180);
  if (!title) throw new Error('Informe um título para o arquivo.');

  const fileName = `${Date.now()}-${safeFileName(input.fileName)}`;
  const path = `${input.userId}/${input.kind}/${fileName}`;
  const response = await fetch(input.uri);
  if (!response.ok) throw new Error('Não foi possível ler o arquivo escolhido.');
  const body = await response.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from('pro-library')
    .upload(path, body, {
      contentType: input.mimeType || undefined,
      cacheControl: '3600',
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('pro_media_library')
    .insert({
      owner_id: input.userId,
      kind: input.kind,
      title,
      storage_path: path,
      mime_type: input.mimeType || null,
      size_bytes: Number(input.size || body.byteLength || 0),
    })
    .select('id,owner_id,kind,title,storage_path,mime_type,size_bytes,created_at')
    .single();

  if (error) {
    await supabase.storage.from('pro-library').remove([path]);
    throw error;
  }

  return data as ProMediaItem;
}

export async function getProMediaSignedUrl(storagePath: string) {
  const { data, error } = await supabase.storage.from('pro-library').createSignedUrl(storagePath, 60 * 30);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Não foi possível abrir este conteúdo.');
  return data.signedUrl;
}

export async function deleteProMedia(item: ProMediaItem) {
  const { error: storageError } = await supabase.storage.from('pro-library').remove([item.storage_path]);
  if (storageError) throw storageError;
  const { error } = await supabase.from('pro_media_library').delete().eq('id', item.id).eq('owner_id', item.owner_id);
  if (error) throw error;
}
