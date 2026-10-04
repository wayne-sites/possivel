import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState, Header, Input, Loading, Screen, colors, typography } from '@/components/ui';
import { fetchFeed, fetchListings, searchProfiles } from '@/services/app';
import { useAuthStore } from '@/stores/auth';
import { useState } from 'react';

export default function SearchTab() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const [search, setSearch] = useState('');
  const term = search.trim();

  const results = useQuery({
    queryKey: ['global-search', userId, term],
    enabled: Boolean(userId && term.length >= 2),
    queryFn: async () => {
      const [posts, people, listings] = await Promise.all([
        fetchFeed(userId, term),
        searchProfiles(userId!, term),
        fetchListings(term),
      ]);
      return {
        posts: posts.slice(0, 12),
        people: people.slice(0, 12),
        listings: listings.slice(0, 12),
      };
    },
  });

  const total = (results.data?.posts.length ?? 0) + (results.data?.people.length ?? 0) + (results.data?.listings.length ?? 0);

  return (
    <Screen scroll>
      <Header title="Buscar" subtitle="Publicações, pessoas e anúncios" />
      <Input value={search} onChangeText={setSearch} placeholder="O que você procura?" autoCapitalize="none" />

      {term.length < 2 ? (
        <EmptyState title="Comece a buscar" description="Digite pelo menos 2 caracteres." />
      ) : results.isLoading ? (
        <Loading label="Buscando no Possível..." />
      ) : results.isError ? (
        <EmptyState title="Busca indisponível" description="Não foi possível concluir a busca agora." />
      ) : total === 0 ? (
        <EmptyState title="Nada encontrado" description="Tente outro termo de busca." />
      ) : (
        <>
          {(results.data?.people.length ?? 0) > 0 ? (
            <View style={styles.group}>
              <Text style={styles.heading}>Pessoas</Text>
              {results.data!.people.map(({ profile }) => (
                <Card key={profile.id}>
                  <Text style={styles.title}>{profile.name}</Text>
                  <Text style={styles.handle}>@{profile.handle}</Text>
                  {profile.bio ? <Text style={typography.muted}>{profile.bio}</Text> : null}
                </Card>
              ))}
            </View>
          ) : null}

          {(results.data?.posts.length ?? 0) > 0 ? (
            <View style={styles.group}>
              <Text style={styles.heading}>Publicações</Text>
              {results.data!.posts.map((post) => (
                <Pressable key={post.id} onPress={() => router.push(`/post/${post.id}`)}>
                  <Card>
                    <Text style={styles.title}>{post.author?.name ?? 'Pessoa'}</Text>
                    <Text style={styles.handle}>@{post.author?.handle ?? 'possivel'}</Text>
                    <Text style={styles.body}>{post.body}</Text>
                  </Card>
                </Pressable>
              ))}
            </View>
          ) : null}

          {(results.data?.listings.length ?? 0) > 0 ? (
            <View style={styles.group}>
              <Text style={styles.heading}>Mercado</Text>
              {results.data!.listings.map((listing) => (
                <Pressable key={listing.id} onPress={() => router.push(`/listing/${listing.id}`)}>
                  <Card>
                    <Text style={styles.title}>{listing.title}</Text>
                    <Text style={typography.muted}>{listing.location}</Text>
                    {listing.price !== null ? <Text style={styles.price}>R$ {Number(listing.price).toFixed(2).replace('.', ',')}</Text> : null}
                  </Card>
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: 10 },
  heading: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 8 },
  title: { color: colors.text, fontWeight: '900', fontSize: 17 },
  handle: { color: colors.primaryDark, fontWeight: '700' },
  body: { color: colors.text, lineHeight: 21 },
  price: { color: colors.primaryDark, fontWeight: '900', fontSize: 17 },
});
