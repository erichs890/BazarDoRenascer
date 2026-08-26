import React from 'react';
import { View, Text, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { Screen, Card, Muted, Button, Row, Empty, IconButton, Price, Divider, FadeIn, Label } from '../../components/ui';
import { colors, fonts, spacing } from '../../theme';

export default function CartScreen({ navigation }) {
  const { user, products, cart, toggleCart } = useApp();
  const items = products.filter((p) => cart.includes(p.id) && p.status === 'available');
  const total = items.reduce((a, p) => a + p.price, 0);

  const proceed = () => {
    if (!user.address) {
      Alert.alert('Endereço necessário', 'Para entregarmos suas peças, cadastre um endereço de entrega.', [
        { text: 'Agora não', style: 'cancel' },
        { text: 'Cadastrar endereço', onPress: () => navigation.navigate('Address', { next: 'Checkout' }) },
      ]);
      return;
    }
    navigation.navigate('Checkout');
  };

  if (!items.length)
    return (
      <Screen atmosphere style={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="cart-outline" size={44} color={colors.primaryDark} />
        </View>
        <Empty text="Seu carrinho está vazio." />
        <Muted style={{ textAlign: 'center', fontSize: 13 }}>Cada peça comprada vira ajuda para alguém.</Muted>
        <Button title="Ver vitrine" variant="outline" onPress={() => navigation.navigate('Loja')} style={{ marginTop: spacing.md, paddingHorizontal: 32 }} />
      </Screen>
    );

  return (
    <Screen>
      <Label>{items.length} item(ns)</Label>
      {items.map((p, i) => (
        <FadeIn key={p.id} index={i}>
          <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image source={{ uri: p.image }} accessibilityLabel={p.name} style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: colors.border }} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ fontFamily: fonts.bold, color: colors.text, fontSize: 15 }} numberOfLines={1}>{p.name}</Text>
              <Muted style={{ fontSize: 12 }}>Tam. {p.size} · {p.condition}</Muted>
              <Price value={p.price} size={15} style={{ marginTop: 4 }} />
            </View>
            <IconButton label={`Remover ${p.name} do carrinho`} onPress={() => toggleCart(p.id)}>
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </IconButton>
          </Card>
        </FadeIn>
      ))}
      <FadeIn index={items.length}>
        <Card>
          <Row label="Subtotal" value={<Price value={total} size={14} />} />
          <Row label="Entrega" value="Grátis" />
          <Divider />
          <Row label="Total" value={<Price value={total} size={20} />} bold />
          <Button title="Finalizar compra" icon={<Ionicons name="arrow-forward" size={20} color={colors.onPrimary} />} onPress={proceed} />
        </Card>
      </FadeIn>
    </Screen>
  );
}
