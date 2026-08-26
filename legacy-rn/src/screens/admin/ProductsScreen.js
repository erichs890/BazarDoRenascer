import React, { useState } from 'react';
import { View, Text, Image, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { Card, Muted, Badge, Button, Chips, Empty, Input, IconButton, Price, FadeIn } from '../../components/ui';
import { colors, fonts, spacing } from '../../theme';

const STATUS = ['Disponível', 'Vendido'];

export default function ProductsScreen({ navigation }) {
  const { products, removeProduct } = useApp();
  const [status, setStatus] = useState(null);
  const [q, setQ] = useState('');

  const list = products.filter((p) =>
    (!status || (status === 'Vendido') === (p.status === 'sold')) &&
    p.name.toLowerCase().includes(q.toLowerCase()),
  );

  const confirmRemove = (p) =>
    Alert.alert('Remover peça', `Remover "${p.name}" do bazar? Esta ação não pode ser desfeita.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removeProduct(p.id) },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ padding: spacing.md, paddingBottom: 0 }}>
        <Input placeholder="Buscar peça..." value={q} onChangeText={setQ} accessibilityLabel="Buscar peça" />
        <Chips options={STATUS} value={status} onChange={setStatus} allLabel="Todos" />
        <Button title="Cadastrar nova peça" icon={<Ionicons name="add" size={20} color={colors.onPrimary} />} onPress={() => navigation.navigate('ProductForm')} style={{ marginBottom: spacing.sm }} />
      </View>
      <FlatList
        data={list}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: spacing.md }}
        ListEmptyComponent={<Empty text="Nenhuma peça encontrada." />}
        renderItem={({ item: p, index }) => {
          const sold = p.status === 'sold';
          return (
            <FadeIn index={index}>
              <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image source={{ uri: p.image }} accessibilityLabel={p.name} style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: colors.border, opacity: sold ? 0.45 : 1 }} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={{ fontFamily: fonts.bold, color: colors.text, fontSize: 15 }} numberOfLines={1}>{p.name}</Text>
                  <Muted style={{ fontSize: 12 }}>{p.category} · Tam. {p.size} · {p.condition}</Muted>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
                    <Price value={p.price} size={15} />
                    <Badge text={sold ? 'Vendido' : 'Disponível'} tone={sold ? 'muted' : 'success'} />
                  </View>
                </View>
                {!sold && (
                  <View style={{ flexDirection: 'row' }}>
                    <IconButton label={`Editar ${p.name}`} onPress={() => navigation.navigate('ProductForm', { id: p.id })}>
                      <Ionicons name="create-outline" size={22} color={colors.primaryDark} />
                    </IconButton>
                    <IconButton label={`Remover ${p.name}`} onPress={() => confirmRemove(p)}>
                      <Ionicons name="trash-outline" size={22} color={colors.danger} />
                    </IconButton>
                  </View>
                )}
              </Card>
            </FadeIn>
          );
        }}
      />
    </View>
  );
}
