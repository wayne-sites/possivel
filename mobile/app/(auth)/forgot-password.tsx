import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Input, Screen, colors, typography } from '@/components/ui';
import { getErrorMessage, requestPasswordReset } from '@/services/app';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit() {
    setLoading(true);
    try {
      await requestPasswordReset(email);
      Alert.alert('E-mail enviado', 'Abra o link recebido para redefinir sua senha.');
    } catch (error) {
      Alert.alert('Erro', getErrorMessage(error));
    } finally { setLoading(false); }
  }
  return <Screen scroll><Text style={styles.title}>Recuperar senha</Text><Text style={typography.muted}>Enviaremos um link para o seu e-mail.</Text><Card><Input label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" /><Button loading={loading} onPress={() => void submit()}>Enviar link</Button><Button variant="ghost" onPress={() => router.back()}>Voltar</Button></Card></Screen>;
}
const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 42 } });
