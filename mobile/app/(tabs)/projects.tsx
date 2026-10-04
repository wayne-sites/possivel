import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState, Header, Input, Loading, Screen, colors, typography } from '@/components/ui';
import { fetchCauses } from '@/services/app';

export default function ProjectsScreen() {
  const [search, setSearch] = useState('');
  const causes = useQuery({ queryKey: ['causes', search], queryFn: () => fetchCauses(search) });
  return (
    <Screen>
      <Header title="Causas" subtitle="Projetos que transformam comunidades" right={<Pressable style={styles.add} onPress={() => router.push('/project/create')}><Ionicons name="add" size={25} color="#06120e" /></Pressable>} />
      <Input value={search} onChangeText={setSearch} placeholder="Buscar causas e projetos" />
      {causes.isLoading ? <Loading label="Carregando causas..." /> : (
        <FlatList
          data={causes.data ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshing={causes.isRefetching}
          onRefresh={() => void causes.refetch()}
          renderItem={({ item }) => {
            const progress = Math.min(100, item.goal_amount > 0 ? (item.raised_amount / item.goal_amount) * 100 : 0);
            return (
              <Pressable onPress={() => router.push(`/project/${item.id}`)}>
                <Card>
                  {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.image} /> : null}
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={typography.muted} numberOfLines={3}>{item.description}</Text>
                  <View style={styles.track}><View style={[styles.progress, { width: `${progress}%` }]} /></View>
                  <View style={styles.row}><Text style={styles.raised}>{item.raised_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text><Text style={typography.muted}>meta {item.goal_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</Text></View>
                  <Text style={typography.muted}>{item.support_count} apoios · por @{item.creator.handle}</Text>
                </Card>
              </Pressable>
            );
          }}
          ListEmptyComponent={<EmptyState title="Nenhuma causa encontrada" description="Crie uma campanha real, sem dados fictícios." />}
        />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  add: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  list: { paddingVertical: 12, gap: 12, paddingBottom: 110 },
  image: { width: '100%', height: 190, borderRadius: 14, backgroundColor: colors.surfaceAlt },
  title: { color: colors.text, fontSize: 19, fontWeight: '900' },
  track: { height: 9, borderRadius: 999, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  progress: { height: '100%', backgroundColor: colors.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  raised: { color: colors.primary, fontWeight: '900' },
});
