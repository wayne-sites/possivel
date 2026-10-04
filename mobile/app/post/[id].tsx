import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Card, EmptyState, Header, Input, Loading, Screen, colors, typography } from '@/components/ui';
import { PostCard } from '@/components/PostCard';
import { addComment, deleteComment, fetchComments, fetchPost, getErrorMessage, toggleLike } from '@/services/app';
import { useAuthStore } from '@/stores/auth';

export default function PostDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const postId = Number(params.id);
  const userId = useAuthStore((state) => state.session?.user.id);
  const [body, setBody] = useState('');
  const client = useQueryClient();
  const post = useQuery({ queryKey: ['post', postId, userId], queryFn: () => fetchPost(postId, userId), enabled: Number.isFinite(postId) });
  const comments = useQuery({ queryKey: ['comments', postId], queryFn: () => fetchComments(postId), enabled: Number.isFinite(postId) });
  const comment = useMutation({ mutationFn: () => addComment(postId, userId!, body), onSuccess: async () => { setBody(''); await Promise.all([client.invalidateQueries({ queryKey: ['comments', postId] }), client.invalidateQueries({ queryKey: ['post', postId] }), client.invalidateQueries({ queryKey: ['feed'] })]); }, onError: (error) => Alert.alert('Erro', getErrorMessage(error)) });
  const remove = useMutation({ mutationFn: (id: number) => deleteComment(id, userId!), onSuccess: () => client.invalidateQueries({ queryKey: ['comments', postId] }), onError: (error) => Alert.alert('Erro', getErrorMessage(error)) });
  if (!userId || post.isLoading) return <Screen><Loading /></Screen>;
  if (!post.data) return <Screen><Header title="Publicação" /><EmptyState title="Publicação indisponível" description="Ela pode ter sido removida." /></Screen>;
  return (
    <Screen>
      <Header title="Publicação" right={<Pressable onPress={() => router.back()}><Text style={styles.link}>Voltar</Text></Pressable>} />
      <FlatList
        data={comments.data ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<><PostCard post={post.data} currentUserId={userId} onToggleLike={async () => { await toggleLike(postId, userId); await Promise.all([client.invalidateQueries({ queryKey: ['post', postId] }), client.invalidateQueries({ queryKey: ['feed'] })]); }} /><Text style={styles.section}>Comentários</Text></>}
        renderItem={({ item }) => <Card><View style={styles.row}><Avatar uri={item.author.avatar_url} name={item.author.name} size={38} /><View style={styles.info}><Text style={styles.name}>{item.author.name}</Text><Text style={typography.muted}>@{item.author.handle}</Text></View>{item.author_id === userId ? <Pressable onPress={() => remove.mutate(item.id)}><Text style={styles.delete}>Excluir</Text></Pressable> : null}</View><Text style={typography.body}>{item.body}</Text></Card>}
        ListEmptyComponent={<EmptyState title="Sem comentários" description="Comece a conversa." />}
        ListFooterComponent={<Card><Input value={body} onChangeText={setBody} multiline placeholder="Escreva um comentário..." maxLength={1000} /><Button loading={comment.isPending} onPress={() => comment.mutate()}>Comentar</Button></Card>}
      />
    </Screen>
  );
}
const styles = StyleSheet.create({ list: { paddingBottom: 40, gap: 11 }, link: { color: colors.primary, fontWeight: '800' }, section: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 8 }, row: { flexDirection: 'row', gap: 9, alignItems: 'center' }, info: { flex: 1 }, name: { color: colors.text, fontWeight: '800' }, delete: { color: colors.danger, fontWeight: '700' } });
