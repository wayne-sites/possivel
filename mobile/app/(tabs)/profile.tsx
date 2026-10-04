import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Badge, Button, Card, Header, Loading, Screen, colors, typography } from '@/components/ui';
import { fetchCauses, fetchFeed, fetchListings, getErrorMessage, getPlan, signOut } from '@/services/app';
import { useAuthStore } from '@/stores/auth';

export default function ProfileScreen() {
  const session = useAuthStore((state) => state.session);
  const profile = useAuthStore((state) => state.profile);
  const userId = session?.user.id;
  const plan = useQuery({ queryKey: ['plan', userId], queryFn: () => getPlan(userId!), enabled: Boolean(userId) });
  const posts = useQuery({ queryKey: ['profile-posts', userId], queryFn: async () => (await fetchFeed(userId)).filter((post) => post.author_id === userId), enabled: Boolean(userId) });
  const listings = useQuery({ queryKey: ['profile-listings', userId], queryFn: async () => (await fetchListings()).filter((item) => item.seller_id === userId), enabled: Boolean(userId) });
  const causes = useQuery({ queryKey: ['profile-causes', userId], queryFn: async () => (await fetchCauses()).filter((item) => item.creator_id === userId), enabled: Boolean(userId) });
  if (!userId || !profile) return <Screen><Loading label="Carregando perfil..." /></Screen>;

  async function logout() {
    try { await signOut(); router.replace('/(auth)/login'); } catch (error) { Alert.alert('Erro', getErrorMessage(error)); }
  }

  return (
    <Screen scroll>
      <Header title="Perfil" subtitle={session.user.email ?? undefined} right={<Pressable style={styles.icon} onPress={() => router.push('/settings')}><Ionicons name="settings-outline" size={22} color={colors.text} /></Pressable>} />
      <Card style={styles.profileCard}>
        <Avatar uri={profile.avatar_url} name={profile.name} size={86} />
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={typography.muted}>@{profile.handle}</Text>
        {plan.data?.plan === 'pro' ? <Badge>PRO</Badge> : <Badge>FREE</Badge>}
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : <Text style={typography.muted}>Adicione uma bio para apresentar seu perfil.</Text>}
        <Button style={styles.full} onPress={() => router.push('/edit-profile')}>Editar perfil</Button>
      </Card>

      <View style={styles.stats}>
        <Card style={styles.stat}><Text style={styles.statNumber}>{posts.data?.length ?? 0}</Text><Text style={typography.muted}>Publicações</Text></Card>
        <Card style={styles.stat}><Text style={styles.statNumber}>{listings.data?.length ?? 0}</Text><Text style={typography.muted}>Anúncios</Text></Card>
        <Card style={styles.stat}><Text style={styles.statNumber}>{causes.data?.length ?? 0}</Text><Text style={typography.muted}>Causas</Text></Card>
      </View>

      <Card>
        <Pressable style={styles.menu} onPress={() => router.push('/connections')}><Ionicons name="people-outline" color={colors.primary} size={22} /><Text style={styles.menuText}>Conexões</Text><Ionicons name="chevron-forward" color={colors.muted} size={20} /></Pressable>
        <Pressable style={styles.menu} onPress={() => router.push('/marketplace')}><Ionicons name="storefront-outline" color={colors.primary} size={22} /><Text style={styles.menuText}>Mercado</Text><Ionicons name="chevron-forward" color={colors.muted} size={20} /></Pressable>
        <Pressable style={styles.menu} onPress={() => router.push('/projects')}><Ionicons name="heart-circle-outline" color={colors.primary} size={22} /><Text style={styles.menuText}>Causas</Text><Ionicons name="chevron-forward" color={colors.muted} size={20} /></Pressable>
        <Pressable style={styles.menu} onPress={() => router.push('/pro-library')}><Ionicons name="play-circle-outline" color={colors.primary} size={22} /><Text style={styles.menuText}>Possível Play e Biblioteca Pro</Text><Ionicons name="chevron-forward" color={colors.muted} size={20} /></Pressable>
        <Pressable style={styles.menu} onPress={() => router.push('/plans')}><Ionicons name="diamond-outline" color={colors.primary} size={22} /><Text style={styles.menuText}>Planos Free e Pro</Text><Ionicons name="chevron-forward" color={colors.muted} size={20} /></Pressable>
        <Pressable style={styles.menu} onPress={() => router.push('/notifications')}><Ionicons name="notifications-outline" color={colors.primary} size={22} /><Text style={styles.menuText}>Notificações</Text><Ionicons name="chevron-forward" color={colors.muted} size={20} /></Pressable>
        <Pressable style={styles.menu} onPress={() => router.push('/settings/legal')}><Ionicons name="document-text-outline" color={colors.primary} size={22} /><Text style={styles.menuText}>Termos e privacidade</Text><Ionicons name="chevron-forward" color={colors.muted} size={20} /></Pressable>
      </Card>
      <Button variant="danger" onPress={() => void logout()}>Sair da conta</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  profileCard: { alignItems: 'center' },
  name: { color: colors.text, fontSize: 23, fontWeight: '900' },
  bio: { color: colors.text, textAlign: 'center', lineHeight: 21 },
  full: { width: '100%' },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  statNumber: { color: colors.primary, fontSize: 22, fontWeight: '900' },
  menu: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  menuText: { color: colors.text, fontWeight: '700', flex: 1 },
});
