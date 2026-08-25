import React from 'react';
import { View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { Screen, Card, Title, Body, Muted, Button, Badge, Row, Price, Label } from '../../components/ui';
import { colors, spacing, radius } from '../../theme';

export default function ProductDetailScreen({ route, navigation }) {
  const { products, cart, toggleCart } = useApp();
  const p = products.find((x) => x.id === route.params.id);
  if (!p) return <Screen><Muted>Peça não encontrada.</Muted></Screen>;
  const inCart = cart.includes(p.id);
  const sold = p.status === 'sold';

  return (
    <Screen style={{ padding: 0 }}>
      <View style={{ margin: spacing.md, marginBottom: 0, borderRadius: radius.xl, overflow: 'hidden' }}>
        <Image source={{ uri: p.image }} accessibilityLabel={p.name} style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.border }} />
      </View>
      <View style={{ padding: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.sm }}>
          <Badge text={p.category} />
          <Badge text={p.condition} tone={p.condition === 'Novo' ? 'success' : 'primary'} />
          {sold && <Badge text="Vendido" tone="danger" />}
        </View>
        <Title>{p.name}</Title>
        <Price value={p.price} size={30} style={{ marginBottom: spacing.md }} />
        <Card>
          <Row label="Tamanho" value={p.size} />
          <Row label="Condição" value={p.condition} />
          <Row label="Categoria" value={p.category} />
        </Card>
        <Card>
          <Label>Descrição</Label>
          <Body>{p.description || 'Sem descrição.'}</Body>
        </Card>
        {sold ? (
          <Button title="Peça já vendida" disabled />
        ) : (
          <>
            <Button
              title={inCart ? 'Remover do carrinho' : 'Adicionar ao carrinho'}
              variant={inCart ? 'outline' : 'primary'}
              icon={<Ionicons name={inCart ? 'cart-outline' : 'cart'} size={20} color={inCart ? colors.primaryDeep : colors.onPrimary} />}
              onPress={() => toggleCart(p.id)}
            />
            {inCart && <Button title="Ir para o carrinho" variant="dark" onPress={() => navigation.navigate('UserTabs', { screen: 'Carrinho' })} />}
          </>
        )}
      </View>
    </Screen>
  );
}
