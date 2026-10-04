import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Button, Card, EmptyState, Header, Loading, Screen, colors, typography } from '@/components/ui';
import { fetchCause } from '@/services/app';

export default function CauseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const causeId = Number(id);
  const cause = useQuery({ queryKey: ['cause', causeId], queryFn: () => fetchCause(causeId), enabled: Number.isFinite(causeId) });
  if (cause.isLoading) return <Screen><Loading /></Screen>; if (!cause.data) return <Screen><EmptyState title="Causa indisponível" description="Ela pode ter sido encerrada." /></Screen>;
  const item = cause.data; const progress = Math.min(100, item.goal_amount > 0 ? (item.raised_amount / item.goal_amount) * 100 : 0);
  return <Screen scroll><Header title="Causa" right={<Pressable onPress={() => router.back()}><Text style={styles.link}>Voltar</Text></Pressable>} />{item.image_url ? <Image source={{ uri: item.image_url }} style={styles.image} /> : null}<Card><Text style={styles.title}>{item.title}</Text><Text style={typography.body}>{item.description}</Text><View style={styles.track}><View style={[styles.progress, { width: `${progress}%` }]} /></View><View style={styles.row}><Text style={styles.raised}>{item.raised_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text><Text style={typography.muted}>de {item.goal_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text></View><Text style={typography.muted}>{item.support_count} pessoas apoiaram</Text><Button onPress={() => router.push(`/project/${causeId}/donate`)}>Apoiar esta causa</Button></Card><Card><View style={styles.creator}><Avatar uri={item.creator.avatar_url} name={item.creator.name} /><View><Text style={styles.name}>{item.creator.name}</Text><Text style={typography.muted}>@{item.creator.handle}</Text></View></View><Button variant="secondary" onPress={() => router.push(`/chat/${item.creator_id}`)}>Falar com responsável</Button></Card></Screen>;
}
const styles = StyleSheet.create({ link: { color: colors.primary, fontWeight: '800' }, image: { width: '100%', height: 280, borderRadius: 18 }, title: { color: colors.text, fontSize: 26, fontWeight: '900' }, track: { height: 11, backgroundColor: colors.surfaceAlt, borderRadius: 999, overflow: 'hidden' }, progress: { height: '100%', backgroundColor: colors.primary }, row: { flexDirection: 'row', justifyContent: 'space-between' }, raised: { color: colors.primary, fontSize: 20, fontWeight: '900' }, creator: { flexDirection: 'row', gap: 11, alignItems: 'center' }, name: { color: colors.text, fontWeight: '800' } });
