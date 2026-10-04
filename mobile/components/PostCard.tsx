import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Avatar, Badge, Card, colors, typography } from '@/components/ui';
import type { Post } from '@/types/database';

function PostVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return <VideoView player={player} style={styles.media} nativeControls contentFit="contain" />;
}

export function PostCard({
  post,
  currentUserId,
  onToggleLike,
  onDelete,
}: {
  post: Post;
  currentUserId?: string;
  onToggleLike: (id: number) => Promise<void>;
  onDelete?: (id: number) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const created = new Date(post.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

  async function like() {
    if (busy) return;
    setBusy(true);
    try {
      await onToggleLike(post.id);
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    if (!onDelete) return;
    Alert.alert('Excluir publicação', 'Essa ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => void onDelete(post.id) },
    ]);
  }

  return (
    <Card>
      <View style={styles.row}>
        <Avatar uri={post.author.avatar_url} name={post.author.name} />
        <View style={styles.authorBlock}>
          <Text style={styles.name}>{post.author.name}</Text>
          <Text style={typography.muted}>@{post.author.handle} · {created}</Text>
        </View>
        <Badge>{post.kind}</Badge>
      </View>
      <Text style={typography.body}>{post.body}</Text>
      {post.media_url && post.media_type?.startsWith('video') ? <PostVideo uri={post.media_url} /> : null}
      {post.media_url && !post.media_type?.startsWith('video') ? (
        <Image source={{ uri: post.media_url }} style={styles.media} resizeMode="cover" />
      ) : null}
      <View style={styles.actions}>
        <Pressable onPress={() => void like()} style={styles.action} disabled={busy} accessibilityRole="button" accessibilityLabel={post.liked_by_me ? 'Remover curtida' : 'Curtir publicação'}>
          <Ionicons name={post.liked_by_me ? 'heart' : 'heart-outline'} color={post.liked_by_me ? colors.danger : colors.muted} size={22} />
          <Text style={styles.actionText}>{post.likes_count}</Text>
        </Pressable>
        <Pressable onPress={() => router.push(`/post/${post.id}`)} style={styles.action} accessibilityRole="button" accessibilityLabel="Abrir comentários">
          <Ionicons name="chatbubble-outline" color={colors.muted} size={20} />
          <Text style={styles.actionText}>{post.comments_count}</Text>
        </Pressable>
        <Pressable onPress={() => router.push({ pathname: '/report', params: { postId: String(post.id) } })} style={styles.action} accessibilityRole="button" accessibilityLabel="Denunciar publicação">
          <Ionicons name="flag-outline" color={colors.muted} size={19} />
        </Pressable>
        {post.author_id === currentUserId && onDelete ? (
          <Pressable onPress={confirmDelete} style={[styles.action, styles.deleteAction]} accessibilityRole="button" accessibilityLabel="Excluir publicação">
            <Ionicons name="trash-outline" color={colors.danger} size={19} />
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorBlock: { flex: 1 },
  name: { color: colors.text, fontWeight: '800', fontSize: 15 },
  media: { width: '100%', height: 260, borderRadius: 14, backgroundColor: colors.surfaceAlt },
  actions: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
  action: { flexDirection: 'row', gap: 6, alignItems: 'center', minWidth: 54, paddingVertical: 4 },
  actionText: { color: colors.muted, fontWeight: '700' },
  deleteAction: { marginLeft: 'auto', minWidth: 30, justifyContent: 'flex-end' },
});
