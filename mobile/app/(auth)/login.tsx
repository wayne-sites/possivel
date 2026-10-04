import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Input, Screen, colors, typography } from '@/components/ui';
import { getErrorMessage, signIn } from '@/services/app';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit() {
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Não foi possível entrar', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }
  return (
    <Screen scroll>
      <View style={styles.brand}>
        <Text style={styles.logo}>Possível</Text>
        <Text style={typography.muted}>Conecte pessoas, oportunidades e impacto real.</Text>
      </View>
      <Card>
        <Text style={typography.subtitle}>Entrar</Text>
        <Input label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="voce@email.com" />
        <Input label="Senha" value={password} onChangeText={setPassword} secureTextEntry placeholder="Sua senha" />
        <Button loading={loading} onPress={() => void submit()}>Entrar</Button>
        <Pressable onPress={() => router.push('/(auth)/forgot-password')}><Text style={styles.link}>Esqueci minha senha</Text></Pressable>
      </Card>
      <Pressable onPress={() => router.push('/(auth)/signup')}><Text style={styles.signup}>Ainda não tem conta? <Text style={styles.link}>Criar conta</Text></Text></Pressable>
    </Screen>
  );
}
const styles = StyleSheet.create({
  brand: { alignItems: 'center', marginTop: 56, marginBottom: 18, gap: 8 },
  logo: { color: colors.primary, fontSize: 42, fontWeight: '900', letterSpacing: -1.5 },
  link: { color: colors.primary, textAlign: 'center', fontWeight: '800', paddingVertical: 6 },
  signup: { color: colors.muted, textAlign: 'center' },
});
