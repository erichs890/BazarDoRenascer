import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../context/AppContext';
import { Screen, Card, Title, Subtitle, Muted, Label, Row, FadeIn } from '../../components/ui';
import { colors, fonts, money, spacing, radius } from '../../theme';

const thisMonth = (iso) => {
  const d = new Date(iso), n = new Date();
  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
};

function Stat({ icon, label, value, tone }) {
  const [fg, bg] = tone === 'success' ? [colors.success, colors.successLight] : [colors.primaryDark, colors.primaryLight];
  return (
    <Card style={{ flex: 1, marginBottom: 0 }}>
      <View style={{ width: 36, height: 36, borderRadius: radius.sm, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm }}>
        <Ionicons name={icon} size={20} color={fg} />
      </View>
      <Text style={{ fontFamily: fonts.display, fontSize: 30, color: colors.text, fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Label style={{ marginBottom: 0 }}>{label}</Label>
    </Card>
  );
}

function Bar({ label, value, total, color, icon }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <View style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={icon} size={14} color={color} />
          <Text style={{ fontFamily: fonts.semibold, color: colors.text }}>{label}</Text>
        </View>
        <Text style={{ fontFamily: fonts.bold, color: colors.text, fontVariant: ['tabular-nums'] }}>{money(value)} <Muted>· {pct}%</Muted></Text>
      </View>
      <View style={{ height: 10, backgroundColor: colors.bg, borderRadius: 5, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 5 }} />
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { user, products, sales, donations } = useApp();
  const mSales = sales.filter((s) => thisMonth(s.date));
  const mDon = donations.filter((d) => thisMonth(d.date));
  const salesTotal = mSales.reduce((a, s) => a + s.amount, 0);
  const donTotal = mDon.reduce((a, d) => a + d.amount, 0);
  const total = salesTotal + donTotal;
  const month = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <Screen atmosphere>
      <FadeIn index={0}>
        <Label>Olá, {user.name}</Label>
        <Title style={{ marginBottom: spacing.md }}>Painel do bazar</Title>
      </FadeIn>

      <FadeIn index={1}>
        <LinearGradient colors={[colors.primary, '#7ED8F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.18)' }} />
          <Label style={{ color: colors.onPrimary, opacity: 0.8 }}>Arrecadado em {month}</Label>
          <Text style={{ fontFamily: fonts.display, fontSize: 40, lineHeight: 46, color: colors.onPrimary, fontVariant: ['tabular-nums'] }}>{money(total)}</Text>
          <Text style={{ fontFamily: fonts.medium, color: colors.onPrimary, opacity: 0.85, marginTop: 4 }}>{mSales.length} vendas · {mDon.length} doações</Text>
        </LinearGradient>
      </FadeIn>

      <FadeIn index={2}>
        <Card>
          <Subtitle>Vendas × Doações no mês</Subtitle>
          <Bar label="Vendas" value={salesTotal} total={total} color={colors.primaryDark} icon="receipt" />
          <Bar label="Doações" value={donTotal} total={total} color={colors.accent} icon="heart" />
        </Card>
      </FadeIn>

      <FadeIn index={3}>
        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md }}>
          <Stat icon="checkmark-done" label="Vendidos" value={products.filter((p) => p.status === 'sold').length} tone="success" />
          <Stat icon="shirt" label="Disponíveis" value={products.filter((p) => p.status === 'available').length} />
        </View>
      </FadeIn>

      <FadeIn index={4}>
        <Card>
          <Subtitle>Histórico geral</Subtitle>
          <Row label="Total em vendas" value={money(sales.reduce((a, s) => a + s.amount, 0))} />
          <Row label="Total em doações" value={money(donations.reduce((a, d) => a + d.amount, 0))} />
          <Row label="Peças cadastradas" value={products.length} />
        </Card>
      </FadeIn>
    </Screen>
  );
}
