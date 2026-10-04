import { useMemo, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, EmptyState, Header, Loading, Screen, colors, typography } from '@/components/ui';
import { deleteProMedia, fetchProMediaLibrary, getErrorMessage, getPlan, getProMediaSignedUrl, uploadProMedia, type ProMediaItem, type ProMediaKind } from '@/services/app';
import { useAuthStore } from '@/stores/auth';

const PRO_CLOUD_LIMIT_BYTES = 2 * 1024 * 1024 * 1024;

const categories: Array<{ key: ProMediaKind; label: string; icon: keyof typeof Ionicons.glyphMap; types: string[] }> = [
  { key: 'movie', label: 'Filmes', icon: 'film-outline', types: ['video/mp4', 'video/webm'] },
  { key: 'series', label: 'Séries', icon: 'tv-outline', types: ['video/mp4', 'video/webm'] },
  { key: 'book', label: 'Livros', icon: 'book-outline', types: ['application/pdf', 'application/epub+zip', 'text/plain'] },
  { key: 'music', label: 'Músicas', icon: 'musical-notes-outline', types: ['audio/mpeg', 'audio/mp4', 'audio/ogg'] },
];

function bytesLabel(bytes: number) {
  if (!bytes) return '0 MB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  return `${(bytes / 1024 / 1024).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
}

export default function ProLibraryScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const [kind, setKind] = useState<ProMediaKind>('movie');
  const client = useQueryClient();
  const plan = useQuery({ queryKey: ['plan', userId], queryFn: () => getPlan(userId!), enabled: Boolean(userId) });
  const library = useQuery({ queryKey: ['pro-media-library', userId], queryFn: () => fetchProMediaLibrary(userId!), enabled: Boolean(userId) && plan.data?.plan === 'pro' });
  const usedBytes = useMemo(() => (library.data ?? []).reduce((total, item) => total + Number(item.size_bytes || 0), 0), [library.data]);

  const upload = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Entre na sua conta.');
      const category = categories.find((item) => item.key === kind)!;
      const picked = await DocumentPicker.getDocumentAsync({ type: category.types, multiple: false, copyToCacheDirectory: true });
      if (picked.canceled) return null;
      const asset = picked.assets[0];
      if (!asset) throw new Error('Nenhum arquivo foi selecionado.');
      const assetSize = Number(asset.size || 0);
      if (assetSize > 500 * 1024 * 1024) throw new Error('O arquivo deve ter no máximo 500 MB nesta versão.');
      if (usedBytes + assetSize > PRO_CLOUD_LIMIT_BYTES) throw new Error('Sua nuvem Pro de 2 GB não tem espaço suficiente para este arquivo.');
      const defaultTitle = asset.name.replace(/\.[^.]+$/, '').slice(0, 180);
      return new Promise<ProMediaItem | null>((resolve, reject) => {
        Alert.alert(
          'Confirmar conteúdo',
          'Envie apenas conteúdo seu, licenciado para você ou em domínio público. O Possível não autoriza cópias piratas.',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(null) },
            {
              text: 'Confirmar e salvar',
              onPress: () => uploadProMedia({ userId, kind, title: defaultTitle, fileName: asset.name, mimeType: asset.mimeType, size: asset.size, uri: asset.uri }).then(resolve).catch(reject),
            },
          ],
        );
      });
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

  const filtered = useMemo(() => (library.data ?? []).filter((item) => item.kind === kind), [kind, library.data]);

  async function openItem(item: ProMediaItem) {
    try {
      const url = await getProMediaSignedUrl(item.storage_path);
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Não foi possível abrir', getErrorMessage(error));
    }
  }

  if (!userId || plan.isLoading) return <Screen><Loading /></Screen>;

  if (plan.data?.plan !== 'pro') {
    return (
      <Screen scroll>
        <Header title="Possível Play" subtitle="Entretenimento e nuvem pessoal do Pro" />
        <Card style={styles.locked}>
          <Ionicons name="lock-closed" size={38} color={colors.primary} />
          <Badge>EXCLUSIVO PRO</Badge>
          <Text style={styles.title}>Sua biblioteca em um só lugar</Text>
          <Text style={typography.muted}>Filmes e séries autorizados, livros virtuais, músicas e seus arquivos pessoais salvos em uma nuvem privada.</Text>
          <Button onPress={() => router.push('/plans')}>Conhecer Possível Pro</Button>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Header title="Possível Play" subtitle="Filmes, séries, livros, músicas e nuvem pessoal" />
      <Card>
        <View style={styles.heroRow}>
          <View style={{ flex: 1 }}>
            <Badge>PRO</Badge>
            <Text style={styles.title}>Biblioteca Pro</Text>
            <Text style={typography.muted}>Salve na nuvem conteúdo próprio, licenciado ou em domínio público e acesse em seus dispositivos.</Text>
            <Text style={styles.usage}>Nuvem: {bytesLabel(usedBytes)} de 2 GB usados</Text>
          </View>
          <Ionicons name="cloud-done-outline" size={42} color={colors.primary} />
        </View>
      </Card>

      <View style={styles.categories}>
        {categories.map((category) => (
          <Pressable key={category.key} style={[styles.category, kind === category.key && styles.categoryActive]} onPress={() => setKind(category.key)}>
            <Ionicons name={category.icon} size={20} color={kind === category.key ? '#FFFFFF' : colors.text} />
            <Text style={[styles.categoryText, kind === category.key && styles.categoryTextActive]}>{category.label}</Text>
          </Pressable>
        ))}
      </View>

      <Button loading={upload.isPending} onPress={() => upload.mutate()}>＋ Salvar arquivo na nuvem</Button>
      <Text style={typography.muted}>Cada arquivo pode ter até 500 MB. Conteúdo comercial de terceiros só pode entrar por parceria/licenciamento.</Text>

      {library.isLoading ? <Loading label="Carregando sua biblioteca..." /> : filtered.length === 0 ? (
        <EmptyState title={`Nenhum item em ${categories.find((item) => item.key === kind)?.label ?? 'sua biblioteca'}`} description="Adicione um arquivo autorizado para começar." />
      ) : filtered.map((item) => (
        <Card key={item.id}>
          <View style={styles.itemRow}>
            <View style={styles.itemIcon}><Ionicons name={categories.find((category) => category.key === item.kind)?.icon ?? 'document-outline'} size={24} color={colors.primary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={typography.muted}>{bytesLabel(item.size_bytes)}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Button style={styles.action} onPress={() => void openItem(item)}>{item.kind === 'book' ? 'Ler' : item.kind === 'music' ? 'Ouvir' : 'Assistir'}</Button>
            <Button style={styles.action} variant="danger" loading={remove.isPending} onPress={() => Alert.alert('Remover da nuvem?', item.title, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Remover', style: 'destructive', onPress: () => remove.mutate(item) }])}>Remover</Button>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  locked: { alignItems: 'center', gap: 12, paddingVertical: 28 },
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  usage: { color: colors.primaryDark, fontWeight: '900', marginTop: 8 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  category: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, minHeight: 42, borderRadius: 14, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  categoryActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { color: colors.text, fontWeight: '800' },
  categoryTextActive: { color: '#FFFFFF' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { color: colors.text, fontWeight: '900', fontSize: 17 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1 },
});
