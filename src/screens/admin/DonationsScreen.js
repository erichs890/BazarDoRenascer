import React, { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { Card, Muted, Empty, Badge, FadeIn } from '../../components/ui';
import { colors, fonts, money, dateBR, spacing, radius } from '../../theme';
import { inPeriod, HistoryHeader } from './SalesScreen';

export default function DonationsScreen() {
  const { donations } = useApp();
  const [period, setPeriod] = useState(null);
  const list = donations.filter((d) => inPeriod(d.date, period));
  const total = list.reduce((a, d) => a + d.amount, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <HistoryHeader period={period} setPeriod={setPeriod} count={list.length} noun="doação(ões)" total={total} tone={colors.accentDark} />
      <FlatList
        data={list}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}
        ListEmptyComponent={<Empty text="Nenhuma doação no período." />}
        renderItem={({ item: d, index }) => (
          <FadeIn index={index}>
            <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.accentLight, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
                <Ionicons name="heart-outline" size={22} color={colors.accentDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bold, color: colors.text, fontSize: 15 }}>{d.donorName}</Text>
                <Muted style={{ fontSize: 12 }}>{dateBR(d.date)}</Muted>
                <View style={{ marginTop: 6 }}><Badge text={d.payment} tone="accent" /></View>
              </View>
              <Text style={{ fontFamily: fonts.extrabold, color: colors.success, fontSize: 16, fontVariant: ['tabular-nums'] }}>+{money(d.amount)}</Text>
            </Card>
          </FadeIn>
        )}
      />
    </View>
  );
}
