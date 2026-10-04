import type { PropsWithChildren } from 'react';
import { Redirect } from 'expo-router';
import { Loading, Screen } from '@/components/ui';
import { useAuthStore } from '@/stores/auth';

export function ProtectedRoute({ children }: PropsWithChildren) {
  const initialized = useAuthStore((state) => state.initialized);
  const session = useAuthStore((state) => state.session);
  if (!initialized) return <Screen><Loading label="Verificando sua conta..." /></Screen>;
  if (!session) return <Redirect href="/(auth)/login" />;
  return children;
}
