import { useState } from 'react';
import { Alert, Image, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input, Screen, colors } from '@/components/ui';
import { getErrorMessage, pickMedia, updateProfile, uploadMedia } from '@/services/app';
import { useAuthStore } from '@/stores/auth';

export default function EditProfileScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const profile = useAuthStore((state) => state.profile);
  const setProfile = useAuthStore((state) => state.setProfile);
  const client = useQueryClient();
  const [name, setName] = useState(profile?.name ?? ''); const [handle, setHandle] = useState(profile?.handle ?? ''); const [bio, setBio] = useState(profile?.bio ?? '');
  const [avatar, setAvatar] = useState<{ uri: string; mimeType?: string | null } | null>(null); const [loading, setLoading] = useState(false);
  async function choose() { try { const selected = await pickMedia('image'); if (selected) setAvatar({ uri: selected.uri, mimeType: selected.mimeType }); } catch (error) { Alert.alert('Galeria', getErrorMessage(error)); } }
  async function submit() { if (!userId) return; setLoading(true); try { const avatarUrl = avatar ? await uploadMedia(userId, avatar.uri, avatar.mimeType) : profile?.avatar_url; const updated = await updateProfile(userId, { name, handle, bio, avatar_url: avatarUrl }); setProfile(updated); await client.invalidateQueries(); router.back(); } catch (error) { Alert.alert('Não foi possível salvar', getErrorMessage(error)); } finally { setLoading(false); } }
  return <Screen scroll><Text style={styles.title}>Editar perfil</Text><Card>{avatar || profile?.avatar_url ? <Image source={{ uri: avatar?.uri ?? profile?.avatar_url ?? '' }} style={styles.avatar} /> : null}<Button variant="secondary" onPress={() => void choose()}>Escolher avatar</Button><Input label="Nome" value={name} onChangeText={setName} maxLength={80} /><Input label="@usuário" value={handle} onChangeText={setHandle} autoCapitalize="none" /><Input label="Bio" value={bio} onChangeText={setBio} multiline maxLength={500} /><Button loading={loading} onPress={() => void submit()}>Salvar alterações</Button><Button variant="ghost" onPress={() => router.back()}>Cancelar</Button></Card></Screen>;
}
const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 20 }, avatar: { width: 110, height: 110, borderRadius: 55, alignSelf: 'center', backgroundColor: colors.surfaceAlt } });
