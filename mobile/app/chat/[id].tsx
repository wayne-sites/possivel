import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Header, Input, Loading, Screen, colors, typography } from '@/components/ui';
import { fetchMessages, getErrorMessage, getProfile, sendMessage, toggleBlock } from '@/services/app';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

export default function ChatScreen() {
  const { id: otherId } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore((state) => state.session?.user.id);
  const [body, setBody] = useState('');
  const listRef = useRef<FlatList>(null);
  const client = useQueryClient();
  const profile = useQuery({ queryKey: ['profile', otherId], queryFn: () => getProfile(otherId), enabled: Boolean(otherId) });
  const messages = useQuery({ queryKey: ['messages', userId, otherId], queryFn: () => fetchMessages(userId!, otherId), enabled: Boolean(userId && otherId) });
  const send = useMutation({ mutationFn: () => sendMessage(userId!, otherId, body), onSuccess: async () => { setBody(''); await client.invalidateQueries({ queryKey: ['messages', userId, otherId] }); }, onError: (error) => Alert.alert('Erro', getErrorMessage(error)) });
  useEffect(() => {
    if (!userId || !otherId) return;
    const channel = supabase.channel(`chat-${userId}-${otherId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => { const next = payload.new as { sender_id?: string; receiver_id?: string }; if ([next.sender_id, next.receiver_id].includes(userId) && [next.sender_id, next.receiver_id].includes(otherId)) void client.invalidateQueries({ queryKey: ['messages', userId, otherId] }); }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [client, otherId, userId]);
  useEffect(() => { if (messages.data?.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80); }, [messages.data?.length]);
  if (!userId || profile.isLoading) return <Screen><Loading /></Screen>;
  const person = profile.data;
  return (
    <Screen>
      <Header title={person?.name ?? 'Conversa'} subtitle={person ? `@${person.handle}` : undefined} right={<View style={styles.actions}><Pressable onPress={() => router.push({ pathname: '/call', params: { recipientId: otherId, mode: 'audio' } })}><Ionicons name="call-outline" size={22} color={colors.primary} /></Pressable><Pressable onPress={() => router.push({ pathname: '/call', params: { recipientId: otherId, mode: 'video' } })}><Ionicons name="videocam-outline" size={24} color={colors.primary} /></Pressable></View>} />
      {messages.isLoading ? <Loading label="Carregando mensagens..." /> : <FlatList ref={listRef} data={messages.data ?? []} keyExtractor={(item) => String(item.id)} contentContainerStyle={styles.list} renderItem={({ item }) => <View style={[styles.bubble, item.sender_id === userId ? styles.mine : styles.theirs]}><Text style={styles.message}>{item.body}</Text><Text style={styles.time}>{new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text></View>} ListEmptyComponent={<View style={styles.empty}><Avatar uri={person?.avatar_url} name={person?.name} size={70} /><Text style={typography.muted}>Envie a primeira mensagem para {person?.name ?? 'essa pessoa'}.</Text></View>} />}
      <View style={styles.composer}><Input style={styles.input} value={body} onChangeText={setBody} placeholder="Mensagem" multiline /><Button style={styles.sendButton} loading={send.isPending} onPress={() => send.mutate()}><Ionicons name="send" size={19} /></Button></View>
      <Pressable onLongPress={() => void Linking.openURL('https://possivel2026.github.io/possivel/')} onPress={() => Alert.alert('Bloquear pessoa', 'Você deixará de interagir com essa pessoa.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Bloquear', style: 'destructive', onPress: async () => { try { await toggleBlock(userId, otherId); router.back(); } catch (error) { Alert.alert('Erro', getErrorMessage(error)); } } }])}><Text style={styles.block}>Bloquear pessoa</Text></Pressable>
    </Screen>
  );
}
const styles = StyleSheet.create({ actions: { flexDirection: 'row', gap: 18, paddingRight: 6 }, list: { paddingVertical: 10, gap: 8 }, bubble: { maxWidth: '82%', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16 }, mine: { alignSelf: 'flex-end', backgroundColor: colors.primaryDark, borderBottomRightRadius: 4 }, theirs: { alignSelf: 'flex-start', backgroundColor: colors.surfaceAlt, borderBottomLeftRadius: 4 }, message: { color: colors.text, lineHeight: 20 }, time: { color: '#d0e4df', fontSize: 10, alignSelf: 'flex-end', marginTop: 3 }, composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingVertical: 8 }, input: { maxHeight: 110 }, sendButton: { width: 52, paddingHorizontal: 0 }, empty: { alignItems: 'center', gap: 12, paddingTop: 80 }, block: { color: colors.danger, textAlign: 'center', paddingBottom: 8, fontSize: 12, fontWeight: '700' } });
