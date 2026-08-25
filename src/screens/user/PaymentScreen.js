import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { Screen, Card, Subtitle, Muted, Button, Input, Row, Label } from '../../components/ui';
import { colors, fonts, money, spacing, radius } from '../../theme';
import { PAY_ICON } from './CheckoutScreen';

const FAKE_PIX = '00020126580014br.gov.bcb.pix0136bazar-do-renascer@pix.org.br5204000053039865802BR5918Bazar do Renascer6009SAO PAULO';
const FAKE_BOLETO = '23793.38128 60000.000003 00000.000400 1 99990000010000';
const code = { fontSize: 12, color: colors.text, backgroundColor: colors.bg, padding: 12, borderRadius: radius.sm, fontFamily: fonts.semibold, letterSpacing: 0.3 };

export default function PaymentScreen({ route, navigation }) {
  const { kind, amount, payment } = route.params;
  const { checkout, donate } = useApp();
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const setC = (k) => (v) => setCard((c) => ({ ...c, [k]: v }));

  const confirm = () => {
    if (payment === 'Cartão de crédito') {
      const e = {};
      if (card.number.replace(/\D/g, '').length < 16) e.number = 'Número inválido — precisa de 16 dígitos.';
      if (!card.name.trim()) e.name = 'Informe o nome impresso no cartão.';
      if (!/^\d{2}\/\d{2}$/.test(card.expiry)) e.expiry = 'Use o formato MM/AA.';
      if (card.cvv.length < 3) e.cvv = 'CVV com 3 ou 4 dígitos.';
      setErrors(e);
      if (Object.keys(e).length) return;
    }
    setLoading(true);
    // ponytail: delay fixo simula o gateway; trocar por chamada real quando existir back-end.
    setTimeout(() => {
      const result = kind === 'purchase' ? checkout(payment) : donate(amount, payment);
      setLoading(false);
      navigation.replace('Success', { kind, result, amount, payment });
    }, 1500);
  };

  return (
    <Screen>
      <Card style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
        <View style={{ width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm }}>
          <Ionicons name={PAY_ICON[payment]} size={28} color={colors.primaryDark} />
        </View>
        <Label>{kind === 'purchase' ? 'Compra' : 'Doação'} via {payment}</Label>
        <Text style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 46, color: colors.text, fontVariant: ['tabular-nums'] }}>{money(amount)}</Text>
      </Card>

      {payment === 'Pix' && (
        <Card>
          <Subtitle>Pix copia e cola</Subtitle>
          <View style={{ alignSelf: 'center', width: 172, height: 172, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }} accessibilityLabel="QR Code Pix">
            <Ionicons name="qr-code" size={128} color={colors.text} />
          </View>
          <Text selectable style={code}>{FAKE_PIX}</Text>
          <Muted style={{ fontSize: 12, marginTop: 8 }}>Após pagar no seu banco, toque em "Já paguei".</Muted>
        </Card>
      )}

      {payment === 'Boleto' && (
        <Card>
          <Subtitle>Boleto bancário</Subtitle>
          <Text selectable style={code}>{FAKE_BOLETO}</Text>
          <Row label="Vencimento" value={new Date(Date.now() + 3 * 864e5).toLocaleDateString('pt-BR')} />
          <Muted style={{ fontSize: 12 }}>A confirmação pode levar até 2 dias úteis.</Muted>
        </Card>
      )}

      {payment === 'Cartão de crédito' && (
        <Card>
          <Subtitle>Dados do cartão</Subtitle>
          <Input label="Número do cartão" value={card.number} onChangeText={setC('number')} keyboardType="numeric" textContentType="creditCardNumber" placeholder="0000 0000 0000 0000" maxLength={19} error={errors.number} />
          <Input label="Nome impresso" value={card.name} onChangeText={setC('name')} autoCapitalize="characters" placeholder="NOME COMO NO CARTÃO" error={errors.name} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}><Input label="Validade" value={card.expiry} onChangeText={setC('expiry')} placeholder="MM/AA" maxLength={5} error={errors.expiry} /></View>
            <View style={{ flex: 1 }}><Input label="CVV" value={card.cvv} onChangeText={setC('cvv')} keyboardType="numeric" placeholder="123" maxLength={4} secureTextEntry error={errors.cvv} /></View>
          </View>
        </Card>
      )}

      <Button title={payment === 'Pix' ? 'Já paguei' : payment === 'Boleto' ? 'Gerar boleto e confirmar' : 'Pagar agora'} onPress={confirm} loading={loading} />
      <Muted style={{ textAlign: 'center', marginTop: spacing.sm, fontSize: 12 }}>Ambiente de demonstração — nenhuma cobrança real.</Muted>
    </Screen>
  );
}
