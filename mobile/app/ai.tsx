import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { Badge, Button, Card, Header, Input, Screen, colors, typography } from '@/components/ui';
import { askPossivelAI, getErrorMessage, type PossivelAIMode } from '@/services/app';

const modes: { key: PossivelAIMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'path', label: 'Mapa', icon: 'map-outline' },
  { key: 'post', label: 'Post', icon: 'create-outline' },
  { key: 'listing', label: 'Anúncio', icon: 'storefront-outline' },
  { key: 'cause', label: 'Causa', icon: 'heart-outline' },
  { key: 'safety', label: 'Segurança', icon: 'shield-checkmark-outline' },
];

const suggestions: { label: string; mode: PossivelAIMode; prompt: string }[] = [
  { label: 'Transformar uma ideia em plano', mode: 'path', prompt: 'Quero transformar esta ideia em algo real: ' },
  { label: 'Melhorar uma publicação', mode: 'post', prompt: 'Quero publicar sobre isto de forma clara e humana: ' },
  { label: 'Criar anúncio confiável', mode: 'listing', prompt: 'Quero anunciar este item com transparência: ' },
  { label: 'Revisar um possível risco', mode: 'safety', prompt: 'Revise a segurança desta situação e diga quais sinais de risco observar: ' },
];

export default function PossivelAIScreen() {
  const [mode, setMode] = useState<PossivelAIMode>('path');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<Awaited<ReturnType<typeof askPossivelAI>> | null>(null);

  const ask = useMutation({
    mutationFn: () => askPossivelAI(message, mode),
    onSuccess: setResult,
    onError: (error) => Alert.alert('Possível IA', getErrorMessage(error)),
  });

  return (
    <Screen scroll>
      <Header title="Possível IA" subtitle="Da ideia ao próximo passo" right={<Badge>BETA</Badge>} />

      <Card style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="sparkles" size={26} color={colors.primaryDark} />
        </View>
        <Text style={styles.heroTitle}>Mapa do Possível</Text>
        <Text style={typography.muted}>
          Um copiloto para transformar objetivos em próximos passos, melhorar conteúdo, estruturar causas e revisar riscos.
        </Text>
      </Card>

      <View style={styles.modeRow}>
        {modes.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => setMode(item.key)}
            style={[styles.modeChip, mode === item.key && styles.modeChipActive]}
          >
            <Ionicons name={item.icon} size={16} color={mode === item.key ? '#FFFFFF' : colors.text} />
            <Text style={[styles.modeText, mode === item.key && styles.modeTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.suggestions}>
        {suggestions.map((item) => (
          <Pressable
            key={item.label}
            style={styles.suggestion}
            onPress={() => {
              setMode(item.mode);
              setMessage(item.prompt);
            }}
          >
            <Text style={styles.suggestionText}>✦ {item.label}</Text>
          </Pressable>
        ))}
      </View>

      <Input
        label="O que você quer tornar possível?"
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={2000}
        placeholder="Ex.: tenho uma ideia, mas não sei qual deve ser meu primeiro passo."
      />

      <Card style={styles.security}>
        <Ionicons name="shield-checkmark-outline" size={20} color={colors.primaryDark} />
        <Text style={styles.securityText}>
          Não envie senhas, tokens, códigos de recuperação, chaves privadas ou documentos sensíveis.
        </Text>
      </Card>

      <Button loading={ask.isPending} onPress={() => ask.mutate()}>
        Transformar com IA
      </Button>

      {result ? (
        <Card style={styles.result}>
          <View style={styles.resultHead}>
            <Text style={styles.resultTitle}>Seu caminho</Text>
            <Badge>{result.source === 'provider' ? 'AVANÇADO' : 'LOCAL'}</Badge>
          </View>
          <Text style={styles.resultText}>{result.answer}</Text>
          <Text style={typography.muted}>{result.remaining} usos restantes hoje · plano {result.plan.toUpperCase()}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: '#F4EFFF', borderColor: '#DDD2F7' },
  heroIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { color: colors.text, fontSize: 24, fontWeight: '900' },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modeChip: { minHeight: 38, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  modeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeText: { color: colors.text, fontWeight: '800', fontSize: 12 },
  modeTextActive: { color: '#FFFFFF' },
  suggestions: { gap: 8 },
  suggestion: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.mint },
  suggestionText: { color: colors.text, fontWeight: '800' },
  security: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.surfaceAlt },
  securityText: { color: colors.muted, flex: 1, lineHeight: 19, fontSize: 12 },
  result: { borderColor: '#D4C5F4', backgroundColor: '#FFFDFC' },
  resultHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultTitle: { color: colors.text, fontSize: 20, fontWeight: '900', flex: 1 },
  resultText: { color: colors.text, lineHeight: 23, fontSize: 15 },
});
