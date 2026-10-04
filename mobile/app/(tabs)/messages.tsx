import { useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Badge, Card, EmptyState, Header, Loading, Screen, colors, typography } from '@/components/ui';
import { fetchConversations } from '@/services/app';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

export default function MessagesScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const client = useQueryClient();
  const conversations = useQuery({ queryKey: ['conversations', userId], queryFn: () => fetchConversations(userId!), enabled: Boolean(userId) });
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`conversation-list-${userId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => client.invalidateQueries({ queryKey: ['conversations'] })).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [client, userId]);
  if (!userId) return <Screen><Loading /></Screen>;
  return (
    <Screen>
      <Header title="Mensagens" subtitle="Conversas privadas em tempo real" />
      {conversations.isLoading ? <Loading label="Carregando conversas..." /> : (
        <FlatList
          data={conversations.data ?? []}
          keyExtractor={(item) => item.profile.id}
          contentContainerStyle={styles.list}
          refreshing={conversations.isRefetching}
          onRefresh={() => void conversations.refetch()}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/chat/${item.profile.id}`)}>
              <Card style={styles.card}>
                <Avatar uri={item.profile.avatar_url} name={item.profile.name} size={54} />
                <View style={styles.info}>
                  <Text style={styles.name}>{item.profile.name}</Text>
                  <Text style={typography.muted} numberOfLines={1}>{item.lastMessage.sender_id === userId ? 'Você: ' : ''}{item.lastMessage.body}</Text>
                </View>
                {item.unread > 0 ? <Badge>{item.unread}</Badge> : null}
              </Card>
            </Pressable>
          )}
          ListEmptyComponent={<EmptyState title="Sem conversas" description="Abra Conexões, encontre uma pessoa e envie a primeira mensagem." />}
        />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({ list: { paddingVertical: 12, gap: 10, paddingBottom: 110 }, card: { flexDirection: 'row', alignItems: 'center' }, info: { flex: 1 }, name: { color: colors.text, fontSize: 16, fontWeight: '800', marginBottom: 4 } });
