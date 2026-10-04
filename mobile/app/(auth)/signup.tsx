import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Input, Screen, colors, typography } from '@/components/ui';
import { getErrorMessage, signUp } from '@/services/app';

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    try {
      await signUp({ name, handle, email, password });
      Alert.alert('Conta criada', 'Confirme seu e-mail caso o Supabase solicite e depois entre no aplicativo.', [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]);
    } catch (error) {
      Alert.alert('Não foi possível criar a conta', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>Criar conta</Text>
      <Text style={typography.muted}>A mesma conta funciona no site e no aplicativo.</Text>
      <Card>
        <Input label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" />
        <Input label="@usuário" value={handle} onChangeText={setHandle} autoCapitalize="none" placeholder="seu_usuario" />
        <Input label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="voce@email.com" />
        <Input label="Senha" value={password} onChangeText={setPassword} secureTextEntry placeholder="Mínimo de 8 caracteres" />
        <Button loading={loading} onPress={() => void submit()}>Criar conta</Button>
      </Card>
      <Pressable onPress={() => router.back()}><Text style={styles.link}>Voltar para entrar</Text></Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 42 },
  link: { color: colors.primaryDark, textAlign: 'center', fontWeight: '800' },
});
