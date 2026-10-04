import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, EmptyState, Header, Loading, Screen, colors, typography } from '@/components/ui';
import { deleteProMedia, fetchProMediaLibrary, getErrorMessage, getPlan, getProMediaSignedUrl, uploadProMedia, type ProMediaItem, type ProMediaKind } from '@/services/app';
import { useAuthStore } from '@/stores/auth';

const MAX_FILE_BYTES = 500 * 1024 * 1024;
const CLOUD_QUOTA_BYTES = 2 * 1024 * 1024 * 1024;

function bytesLabel(bytes: number) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function ProMediaTab({ mode }: { mode: 'books' | 'watch' }) {
  const userId = useAuthStore((state) => state.session?.user.id);
  const [watchKind, setWatchKind] = useState<'movie' | 'series'>('movie');
  const client = useQueryClient();
  const isBooks = mode === 'books';

  const plan = useQuery({
    queryKey: ['plan', userId],
    queryFn: () => getPlan(userId!),
    enabled: Boolean(userId),
  });

  const library = useQuery({
    queryKey: ['pro-media-library', userId],
    queryFn: () => fetchProMediaLibrary(userId!),
    enabled: Boolean(userId) && plan.data?.plan === 'pro',
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Entre na sua conta.');
      const kind: ProMediaKind = isBooks ? 'book' : watchKind;
      const types = isBooks
        ? ['application/pdf', 'application/epub+zip', 'text/plain']
        : ['video/mp4', 'video/webm'];
      const picked = await DocumentPicker.getDocumentAsync({ type: types, multiple: false, copyToCacheDirectory: true });
      if (picked.canceled) return null;
      const asset = picked.assets[0];
      if (!asset) throw new Error('Nenhum arquivo foi selecionado.');
      if ((asset.size ?? 0) > MAX_FILE_BYTES) throw new Error('Cada arquivo pode ter no máximo 500 MB.');
      const title = asset.name.replace(/\.[^.]+$/, '').slice(0, 180) || 'Arquivo';
      return uploadProMedia({ userId, kind, title, fileName: asset.name, mimeType: asset.mimeType, size: asset.size, uri: asset.uri });
    },
    onSuccess: async (item) => {
      if (!item) return;
      await client.invalidateQueries({ queryKey: ['pro-media-library'] });
      Alert.alert('Salvo na nuvem', 'O conteúdo foi adicionado à sua Biblioteca Pro.');
    },
    onError: (error) => Alert.alert('Não foi possível salvar', getErrorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: deleteProMedia,
    onSuccess: async () => client.invalidateQueries({ queryKey: ['pro-media-library'] }),
    onError: (error) => Alert.alert('Erro', getErrorMessage(error)),
  });

  async function openItem(item: ProMediaItem) {
    try {
      await Linking.openURL(await getProMediaSignedUrl(item.storage_path));
    } catch (error) {
      Alert.alert('Não foi possível abrir', getErrorMessage(error));
    }
  }

  if (!userId || plan.isLoading) return <Screen><Loading /></Screen>;

  if (plan.data?.plan !== 'pro') {
    return (
      <Screen scroll>
        <Header title={isBooks ? 'Livros' : 'Filmes e séries'} subtitle="Possível Play" />
        <Card style={styles.locked}>
          <Ionicons name="lock-closed" size={38} color={colors.primary} />
          <Badge>EXCLUSIVO PRO</Badge>
          <Text style={styles.title}>{isBooks ? 'Sua biblioteca de livros' : 'Sua biblioteca de filmes e séries'}</Text>
          <Text style={typography.muted}>Assine o Possível Pro por R$ 15,99/mês para usar a nuvem pessoal e abrir conteúdo próprio, licenciado ou em domínio público.</Text>
          <Button onPress={() => router.push('/plans')}>Conhecer Possível Pro</Button>
        </Card>
      </Screen>
    );
  }

  const items = (library.data ?? []).filter((item) => isBooks ? item.kind === 'book' : item.kind === 'movie' || item.kind === 'series');
  const used = (library.data ?? []).reduce((sum, item) => sum + Number(item.size_bytes || 0), 0);
  const usedPercent = Math.min(100, Math.round((used / CLOUD_QUOTA_BYTES) * 100));

  return (
    <Screen scroll>
      <Header title={isBooks ? 'Livros' : 'Filmes e séries'} subtitle="Possível Play · Pro" />
      <Card>
        <View style={styles.hero}>
          <View style={styles.grow}>
            <Badge>PRO</Badge>
            <Text style={styles.title}>{isBooks ? 'Leitura na sua nuvem' : 'Assista onde quiser'}</Text>
            <Text style={typography.muted}>{isBooks ? 'PDF, EPUB e texto autorizados.' : 'MP4 e WebM próprios ou licenciados.'}</Text>
          </View>
          <Ionicons name={isBooks ? 'book-outline' : 'film-outline'} size={40} color={colors.primary} />
        </View>
      </Card>

      {!isBooks ? (
        <View style={styles.kindRow}>
          <Pressable style={[styles.kindChip, watchKind === 'movie' && styles.kindActive]} onPress={() => setWatchKind('movie')}>
            <Text style={[styles.kindText, watchKind === 'movie' && styles.kindTextActive]}>Filme</Text>
          </Pressable>
          <Pressable style={[styles.kindChip, watchKind === 'series' && styles.kindActive]} onPress={() => setWatchKind('series')}>
            <Text style={[styles.kindText, watchKind === 'series' && styles.kindTextActive]}>Série</Text>
          </Pressable>
        </View>
      ) : null}

      <Card>
        <Text style={styles.usage}>Nuvem: {bytesLabel(used)} de 2 GB · {usedPercent}%</Text>
        <View style={styles.progress}><View style={[styles.progressFill, { width: `${usedPercent}%` }]} /></View>
        <Button loading={upload.isPending} onPress={() => upload.mutate()}>{isBooks ? '＋ Salvar livro na nuvem' : '＋ Salvar vídeo na nuvem'}</Button>
        <Text style={typography.muted}>Até 500 MB por arquivo. Não envie cópias piratas ou conteúdo sem autorização.</Text>
      </Card>

      {library.isLoading ? <Loading label="Carregando biblioteca..." /> : library.isError ? (
        <EmptyState title="Biblioteca indisponível" description={getErrorMessage(library.error)} />
      ) : items.length === 0 ? (
        <EmptyState title={isBooks ? 'Nenhum livro salvo' : 'Nenhum filme ou série salvo'} description="Adicione um arquivo autorizado para começar." />
      ) : items.map((item) => (
        <Card key={item.id}>
          <View style={styles.itemRow}>
            <Ionicons name={item.kind === 'book' ? 'book-outline' : item.kind === 'series' ? 'tv-outline' : 'film-outline'} size={25} color={colors.primary} />
            <View style={styles.grow}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={typography.muted}>{item.kind === 'series' ? 'Série' : item.kind === 'movie' ? 'Filme' : 'Livro'} · {bytesLabel(item.size_bytes)}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Button style={styles.action} onPress={() => void openItem(item)}>{item.kind === 'book' ? 'Ler' : 'Assistir'}</Button>
            <Button style={styles.action} variant="danger" loading={remove.isPending} onPress={() => Alert.alert('Remover da nuvem?', item.title, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Remover', style: 'destructive', onPress: () => remove.mutate(item) }])}>Remover</Button>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  locked: { alignItems: 'center', gap: 12, paddingVertical: 28 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1 },
  title: { color: colors.text, fontSize: 23, fontWeight: '900' },
  kindRow: { flexDirection: 'row', gap: 8 },
  kindChip: { flex: 1, minHeight: 44, borderRadius: 14, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  kindActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  kindText: { color: colors.text, fontWeight: '800' },
  kindTextActive: { color: '#FFFFFF' },
  usage: { color: colors.text, fontWeight: '800' },
  progress: { height: 8, borderRadius: 99, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 99 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemTitle: { color: colors.text, fontWeight: '900', fontSize: 17 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1 },
});
