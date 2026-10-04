import { useState } from 'react';
import { Alert, Image, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input, Screen, colors, typography } from '@/components/ui';
import { createPost, getErrorMessage, pickMedia, uploadMedia } from '@/services/app';
import { useAuthStore } from '@/stores/auth';

export default function CreatePostScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const client = useQueryClient();
  const [body, setBody] = useState('');
  const [asset, setAsset] = useState<{ uri: string; mimeType?: string | null } | null>(null);
  const [loading, setLoading] = useState(false);

  async function choose() {
    try {
      const selected = await pickMedia('all');
      if (selected) setAsset({ uri: selected.uri, mimeType: selected.mimeType });
    } catch (error) { Alert.alert('Galeria', getErrorMessage(error)); }
  }
  async function submit() {
    if (!userId) return;
    setLoading(true);
    try {
      const mediaUrl = asset ? await uploadMedia(userId, asset.uri, asset.mimeType) : null;
      await createPost(userId, { body, mediaUrl, mediaType: asset?.mimeType ?? null });
      await client.invalidateQueries({ queryKey: ['feed'] });
      router.back();
    } catch (error) { Alert.alert('Não foi possível publicar', getErrorMessage(error)); } finally { setLoading(false); }
  }
  return <Screen scroll><Text style={styles.title}>Nova publicação</Text><Text style={typography.muted}>O conteúdo aparecerá no site e no aplicativo.</Text><Card><Input label="O que você quer compartilhar?" value={body} onChangeText={setBody} multiline maxLength={5000} placeholder="Escreva sua ideia, atualização ou convite..." />{asset ? <Image source={{ uri: asset.uri }} style={styles.preview} /> : null}<Button variant="secondary" onPress={() => void choose()}>{asset ? 'Trocar mídia' : 'Adicionar foto ou vídeo'}</Button><Button loading={loading} onPress={() => void submit()}>Publicar</Button><Button variant="ghost" onPress={() => router.back()}>Cancelar</Button></Card></Screen>;
}
const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 20 }, preview: { width: '100%', height: 240, borderRadius: 14, backgroundColor: colors.surfaceAlt } });
