import React, { useState } from 'react';
import { View, Text, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../context/AppContext';
import { CATEGORIES, SIZES } from '../../mocks/data';
import { ProductCard, Input, Chips, Empty, Muted, Label, FadeIn, Atmosphere } from '../../components/ui';
import { colors, fonts, spacing, radius } from '../../theme';

const PRICES = [{ l: 'Até R$ 30', min: 0, max: 30 }, { l: 'R$ 30–60', min: 30, max: 60 }, { l: 'Acima de R$ 60', min: 60, max: Infinity }];

export default function ShopScreen({ navigation }) {
  const { user, products } = useApp();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(null);
  const [size, setSize] = useState(null);
  const [price, setPrice] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const range = PRICES.find((p) => p.l === price);
  const list = products.filter((p) =>
    p.status === 'available' &&
    p.name.toLowerCase().includes(q.toLowerCase()) &&
    (!cat || p.category === cat) &&
    (!size || p.size === size) &&
    (!range || (p.price >= range.min && p.price < range.max)),
  );
  const activeFilters = [cat, size, price].filter(Boolean).length;
  const filterOn = showFilters || activeFilters > 0;

  const header = (
    <View style={{ paddingBottom: spacing.sm }}>
      <FadeIn index={0}>
        <Pressable onPress={() => navigation.navigate('Doar')} accessibilityRole="button" accessibilityLabel="Quero apenas doar" style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1, marginBottom: spacing.md })}>
          <LinearGradient colors={[colors.accent, '#FFD27A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }}>
            <View style={{ position: 'absolute', right: -20, top: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.25)' }} />
            <View style={{ width: 44, height: 44, borderRadius: radius.sm, backgroundColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
              <Ionicons name="heart" size={24} color={colors.onPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.onPrimary, fontFamily: fonts.display, fontSize: 18 }}>Quer apenas doar, {user.name.split(' ')[0]}?</Text>
              <Text style={{ color: colors.onPrimary, opacity: 0.8, fontSize: 12, fontFamily: fonts.medium }}>Sem compra, sem endereço. Vai direto pra quem precisa.</Text>
            </View>
            <Ionicons name="arrow-forward" size={22} color={colors.onPrimary} />
          </LinearGradient>
        </Pressable>
      </FadeIn>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Input placeholder="Buscar roupas..." value={q} onChangeText={setQ} accessibilityLabel="Buscar roupas" />
        </View>
        <Pressable onPress={() => setShowFilters((v) => !v)} accessibilityRole="button" accessibilityLabel="Filtros" accessibilityState={{ expanded: showFilters }} style={{ marginLeft: 8, backgroundColor: filterOn ? colors.primary : colors.surface, borderRadius: radius.md, width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: filterOn ? colors.primary : colors.border }}>
          <Ionicons name="options-outline" size={22} color={filterOn ? colors.onPrimary : colors.text} />
        </Pressable>
      </View>

      {showFilters && (
        <View>
          <Label>Categoria</Label>
          <Chips options={CATEGORIES} value={cat} onChange={setCat} allLabel="Todas" />
          <Label>Tamanho</Label>
          <Chips options={SIZES} value={size} onChange={setSize} allLabel="Todos" />
          <Label>Preço</Label>
          <Chips options={PRICES.map((p) => p.l)} value={price} onChange={setPrice} allLabel="Qualquer" />
        </View>
      )}
      <Muted>{list.length} peça(s) disponível(is)</Muted>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Atmosphere />
      <FlatList
        data={list}
        numColumns={2}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={header}
        columnWrapperStyle={{ gap: spacing.md }}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
        ListEmptyComponent={<Empty text="Nenhuma peça encontrada com esses filtros." />}
        renderItem={({ item, index }) => (
          <FadeIn index={index} style={{ flex: 1 }}>
            <ProductCard product={item} onPress={() => navigation.navigate('ProductDetail', { id: item.id })} />
          </FadeIn>
        )}
      />
    </View>
  );
}
