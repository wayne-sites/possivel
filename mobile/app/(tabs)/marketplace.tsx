import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Badge, Card, EmptyState, Header, Input, Loading, Screen, colors, typography } from '@/components/ui';
import { fetchListings } from '@/services/app';

const filters = ['todos', 'venda', 'troca', 'doacao'] as const;
export default function MarketplaceScreen() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<(typeof filters)[number]>('todos');
  const listings = useQuery({ queryKey: ['listings', search, type], queryFn: () => fetchListings(search, type) });
  return (
    <Screen>
      <Header title="Marketplace" subtitle="Venda, troque ou doe" right={<Pressable style={styles.add} onPress={() => router.push('/listing/create')}><Ionicons name="add" size={25} color="#06120e" /></Pressable>} />
      <Input value={search} onChangeText={setSearch} placeholder="Buscar produtos, serviços ou locais" />
      <View style={styles.filters}>{filters.map((filter) => <Pressable key={filter} onPress={() => setType(filter)} style={[styles.filter, type === filter && styles.filterActive]}><Text style={[styles.filterText, type === filter && styles.filterTextActive]}>{filter === 'todos' ? 'Todos' : filter === 'doacao' ? 'Doação' : filter[0]?.toUpperCase() + filter.slice(1)}</Text></Pressable>)}</View>
      {listings.isLoading ? <Loading label="Carregando anúncios..." /> : (
        <FlatList
          data={listings.data ?? []}
          numColumns={2}
          columnWrapperStyle={styles.columns}
          contentContainerStyle={styles.list}
          keyExtractor={(item) => String(item.id)}
          refreshing={listings.isRefetching}
          onRefresh={() => void listings.refetch()}
          renderItem={({ item }) => (
            <Pressable style={styles.item} onPress={() => router.push(`/listing/${item.id}`)}>
              <Card style={styles.card}>
                {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.image} /> : <View style={[styles.image, styles.placeholder]}><Ionicons name="image-outline" size={30} color={colors.muted} /></View>}
                <Badge>{item.listing_type === 'doacao' ? 'Doação' : item.listing_type}</Badge>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.price}>{item.listing_type === 'venda' && item.price !== null ? item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : item.listing_type === 'troca' ? 'Proposta de troca' : 'Grátis'}</Text>
                <Text style={typography.muted} numberOfLines={1}>{item.location}</Text>
              </Card>
            </Pressable>
          )}
          ListEmptyComponent={<View style={styles.full}><EmptyState title="Nenhum anúncio" description="Crie o primeiro anúncio do marketplace." /></View>}
        />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  add: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', gap: 7, marginVertical: 10 },
  filter: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  filterActive: { backgroundColor: colors.primary },
  filterText: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  filterTextActive: { color: '#06120e' },
  list: { paddingBottom: 110, gap: 10 },
  columns: { gap: 10 },
  item: { flex: 1 },
  card: { flex: 1, minHeight: 250 },
  image: { width: '100%', height: 112, borderRadius: 12, backgroundColor: colors.surfaceAlt },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontWeight: '800', lineHeight: 19 },
  price: { color: colors.primary, fontWeight: '900' },
  full: { flex: 1, width: '100%' },
});
