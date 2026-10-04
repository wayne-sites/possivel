import { useState } from 'react';
import { Alert, Image, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input, Screen, colors, typography } from '@/components/ui';
import { createCause, getErrorMessage, pickMedia, uploadMedia } from '@/services/app';
import { useAuthStore } from '@/stores/auth';

export default function CreateCauseScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const client = useQueryClient();
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [goal, setGoal] = useState('');
  const [image, setImage] = useState<{ uri: string; mimeType?: string | null } | null>(null); const [loading, setLoading] = useState(false);
  async function choose() { try { const selected = await pickMedia('image'); if (selected) setImage({ uri: selected.uri, mimeType: selected.mimeType }); } catch (error) { Alert.alert('Galeria', getErrorMessage(error)); } }
  async function submit() {
    if (!userId) return; const amount = Number(goal.replace(',', '.')); if (!Number.isFinite(amount) || amount < 1) return Alert.alert('Meta inválida', 'A meta deve ser maior que zero.');
    setLoading(true); try { const imageUrl = image ? await uploadMedia(userId, image.uri, image.mimeType) : null; const id = await createCause(userId, { title, description, goalAmount: amount, imageUrl }); await client.invalidateQueries({ queryKey: ['causes'] }); router.replace(`/project/${id}`); } catch (error) { Alert.alert('Não foi possível criar a causa', getErrorMessage(error)); } finally { setLoading(false); }
  }
  return <Screen scroll><Text style={styles.title}>Nova causa</Text><Text style={typography.muted}>Crie uma campanha verdadeira e explique como o recurso será usado.</Text><Card><Input label="Título" value={title} onChangeText={setTitle} maxLength={120} /><Input label="Descrição" value={description} onChangeText={setDescription} multiline maxLength={3000} /><Input label="Meta (R$)" value={goal} onChangeText={setGoal} keyboardType="decimal-pad" />{image ? <Image source={{ uri: image.uri }} style={styles.preview} /> : null}<Button variant="secondary" onPress={() => void choose()}>{image ? 'Trocar imagem' : 'Adicionar imagem'}</Button><Button loading={loading} onPress={() => void submit()}>Criar causa</Button><Button variant="ghost" onPress={() => router.back()}>Cancelar</Button></Card></Screen>;
}
const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 20 }, preview: { width: '100%', height: 230, borderRadius: 14 } });
