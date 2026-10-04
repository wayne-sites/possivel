import { Alert, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Badge, Button, Card, EmptyState, Header, Loading, Screen, colors, typography } from '@/components/ui';
import { createPaymentCheckout, fetchListing, getErrorMessage, updateListingStatus } from '@/services/app';
import { useAuthStore } from '@/stores/auth';

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listingId = Number(id);
  const userId = useAuthStore((state) => state.session?.user.id);
  const client = useQueryClient();
  const listing = useQuery({ queryKey: ['listing', listingId], queryFn: () => fetchListing(listingId), enabled: Number.isFinite(listingId) });
  const status = useMutation({ mutationFn: (next: 'sold' | 'active' | 'closed') => updateListingStatus(listingId, userId!, next), onSuccess: async () => { await Promise.all([client.invalidateQueries({ queryKey: ['listing', listingId] }), client.invalidateQueries({ queryKey: ['listings'] })]); }, onError: (error) => Alert.alert('Erro', getErrorMessage(error)) });
  if (listing.isLoading) return <Screen><Loading /></Screen>;
  if (!listing.data) return <Screen><EmptyState title="Anúncio indisponível" description="Ele pode ter sido removido." /></Screen>;
  const item = listing.data;
  const own = item.seller_id === userId;
  const priceLabel = item.listing_type === 'venda' && item.price !== null ? item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : item.listing_type === 'troca' ? 'Troca' : 'Doação';
  async function checkout() {
    if (item.listing_type !== 'venda' || item.price === null) return router.push(`/chat/${item.seller_id}`);
    try { const url = await createPaymentCheckout({ kind: 'purchase', amount: item.price, listingId, purpose: `Compra: ${item.title}` }); await Linking.openURL(url); } catch (error) { Alert.alert('Pagamento indisponível', getErrorMessage(error)); }
  }
  return (
    <Screen scroll>
      <Header title="Anúncio" right={<Pressable onPress={() => router.back()}><Text style={styles.link}>Voltar</Text></Pressable>} />
      {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.image} /> : <View style={[styles.image, styles.placeholder]}><Ionicons name="image-outline" size={54} color={colors.muted} /></View>}
      <Card><Badge>{item.listing_type === 'doacao' ? 'Doação' : item.listing_type}</Badge><Text style={styles.title}>{item.title}</Text><Text style={styles.price}>{priceLabel}</Text><Text style={typography.body}>{item.description || 'Sem descrição.'}</Text><Text style={typography.muted}>{item.location}{item.category ? ` · ${item.category}` : ''}</Text></Card>
      <Card><View style={styles.seller}><Avatar uri={item.seller.avatar_url} name={item.seller.name} /><View><Text style={styles.name}>{item.seller.name}</Text><Text style={typography.muted}>@{item.seller.handle}</Text></View></View>{!own ? <><Button onPress={() => router.push(`/chat/${item.seller_id}`)}>Conversar com anunciante</Button><Button variant="secondary" onPress={() => void checkout()}>{item.listing_type === 'venda' ? 'Comprar com Mercado Pago' : 'Tenho interesse'}</Button></> : <><Button variant="secondary" loading={status.isPending} onPress={() => status.mutate(item.status === 'sold' ? 'active' : 'sold')}>{item.status === 'sold' ? 'Reativar anúncio' : 'Marcar como vendido'}</Button><Button variant="danger" loading={status.isPending} onPress={() => status.mutate('closed')}>Encerrar anúncio</Button></>}</Card>
    </Screen>
  );
}
const styles = StyleSheet.create({ link: { color: colors.primary, fontWeight: '800' }, image: { width: '100%', height: 300, borderRadius: 18, backgroundColor: colors.surfaceAlt }, placeholder: { alignItems: 'center', justifyContent: 'center' }, title: { color: colors.text, fontSize: 25, fontWeight: '900' }, price: { color: colors.primary, fontSize: 22, fontWeight: '900' }, seller: { flexDirection: 'row', gap: 11, alignItems: 'center' }, name: { color: colors.text, fontWeight: '800' } });
