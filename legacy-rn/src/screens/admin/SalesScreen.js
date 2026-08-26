import React, { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { Card, Muted, Chips, Empty, Badge, Label, FadeIn } from '../../components/ui';
import { colors, fonts, money, dateBR, spacing, radius } from '../../theme';

const PERIODS = ['Esta semana', 'Este mês'];
export const inPeriod = (iso, period) => {
  if (!period) return true;
  const days = period === 'Esta semana' ? 7 : 30;
  return Date.now() - new Date(iso).getTime() <= days * 864e5;
};

// Cabeçalho reutilizado por Vendas e Doações
export function HistoryHeader({ period, setPeriod, count, noun, total, tone }) {
  return (
    <View style={{ padding: spacing.md, paddingBottom: 0 }}>
      <Chips options={PERIODS} value={period} onChange={setPeriod} allLabel="Tudo" />
      <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Label>{period || 'Todo o período'}</Label>
          <Muted>{count} {noun}</Muted>
        </View>
        <Text style={{ fontFamily: fonts.display, fontSize: 28, color: tone, fontVariant: ['tabular-nums'] }}>{money(total)}</Text>
      </Card>
    </View>
  );
}

export default function SalesScreen() {
  const { sales } = useApp();
  const [period, setPeriod] = useState(null);
  const list = sales.filter((s) => inPeriod(s.date, period));
  const total = list.reduce((a, s) => a + s.amount, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <HistoryHeader period={period} setPeriod={setPeriod} count={list.length} noun="venda(s)" total={total} tone={colors.primaryDeep} />
      <FlatList
        data={list}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}
        ListEmptyComponent={<Empty text="Nenhuma venda no período." />}
        renderItem={({ item: s, index }) => (
          <FadeIn index={index}>
            <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
                <Ionicons name="bag-check-outline" size={22} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bold, color: colors.text, fontSize: 15 }} numberOfLines={1}>{s.productName}</Text>
                <Muted style={{ fontSize: 12 }}>{s.buyerName} · {dateBR(s.date)}</Muted>
                <View style={{ marginTop: 6 }}><Badge text={s.payment} /></View>
              </View>
              <Text style={{ fontFamily: fonts.extrabold, color: colors.success, fontSize: 16, fontVariant: ['tabular-nums'] }}>+{money(s.amount)}</Text>
            </Card>
          </FadeIn>
        )}
      />
    </View>
  );
}
