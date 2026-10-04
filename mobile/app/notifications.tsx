import { useEffect } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Badge, Card, EmptyState, Header, Loading, Screen, colors, typography } from '@/components/ui';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '@/services/app';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

export default function NotificationsScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const client = useQueryClient();
  const notifications = useQuery({ queryKey: ['notifications', userId], queryFn: () => fetchNotifications(userId!), enabled: Boolean(userId) });
  const markAll = useMutation({ mutationFn: () => markAllNotificationsRead(userId!), onSuccess: () => client.invalidateQueries({ queryKey: ['notifications'] }) });
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`notifications-${userId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => client.invalidateQueries({ queryKey: ['notifications'] })).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [client, userId]);
  if (!userId) return <Screen><Loading /></Screen>;
  const currentUserId = userId;
  async function open(item: NonNullable<typeof notifications.data>[number]) {
    if (!item.read_at) await markNotificationRead(item.id, currentUserId);
    if (item.type === 'message' && item.actor_id) router.push(`/chat/${item.actor_id}`);
    else if (item.link?.startsWith('http')) void Linking.openURL(item.link);
    else router.back();
  }
  return <Screen><Header title="Notificações" subtitle="Atualizações da sua conta" right={<Pressable onPress={() => markAll.mutate()}><Text style={styles.link}>Marcar todas</Text></Pressable>} />{notifications.isLoading ? <Loading /> : <FlatList data={notifications.data ?? []} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.list} refreshing={notifications.isRefetching} onRefresh={() => void notifications.refetch()} renderItem={({ item }) => <Pressable onPress={() => void open(item)}><Card style={!item.read_at ? styles.unread : undefined}><View style={styles.row}><Avatar uri={item.actor?.avatar_url} name={item.actor?.name ?? item.title} /><View style={styles.info}><View style={styles.titleRow}><Text style={styles.title}>{item.title}</Text>{!item.read_at ? <Badge>NOVA</Badge> : null}</View><Text style={typography.muted}>{item.body}</Text><Text style={styles.time}>{new Date(item.created_at).toLocaleString('pt-BR')}</Text></View></View></Card></Pressable>} ListEmptyComponent={<EmptyState title="Tudo em dia" description="Suas notificações aparecerão aqui." />} />}</Screen>;
}
const styles = StyleSheet.create({ link: { color: colors.primary, fontWeight: '800' }, list: { paddingBottom: 40, gap: 10 }, unread: { borderColor: colors.primary }, row: { flexDirection: 'row', gap: 10 }, info: { flex: 1 }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, title: { color: colors.text, fontWeight: '800', flex: 1 }, time: { color: colors.muted, fontSize: 11, marginTop: 5 } });
