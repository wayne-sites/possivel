import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Input, Screen, colors } from '@/components/ui';
import { getErrorMessage, updatePassword } from '@/services/app';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (password !== confirm) return Alert.alert('Senhas diferentes', 'Digite a mesma senha nos dois campos.');
    setLoading(true);
    try {
      await updatePassword(password);
      Alert.alert('Senha atualizada', 'Sua nova senha já pode ser usada.', [{ text: 'OK', onPress: () => router.replace('/(tabs)') }]);
    } catch (error) {
      Alert.alert('Erro', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>Nova senha</Text>
      <Card>
        <Input label="Nova senha" value={password} onChangeText={setPassword} secureTextEntry placeholder="Mínimo de 8 caracteres" />
        <Input label="Confirmar senha" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Repita a nova senha" />
        <Button loading={loading} onPress={() => void submit()}>Salvar senha</Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 42 } });
