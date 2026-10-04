import { Redirect } from 'expo-router';
import { Loading, Screen } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';

export default function Index() {
  const initialized = useAuthStore((state) => state.initialized);
  const session = useAuthStore((state) => state.session);
  if (!initialized) return <Screen><Loading label="Preparando o Possível..." /></Screen>;
  return <Redirect href={session ? '/(tabs)' : '/(auth)/login'} />;
}
