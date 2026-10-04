import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Header, Input, Loading, EmptyState, Screen, colors } from '@/components/ui';
import { PostCard } from '@/components/PostCard';
import { deletePost, fetchFeed, getErrorMessage, toggleLike } from '@/services/app';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

export default function FeedScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const [search, setSearch] = useState('');
  const client = useQueryClient();
  const feed = useQuery({ queryKey: ['feed', userId, search], queryFn: () => fetchFeed(userId, search), enabled: Boolean(userId) });
  const like = useMutation({ mutationFn: (postId: number) => toggleLike(postId, userId!), onSuccess: () => client.invalidateQueries({ queryKey: ['feed'] }), onError: (error) => Alert.alert('Erro', getErrorMessage(error)) });
  const remove = useMutation({ mutationFn: (postId: number) => deletePost(postId, userId!), onSuccess: () => client.invalidateQueries({ queryKey: ['feed'] }), onError: (error) => Alert.alert('Erro', getErrorMessage(error)) });

  useEffect(() => {
    const channel = supabase.channel('mobile-feed').on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => client.invalidateQueries({ queryKey: ['feed'] })).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [client]);

  if (!userId) return <Screen><Loading /></Screen>;

  return (
    <Screen>
      <Header
        title="Possível"
        subtitle="Ideias, conexões e impacto"
        right={
          <View style={styles.headerActions}>
            <Pressable style={styles.aiButton} onPress={() => router.push('/ai')} accessibilityLabel="Abrir Possível IA">
              <Ionicons name="sparkles" size={21} color={colors.primaryDark} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => router.push('/profile')} accessibilityLabel="Abrir perfil e mais opções">
              <Ionicons name="person-circle-outline" size={23} color={colors.text} />
            </Pressable>
            <Pressable style={styles.addButton} onPress={() => router.push('/post/create')} accessibilityLabel="Criar publicação">
              <Ionicons name="add" size={26} color="#FFFFFF" />
            </Pressable>
          </View>
        }
      />
      <Input value={search} onChangeText={setSearch} placeholder="Buscar publicações" autoCapitalize="none" />
      {feed.isLoading ? <Loading label="Carregando publicações..." /> : (
        <FlatList
          data={feed.data ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshing={feed.isRefetching}
          onRefresh={() => void feed.refetch()}
          renderItem={({ item }) => <PostCard post={item} currentUserId={userId} onToggleLike={async (id) => { await like.mutateAsync(id); }} onDelete={item.author_id === userId ? async (id) => { await remove.mutateAsync(id); } : undefined} />}
          ListEmptyComponent={<EmptyState title="O feed está vazio" description="Seja a primeira pessoa a compartilhar algo." action={<Pressable onPress={() => router.push('/post/create')}><Text style={styles.link}>Criar publicação</Text></Pressable>} />}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingVertical: 12, gap: 12, paddingBottom: 110 },
  headerActions: { flexDirection: 'row', gap: 7 },
  aiButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.lilac, alignItems: 'center', justifyContent: 'center' },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  addButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  link: { color: colors.primaryDark, fontWeight: '800', marginTop: 8 },
});
