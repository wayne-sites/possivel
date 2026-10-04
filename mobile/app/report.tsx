import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Input, Screen, colors, typography } from '@/components/ui';
import { createReport, getErrorMessage } from '@/services/app';
import { useAuthStore } from '@/stores/auth';

const reasons = [{ key: 'spam', label: 'Spam' }, { key: 'harassment', label: 'Assédio' }, { key: 'violence', label: 'Violência' }, { key: 'illegal', label: 'Conteúdo ilegal' }, { key: 'other', label: 'Outro' }] as const;
export default function ReportScreen() {
  const { postId } = useLocalSearchParams<{ postId?: string }>(); const userId = useAuthStore((state) => state.session?.user.id); const [reason, setReason] = useState<(typeof reasons)[number]['key']>('spam'); const [details, setDetails] = useState(''); const [loading, setLoading] = useState(false);
  async function submit() { if (!userId) return; setLoading(true); try { await createReport(userId, { postId: postId ? Number(postId) : undefined, reason, details }); Alert.alert('Denúncia enviada', 'Obrigado por ajudar a manter a comunidade segura.', [{ text: 'OK', onPress: () => router.back() }]); } catch (error) { Alert.alert('Erro', getErrorMessage(error)); } finally { setLoading(false); } }
  return <Screen scroll><Text style={styles.title}>Denunciar</Text><Text style={typography.muted}>A denúncia fica vinculada à sua conta e será revisada.</Text><Card><View style={styles.reasons}>{reasons.map((item) => <Pressable key={item.key} onPress={() => setReason(item.key)} style={[styles.reason, reason === item.key && styles.reasonActive]}><Text style={[styles.reasonText, reason === item.key && styles.reasonTextActive]}>{item.label}</Text></Pressable>)}</View><Input label="Detalhes" value={details} onChangeText={setDetails} multiline maxLength={2000} placeholder="Explique o que aconteceu" /><Button loading={loading} onPress={() => void submit()}>Enviar denúncia</Button><Button variant="ghost" onPress={() => router.back()}>Cancelar</Button></Card></Screen>;
}
const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 20 }, reasons: { gap: 8 }, reason: { padding: 12, borderRadius: 12, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }, reasonActive: { borderColor: colors.primary }, reasonText: { color: colors.muted, fontWeight: '700' }, reasonTextActive: { color: colors.primary } });
