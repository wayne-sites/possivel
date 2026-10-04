import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Card, Header, Loading, Screen, colors, typography } from '@/components/ui';
import { cancelSubscription, getErrorMessage, getPlan, startProCheckout } from '@/services/app';
import { useAuthStore } from '@/stores/auth';

const free = [
  '5 anúncios ativos',
  '1 GB de mídia social',
  'Mensagens e conexões',
  '5 usos da Possível IA por dia',
  'Feed, mercado e causas',
];

const pro = [
  '50 anúncios ativos',
  '10 GB de mídia social',
  '100 usos da Possível IA por dia',
  'Possível Play: filmes e séries autorizados',
  'Leitura de livros virtuais',
  'Músicas e áudios na Biblioteca Pro',
  '2 GB de nuvem pessoal privada para conteúdo próprio/licenciado',
  'Acesso em seus dispositivos com links temporários protegidos',
  'Estatísticas avançadas',
  'Selo PRO e recursos exclusivos',
];

export default function PlansScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const client = useQueryClient();
  const plan = useQuery({ queryKey: ['plan', userId], queryFn: () => getPlan(userId!), enabled: Boolean(userId) });
  const checkout = useMutation({ mutationFn: startProCheckout, onSuccess: (url) => Linking.openURL(url), onError: (error) => Alert.alert('Checkout indisponível', getErrorMessage(error)) });
  const cancel = useMutation({ mutationFn: cancelSubscription, onSuccess: async () => { await client.invalidateQueries({ queryKey: ['plan'] }); Alert.alert('Solicitação enviada', 'O cancelamento foi registrado.'); }, onError: (error) => Alert.alert('Erro', getErrorMessage(error)) });

  if (plan.isLoading) return <Screen><Loading /></Screen>;
  const current = plan.data?.plan ?? 'free';

  return (
    <Screen scroll>
      <Header title="Planos" subtitle="Escolha os recursos ideais para você" />
      <PlanCard name="Free" price="R$ 0" active={current === 'free'} items={free} />
      <PlanCard name="Possível Pro" price="R$ 15,99/mês" active={current === 'pro'} items={pro} pro />
      {current === 'free' ? (
        <Button loading={checkout.isPending} onPress={() => checkout.mutate()}>Assinar Possível Pro · R$ 15,99/mês</Button>
      ) : (
        <>
          <Badge>Seu plano atual é PRO</Badge>
          <Button variant="danger" loading={cancel.isPending} onPress={() => Alert.alert('Cancelar assinatura', 'Você manterá os benefícios até o fim do período já pago.', [{ text: 'Voltar', style: 'cancel' }, { text: 'Cancelar plano', style: 'destructive', onPress: () => cancel.mutate() }])}>Cancelar assinatura</Button>
        </>
      )}
      <Text style={typography.muted}>Filmes, séries, livros e músicas comerciais só podem ser oferecidos pelo Possível quando houver autorização, licença ou conteúdo em domínio público. Arquivos pessoais na nuvem devem ser seus ou estar legalmente autorizados.</Text>
      <Text style={typography.muted}>A assinatura é processada no servidor pelo Mercado Pago. Nunca envie dados de pagamento por mensagem ou pela Possível IA.</Text>
    </Screen>
  );
}

function PlanCard({ name, price, active, items, pro }: { name: string; price: string; active: boolean; items: string[]; pro?: boolean }) {
  return (
    <Card style={[pro ? styles.pro : undefined, active ? styles.active : undefined]}>
      <View style={styles.row}>
        <Text style={styles.name}>{name}</Text>
        {active ? <Badge>ATUAL</Badge> : null}
        {pro ? <Badge>PRO</Badge> : null}
      </View>
      <Text style={styles.price}>{price}</Text>
      {items.map((item) => <Text key={item} style={styles.item}>✓ {item}</Text>)}
    </Card>
  );
}

const styles = StyleSheet.create({
  active: { borderColor: colors.primary },
  pro: { backgroundColor: '#F7F2FF', borderColor: '#DDD2F7' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: colors.text, fontSize: 22, fontWeight: '900', flex: 1 },
  price: { color: colors.primaryDark, fontSize: 25, fontWeight: '900' },
  item: { color: colors.text, lineHeight: 23 },
});
