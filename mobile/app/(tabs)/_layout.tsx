import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/components/ui';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home-outline',
  search: 'search-outline',
  messages: 'chatbubbles-outline',
  books: 'book-outline',
  watch: 'film-outline',
  connections: 'people-outline',
  marketplace: 'storefront-outline',
  projects: 'heart-circle-outline',
  profile: 'person-circle-outline',
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 68, paddingBottom: 8, paddingTop: 7 },
        tabBarLabelStyle: { fontSize: 9, fontWeight: '800' },
        tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name] ?? 'ellipse-outline'} color={color} size={size} />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="search" options={{ title: 'Buscar' }} />
      <Tabs.Screen name="messages" options={{ title: 'Mensagens' }} />
      <Tabs.Screen name="books" options={{ title: 'Livros' }} />
      <Tabs.Screen name="watch" options={{ title: 'Filmes e séries' }} />
      <Tabs.Screen name="connections" options={{ href: null }} />
      <Tabs.Screen name="marketplace" options={{ href: null }} />
      <Tabs.Screen name="projects" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
