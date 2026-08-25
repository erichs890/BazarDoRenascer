import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { PAYMENTS } from '../../mocks/data';
import { Screen, Card, Subtitle, Body, Muted, Button, Row, Price, Divider } from '../../components/ui';
import { colors, fonts, money, spacing, radius } from '../../theme';
import { formatAddress } from './AddressScreen';

export const PAY_ICON = { Pix: 'qr-code-outline', 'Cartão de crédito': 'card-outline', Boleto: 'barcode-outline' };
const PAY_HINT = { Pix: 'Aprovação imediata', 'Cartão de crédito': 'Até 3x sem juros', Boleto: 'Compensa em até 2 dias úteis' };

export function PaymentPicker({ value, onChange }) {
  return PAYMENTS.map((p) => {
    const active = p === value;
    return (
      <Pressable key={p} onPress={() => onChange(p)} accessibilityRole="radio" accessibilityState={{ checked: active }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primaryLight : colors.surface, marginBottom: 8, opacity: pressed ? 0.85 : 1 })}>
        <Ionicons name={PAY_ICON[p]} size={22} color={active ? colors.primaryDark : colors.muted} />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ fontFamily: fonts.semibold, color: colors.text }}>{p}</Text>
          <Muted style={{ fontSize: 12 }}>{PAY_HINT[p]}</Muted>
        </View>
        <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} size={22} color={active ? colors.primaryDark : colors.border} />
      </Pressable>
    );
  });
}

function EditLink({ onPress, label }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8}>
      <Text style={{ color: colors.primaryDark, fontFamily: fonts.bold }}>{label}</Text>
    </Pressable>
  );
}

export default function CheckoutScreen({ navigation }) {
  const { user, products, cart } = useApp();
  const [payment, setPayment] = useState('Pix');
  const items = products.filter((p) => cart.includes(p.id) && p.status === 'available');
  const total = items.reduce((a, p) => a + p.price, 0);

  return (
    <Screen>
      <Card>
        <Subtitle>Resumo do pedido</Subtitle>
        {items.map((p) => <Row key={p.id} label={`${p.name} (Tam. ${p.size})`} value={money(p.price)} />)}
        <Divider />
        <Row label="Total" value={<Price value={total} size={20} />} bold />
      </Card>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Subtitle>Endereço de entrega</Subtitle>
          <EditLink label="Editar" onPress={() => navigation.navigate('Address')} />
        </View>
        <Body>{user.address ? formatAddress(user.address) : 'Nenhum endereço cadastrado.'}</Body>
      </Card>
      <Card>
        <Subtitle>Forma de pagamento</Subtitle>
        <PaymentPicker value={payment} onChange={setPayment} />
      </Card>
      <Button title={`Pagar ${money(total)}`} disabled={!items.length || !user.address} onPress={() => navigation.navigate('Payment', { kind: 'purchase', amount: total, payment })} />
      <Muted style={{ textAlign: 'center', marginTop: spacing.sm, fontSize: 12 }}>Pagamento simulado — nenhuma cobrança real será feita.</Muted>
    </Screen>
  );
}
