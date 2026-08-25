import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { Screen, Card, Subtitle, Body, Muted, Button, Input, Row, Price, FadeIn } from '../../components/ui';
import { colors, fonts, money, dateBR, spacing, radius } from '../../theme';
import { formatAddress } from './AddressScreen';

const Link = ({ label, onPress }) => (
  <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8}>
    <Text style={{ color: colors.primaryDark, fontFamily: fonts.bold }}>{label}</Text>
  </Pressable>
);

function HistoryItem({ icon, tone, title, meta, amount }) {
  const [fg, bg] = tone === 'accent' ? [colors.accentDark, colors.accentLight] : [colors.primaryDark, colors.primaryLight];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
      <View style={{ width: 36, height: 36, borderRadius: radius.sm, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <Ionicons name={icon} size={18} color={fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.semibold, color: colors.text }}>{title}</Text>
        <Muted style={{ fontSize: 12 }}>{meta}</Muted>
      </View>
      <Price value={amount} size={15} />
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, updateUser, sales, donations, logout } = useApp();
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState({ name: user.name, phone: user.phone });
  const myPurchases = sales.filter((s) => s.buyerId === user.id);
  const myDonations = donations.filter((d) => d.donorId === user.id);

  const save = () => {
    if (!f.name.trim()) return;
    updateUser(f);
    setEditing(false);
  };

  return (
    <Screen atmosphere>
      <FadeIn index={0}>
        <Card style={{ alignItems: 'center' }}>
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 32, color: colors.onPrimary }}>{user.name[0]}</Text>
          </View>
          {editing ? (
            <View style={{ width: '100%' }}>
              <Input label="Nome" value={f.name} onChangeText={(v) => setF({ ...f, name: v })} textContentType="name" />
              <Input label="Telefone" value={f.phone} onChangeText={(v) => setF({ ...f, phone: v })} keyboardType="phone-pad" textContentType="telephoneNumber" />
              <Button title="Salvar" onPress={save} />
              <Button title="Cancelar" variant="ghost" onPress={() => setEditing(false)} />
            </View>
          ) : (
            <>
              <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.text }}>{user.name}</Text>
              <Muted>{user.email}</Muted>
              <Muted>{user.phone}</Muted>
              <View style={{ marginTop: 10 }}><Link label="Editar dados" onPress={() => setEditing(true)} /></View>
            </>
          )}
        </Card>
      </FadeIn>

      <FadeIn index={1}>
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Subtitle>Endereço de entrega</Subtitle>
            <Link label={user.address ? 'Editar' : 'Cadastrar'} onPress={() => navigation.navigate('Address')} />
          </View>
          {user.address ? <Body>{formatAddress(user.address)}</Body> : <Muted>Nenhum endereço cadastrado ainda.</Muted>}
        </Card>
      </FadeIn>

      <FadeIn index={2}>
        <Card>
          <Subtitle>Minhas compras ({myPurchases.length})</Subtitle>
          {myPurchases.length
            ? myPurchases.map((s) => <HistoryItem key={s.id} icon="bag-check-outline" title={s.productName} meta={`${dateBR(s.date)} · ${s.payment}`} amount={s.amount} />)
            : <Muted>Você ainda não comprou nenhuma peça.</Muted>}
        </Card>
      </FadeIn>

      <FadeIn index={3}>
        <Card>
          <Subtitle>Minhas doações ({myDonations.length})</Subtitle>
          {myDonations.length
            ? myDonations.map((d) => <HistoryItem key={d.id} icon="heart-outline" tone="accent" title="Doação" meta={`${dateBR(d.date)} · ${d.payment}`} amount={d.amount} />)
            : <Muted>Nenhuma doação ainda.</Muted>}
          <Row label="Total doado" value={money(myDonations.reduce((a, d) => a + d.amount, 0))} bold />
        </Card>
        <Button title="Sair da conta" variant="outline" icon={<Ionicons name="log-out-outline" size={20} color={colors.primaryDeep} />} onPress={logout} />
      </FadeIn>
    </Screen>
  );
}
