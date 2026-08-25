import React, { useState } from 'react';
import { View, Image, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { CATEGORIES, SIZES, CONDITIONS } from '../../mocks/data';
import { Screen, Card, Input, Button, Chips, Muted, Label } from '../../components/ui';
import { colors, fonts, spacing, radius } from '../../theme';

export default function ProductFormScreen({ navigation, route }) {
  const { products, addProduct, updateProduct } = useApp();
  const existing = products.find((p) => p.id === route.params?.id);
  const [f, setF] = useState(existing || { name: '', category: CATEGORIES[0], size: 'M', condition: 'Seminovo', price: '', description: '', image: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  // ponytail: upload mockado — sorteia uma imagem placeholder; trocar por expo-image-picker se precisar câmera/galeria.
  const pickImage = () => set('image')(`https://picsum.photos/seed/${Math.random().toString(36).slice(2, 8)}/400/400`);

  const save = () => {
    const e = {};
    if (!f.name.trim()) e.name = 'Informe o nome da peça.';
    const price = Number(String(f.price).replace(',', '.'));
    if (!price || price <= 0) e.price = 'Informe um preço maior que zero.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setTimeout(() => {
      const data = { ...f, price, image: f.image || `https://picsum.photos/seed/${encodeURIComponent(f.name)}/400/400` };
      existing ? updateProduct(existing.id, data) : addProduct(data);
      setSaving(false);
      Alert.alert('Pronto', existing ? 'Peça atualizada.' : 'Peça cadastrada no bazar.');
      navigation.goBack();
    }, 500);
  };

  return (
    <Screen>
      <Card>
        <Label>Foto</Label>
        <Pressable onPress={pickImage} accessibilityRole="button" accessibilityLabel={f.image ? 'Trocar foto' : 'Adicionar foto'} style={({ pressed }) => ({ alignItems: 'center', marginBottom: spacing.md, opacity: pressed ? 0.8 : 1 })}>
          {f.image ? (
            <Image source={{ uri: f.image }} style={{ width: 140, height: 140, borderRadius: radius.lg }} />
          ) : (
            <View style={{ width: 140, height: 140, borderRadius: radius.lg, backgroundColor: colors.primaryLight, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="camera-outline" size={34} color={colors.primaryDark} />
              <Muted style={{ fontSize: 12, marginTop: 4, color: colors.primaryDark, fontFamily: fonts.semibold }}>Adicionar foto</Muted>
            </View>
          )}
          {f.image ? <Muted style={{ color: colors.primaryDark, marginTop: 8, fontFamily: fonts.semibold }}>Trocar foto</Muted> : null}
        </Pressable>

        <Input label="Nome *" value={f.name} onChangeText={set('name')} placeholder="Ex.: Camiseta básica" error={errors.name} />
        <Label>Categoria</Label>
        <Chips options={CATEGORIES} value={f.category} onChange={set('category')} />
        <Label style={{ marginTop: spacing.sm }}>Tamanho</Label>
        <Chips options={SIZES} value={f.size} onChange={set('size')} />
        <Label style={{ marginTop: spacing.sm }}>Condição</Label>
        <Chips options={CONDITIONS} value={f.condition} onChange={set('condition')} />
        <View style={{ height: spacing.sm }} />
        <Input label="Preço (R$) *" value={String(f.price)} onChangeText={set('price')} keyboardType="decimal-pad" placeholder="0,00" error={errors.price} />
        <Input label="Descrição" value={f.description} onChangeText={set('description')} multiline numberOfLines={3} style={{ minHeight: 88, textAlignVertical: 'top', paddingTop: 12 }} placeholder="Detalhes, marca, observações" hint="Ajuda o comprador a decidir." />
        <Button title={existing ? 'Salvar alterações' : 'Cadastrar peça'} onPress={save} loading={saving} />
        <Button title="Cancelar" variant="ghost" onPress={() => navigation.goBack()} />
      </Card>
    </Screen>
  );
}
