import React, { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { Screen, Card, Input, Button, Muted } from '../../components/ui';
import { colors, spacing, radius } from '../../theme';

const FIELDS = [
  ['cep', 'CEP *', { keyboardType: 'numeric', placeholder: '00000-000', maxLength: 9, textContentType: 'postalCode' }],
  ['street', 'Rua *', { placeholder: 'Nome da rua', textContentType: 'streetAddressLine1' }],
  ['number', 'Número *', { keyboardType: 'numeric', placeholder: '123' }],
  ['complement', 'Complemento', { placeholder: 'Apto, bloco...' }],
  ['neighborhood', 'Bairro *', { placeholder: 'Bairro' }],
  ['city', 'Cidade *', { placeholder: 'Cidade', textContentType: 'addressCity' }],
  ['state', 'Estado (UF) *', { placeholder: 'SP', maxLength: 2, autoCapitalize: 'characters', textContentType: 'addressState' }],
];
const OPTIONAL = ['complement'];

export const formatAddress = (a) =>
  `${a.street}, ${a.number}${a.complement ? ' - ' + a.complement : ''}\n${a.neighborhood}, ${a.city} - ${a.state}\nCEP ${a.cep}`;

export default function AddressScreen({ navigation, route }) {
  const { user, updateUser } = useApp();
  const [a, setA] = useState(user.address || Object.fromEntries(FIELDS.map(([k]) => [k, ''])));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const save = () => {
    const e = {};
    FIELDS.forEach(([k, l]) => { if (!OPTIONAL.includes(k) && !a[k].trim()) e[k] = `Informe ${l.replace(' *', '').toLowerCase()}.`; });
    if (a.cep && a.cep.replace(/\D/g, '').length !== 8) e.cep = 'CEP deve ter 8 dígitos.';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    setTimeout(() => {
      updateUser({ address: { ...a, state: a.state.toUpperCase() } });
      setSaving(false);
      route.params?.next ? navigation.replace(route.params.next) : navigation.goBack();
    }, 500);
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primaryLight, borderRadius: radius.md, padding: spacing.sm + 4, marginBottom: spacing.md, gap: 10 }}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.primaryDark} />
        <Muted style={{ flex: 1, fontSize: 13, color: colors.primaryDeep }}>Usamos seu endereço apenas para a entrega das peças compradas.</Muted>
      </View>
      <Card>
        {FIELDS.map(([k, label, props]) => (
          <Input key={k} label={label} value={a[k]} onChangeText={(v) => setA((x) => ({ ...x, [k]: v }))} error={errors[k]} {...props} />
        ))}
        <Muted style={{ fontSize: 12, marginBottom: spacing.sm }}>* campos obrigatórios</Muted>
        <Button title="Salvar endereço" onPress={save} loading={saving} />
      </Card>
    </Screen>
  );
}
