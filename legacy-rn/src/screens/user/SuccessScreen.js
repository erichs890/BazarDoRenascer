import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Title, Muted, Button, Row, Label, Divider, Price, FadeIn } from '../../components/ui';
import { colors, money, dateBR, spacing } from '../../theme';

export default function SuccessScreen({ route, navigation }) {
  const { kind, result, amount, payment } = route.params;
  const purchase = kind === 'purchase';
  const home = (screen) => navigation.reset({ index: 0, routes: [{ name: 'UserTabs', params: { screen } }] });
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => { Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 14 }).start(); }, []);

  return (
    <Screen atmosphere style={{ flexGrow: 1, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <Animated.View style={{ transform: [{ scale: pop }], width: 104, height: 104, borderRadius: 52, backgroundColor: colors.successLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
          <Ionicons name="checkmark" size={60} color={colors.success} />
        </Animated.View>
        <FadeIn index={2}>
          <Title style={{ textAlign: 'center' }}>{purchase ? 'Compra confirmada!' : 'Obrigado pela doação!'}</Title>
          <Muted style={{ textAlign: 'center' }}>
            {purchase ? 'Suas peças serão enviadas para o endereço cadastrado.' : 'Sua generosidade transforma vidas.'}
          </Muted>
        </FadeIn>
      </View>

      <FadeIn index={4}>
        <Card>
          <Label>Resumo da transação</Label>
          {purchase && result.items.map((p) => <Row key={p.id} label={p.name} value={money(p.price)} />)}
          <Row label="Forma de pagamento" value={payment} />
          <Row label="Data" value={dateBR(result.date)} />
          <Divider />
          <Row label="Total" value={<Price value={amount} size={20} />} bold />
        </Card>
        <Button title="Ver meu histórico" onPress={() => home('Perfil')} />
        <Button title="Voltar à vitrine" variant="outline" onPress={() => home('Loja')} />
      </FadeIn>
    </Screen>
  );
}
