import { useState } from 'react';
import { Alert, Linking, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Screen, colors, typography } from '@/components/ui';
import { createCallRoom, getErrorMessage } from '@/services/app';

export default function CallScreen() {
  const { recipientId, mode: rawMode } = useLocalSearchParams<{ recipientId: string; mode?: string }>(); const mode = rawMode === 'audio' ? 'audio' : 'video'; const [loading, setLoading] = useState(false);
  async function start() { setLoading(true); try { const url = await createCallRoom(recipientId, mode); await Linking.openURL(url); } catch (error) { Alert.alert('Chamada indisponível', getErrorMessage(error)); } finally { setLoading(false); } }
  return <Screen scroll><Text style={styles.title}>Chamada de {mode === 'video' ? 'vídeo' : 'áudio'}</Text><Text style={typography.muted}>A sala será criada pelo Daily e aberta com segurança no navegador do celular.</Text><Card><Text style={styles.body}>Ao iniciar, a outra pessoa receberá uma notificação com o convite da chamada.</Text><Button loading={loading} onPress={() => void start()}>Criar sala e entrar</Button><Button variant="ghost" onPress={() => router.back()}>Cancelar</Button></Card><Text style={typography.muted}>Requer a Edge Function create-call-room e a variável DAILY_API_KEY configurada no Supabase.</Text></Screen>;
}
const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 20 }, body: { color: colors.text, lineHeight: 22 } });
