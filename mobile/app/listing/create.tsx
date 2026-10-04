import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input, Screen, colors, typography } from '@/components/ui';
import { createListing, getErrorMessage, pickMedia, uploadMedia } from '@/services/app';
import { useAuthStore } from '@/stores/auth';
import type { Listing } from '@/types/database';

const types: Listing['listing_type'][] = ['venda', 'troca', 'doacao'];
export default function CreateListingScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const client = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Listing['listing_type']>('venda');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState<{ uri: string; mimeType?: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  async function choose() { try { const selected = await pickMedia('image'); if (selected) setImage({ uri: selected.uri, mimeType: selected.mimeType }); } catch (error) { Alert.alert('Galeria', getErrorMessage(error)); } }
  async function submit() {
    if (!userId) return;
    const numericPrice = type === 'venda' ? Number(price.replace(',', '.')) : null;
    if (type === 'venda' && (!Number.isFinite(numericPrice) || numericPrice! < 0)) return Alert.alert('Preço inválido', 'Informe um preço válido.');
    setLoading(true);
    try {
      const imageUrl = image ? await uploadMedia(userId, image.uri, image.mimeType) : null;
      const id = await createListing(userId, { title, description, listing_type: type, price: numericPrice, location, image_url: imageUrl, category: category.trim() || null });
      await client.invalidateQueries({ queryKey: ['listings'] });
      router.replace(`/listing/${id}`);
    } catch (error) { Alert.alert('Não foi possível criar o anúncio', getErrorMessage(error)); } finally { setLoading(false); }
  }
  return (
    <Screen scroll>
      <Text style={styles.title}>Novo anúncio</Text><Text style={typography.muted}>Os limites Free/Pro são validados pelo banco.</Text>
      <Card>
        <Input label="Título" value={title} onChangeText={setTitle} maxLength={100} />
        <Input label="Descrição" value={description} onChangeText={setDescription} multiline maxLength={2000} />
        <Text style={styles.label}>Tipo</Text><View style={styles.types}>{types.map((item) => <Pressable key={item} onPress={() => setType(item)} style={[styles.type, type === item && styles.typeActive]}><Text style={[styles.typeText, type === item && styles.typeTextActive]}>{item === 'doacao' ? 'Doação' : item[0]?.toUpperCase() + item.slice(1)}</Text></Pressable>)}</View>
        {type === 'venda' ? <Input label="Preço (R$)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" /> : null}
        <Input label="Localização" value={location} onChangeText={setLocation} maxLength={120} placeholder="Cidade/UF ou bairro" />
        <Input label="Categoria" value={category} onChangeText={setCategory} placeholder="Eletrônicos, serviços, roupas..." />
        {image ? <Image source={{ uri: image.uri }} style={styles.preview} /> : null}
        <Button variant="secondary" onPress={() => void choose()}>{image ? 'Trocar foto' : 'Adicionar foto'}</Button>
        <Button loading={loading} onPress={() => void submit()}>Publicar anúncio</Button>
        <Button variant="ghost" onPress={() => router.back()}>Cancelar</Button>
      </Card>
    </Screen>
  );
}
const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 20 }, label: { color: colors.text, fontWeight: '700', fontSize: 13 }, types: { flexDirection: 'row', gap: 8 }, type: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }, typeActive: { backgroundColor: colors.primary }, typeText: { color: colors.muted, fontWeight: '800', fontSize: 12 }, typeTextActive: { color: '#06120e' }, preview: { width: '100%', height: 230, borderRadius: 14 } });
