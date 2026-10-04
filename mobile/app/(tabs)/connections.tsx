import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Card, EmptyState, Header, Input, Loading, Screen, colors, typography } from '@/components/ui';
import { getErrorMessage, searchProfiles, toggleFollow } from '@/services/app';
import { useAuthStore } from '@/stores/auth';

export default function ConnectionsScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const [search, setSearch] = useState('');
  const client = useQueryClient();
  const profiles = useQuery({ queryKey: ['profiles', userId, search], queryFn: () => searchProfiles(userId!, search), enabled: Boolean(userId) });
  const follow = useMutation({ mutationFn: (targetId: string) => toggleFollow(userId!, targetId), onSuccess: () => client.invalidateQueries({ queryKey: ['profiles'] }), onError: (error) => Alert.alert('Erro', getErrorMessage(error)) });
  if (!userId) return <Screen><Loading /></Screen>;
  return (
    <Screen>
      <Header title="Conexões" subtitle="Encontre pessoas e comece conversas" />
      <Input value={search} onChangeText={setSearch} placeholder="Buscar por nome ou @usuário" autoCapitalize="none" />
      {profiles.isLoading ? <Loading label="Buscando pessoas..." /> : (
        <FlatList
          data={profiles.data ?? []}
          keyExtractor={(item) => item.profile.id}
          contentContainerStyle={styles.list}
          refreshing={profiles.isRefetching}
          onRefresh={() => void profiles.refetch()}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.row}>
                <Avatar uri={item.profile.avatar_url} name={item.profile.name} size={52} />
                <View style={styles.info}>
                  <Text style={styles.name}>{item.profile.name}</Text>
                  <Text style={typography.muted}>@{item.profile.handle}</Text>
                  {item.profile.bio ? <Text numberOfLines={2} style={styles.bio}>{item.profile.bio}</Text> : null}
                </View>
              </View>
              <View style={styles.actions}>
                <Button style={styles.flexButton} variant={item.following ? 'secondary' : 'primary'} loading={follow.isPending} onPress={() => follow.mutate(item.profile.id)}>{item.following ? 'Seguindo' : 'Seguir'}</Button>
                <Pressable style={styles.messageButton} onPress={() => router.push(`/chat/${item.profile.id}`)}><Ionicons name="chatbubble-outline" size={21} color={colors.primary} /></Pressable>
              </View>
            </Card>
          )}
          ListEmptyComponent={<EmptyState title="Nenhuma pessoa encontrada" description="Tente outro nome ou @usuário." />}
        />
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  list: { paddingVertical: 12, gap: 12, paddingBottom: 110 },
  row: { flexDirection: 'row', gap: 12 },
  info: { flex: 1, gap: 2 },
  name: { color: colors.text, fontWeight: '800', fontSize: 16 },
  bio: { color: colors.muted, marginTop: 5, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 10 },
  flexButton: { flex: 1 },
  messageButton: { width: 48, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
});
