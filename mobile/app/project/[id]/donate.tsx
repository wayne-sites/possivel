import { useState } from 'react';
import { Alert, Linking, StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Input, Loading, Screen, colors, typography } from '@/components/ui';
import { createPaymentCheckout, fetchCause, getErrorMessage } from '@/services/app';

export default function DonateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const causeId = Number(id); const [amount, setAmount] = useState(''); const [loading, setLoading] = useState(false);
  const cause = useQuery({ queryKey: ['cause', causeId], queryFn: () => fetchCause(causeId), enabled: Number.isFinite(causeId) });
  async function submit() { const value = Number(amount.replace(',', '.')); if (!Number.isFinite(value) || value < 1) return Alert.alert('Valor inválido', 'O apoio mínimo é R$ 1,00.'); setLoading(true); try { const url = await createPaymentCheckout({ kind: 'donation', amount: value, causeId, purpose: `Apoio: ${cause.data?.title ?? 'Causa'}` }); await Linking.openURL(url); } catch (error) { Alert.alert('Pagamento indisponível', getErrorMessage(error)); } finally { setLoading(false); } }
  if (cause.isLoading) return <Screen><Loading /></Screen>;
  return <Screen scroll><Text style={styles.title}>Apoiar causa</Text><Text style={typography.muted}>{cause.data?.title}</Text><Card><Input label="Valor (R$)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="10,00" /><Button loading={loading} onPress={() => void submit()}>Continuar no Mercado Pago</Button><Button variant="ghost" onPress={() => router.back()}>Cancelar</Button></Card></Screen>;
}
const styles = StyleSheet.create({ title: { color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 20 } });
