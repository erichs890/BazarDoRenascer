import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Card, Title, Subtitle, Muted, Button, Input, FadeIn, Label } from '../../components/ui';
import { colors, fonts, money, spacing, radius } from '../../theme';
import { PaymentPicker } from './CheckoutScreen';

const PRESETS = [10, 20, 50, 100];

export default function DonateScreen({ navigation }) {
  const [preset, setPreset] = useState(20);
  const [custom, setCustom] = useState('');
  const [payment, setPayment] = useState('Pix');
  const amount = custom ? Number(custom.replace(',', '.')) : preset;
  const valid = amount > 0;

  return (
    <Screen atmosphere>
      <FadeIn index={0}>
        <View style={{ marginBottom: spacing.md }}>
          <View style={{ width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.accentLight, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm }}>
            <Ionicons name="heart" size={30} color={colors.accentDark} />
          </View>
          <Label>Doação avulsa</Label>
          <Title>Sua ajuda,{'\n'}<Text style={{ fontFamily: fonts.displaySoft, fontStyle: 'italic', color: colors.accentDark }}>direto ao ponto.</Text></Title>
          <Muted>Não precisa comprar nada. Todo valor vai para as ações do Bazar do Renascer.</Muted>
        </View>
      </FadeIn>
      <FadeIn index={1}>
        <Card>
          <Subtitle>Escolha um valor</Subtitle>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.md }}>
            {PRESETS.map((v) => {
              const active = !custom && preset === v;
              return (
                <Pressable key={v} onPress={() => { setPreset(v); setCustom(''); }} accessibilityRole="radio" accessibilityState={{ checked: active }} style={{ flex: 1, minHeight: 52, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', borderColor: active ? colors.accent : colors.border, backgroundColor: active ? colors.accentLight : colors.surface }}>
                  <Text style={{ fontFamily: fonts.extrabold, fontSize: 15, color: active ? colors.accentDark : colors.text }}>R$ {v}</Text>
                </Pressable>
              );
            })}
          </View>
          <Input label="Ou digite outro valor (R$)" value={custom} onChangeText={setCustom} keyboardType="decimal-pad" placeholder="0,00" error={custom && !valid ? 'Informe um valor maior que zero.' : ''} />
        </Card>
      </FadeIn>
      <FadeIn index={2}>
        <Card>
          <Subtitle>Forma de pagamento</Subtitle>
          <PaymentPicker value={payment} onChange={setPayment} />
        </Card>
        <Button title={`Doar ${money(valid ? amount : 0)}`} variant="accent" icon={<Ionicons name="heart" size={20} color={colors.onPrimary} />} disabled={!valid} onPress={() => navigation.navigate('Payment', { kind: 'donation', amount, payment })} />
      </FadeIn>
    </Screen>
  );
}
