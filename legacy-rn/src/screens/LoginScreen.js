import React, { useState } from 'react';
import { View, Text, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { USERS } from '../mocks/data';
import { Screen, Card, Display, Muted, Label, Button, Input, FadeIn, IconButton } from '../components/ui';
import { colors, fonts, spacing, radius } from '../theme';

export default function LoginScreen() {
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = () => {
    if (!email || !password) return setError('Informe e-mail e senha para continuar.');
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (!login(email, password)) setError('E-mail ou senha inválidos. Use uma das contas de demonstração abaixo.');
    }, 600);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen atmosphere style={{ justifyContent: 'center', flexGrow: 1, paddingTop: spacing.xxl }}>
        <FadeIn index={0}>
          <View style={{ marginBottom: spacing.lg }}>
            <View style={{ width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md }}>
              <Ionicons name="heart" size={30} color={colors.onPrimary} />
            </View>
            <Label>Bazar beneficente</Label>
            <Display>Bazar do{'\n'}<Text style={{ fontFamily: fonts.displaySoft, fontStyle: 'italic', color: colors.primaryDark }}>Renascer</Text></Display>
            <Muted style={{ marginTop: spacing.sm, fontSize: 15 }}>Roupas com história, ajuda que transforma.</Muted>
          </View>
        </FadeIn>

        <FadeIn index={1}>
          <Card>
            <Input label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" placeholder="seu@email.com" />
            <View>
              <Input label="Senha" value={password} onChangeText={setPassword} secureTextEntry={!show} textContentType="password" placeholder="••••••••" error={error} style={{ paddingRight: 52 }} />
              <IconButton onPress={() => setShow((v) => !v)} label={show ? 'Ocultar senha' : 'Mostrar senha'} style={{ position: 'absolute', right: 4, top: 27 }}>
                <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={22} color={colors.muted} />
              </IconButton>
            </View>
            <Button title="Entrar" onPress={submit} loading={loading} />
          </Card>
        </FadeIn>

        <FadeIn index={2}><Label style={{ marginTop: spacing.sm }}>Contas de demonstração</Label></FadeIn>
        {USERS.map((u, i) => (
          <FadeIn key={u.id} index={3 + i}>
            <Card onPress={() => { setEmail(u.email); setPassword(u.password); setError(''); }} accessibilityLabel={`Preencher com conta ${u.role === 'admin' ? 'administrador' : 'usuário'}`} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 44, height: 44, borderRadius: radius.sm, backgroundColor: u.role === 'admin' ? colors.primaryLight : colors.accentLight, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md }}>
                <Ionicons name={u.role === 'admin' ? 'shield-checkmark-outline' : 'bag-handle-outline'} size={22} color={u.role === 'admin' ? colors.primaryDark : colors.accentDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bold, color: colors.text, fontSize: 15 }}>{u.role === 'admin' ? 'Administrador' : 'Usuário / Comprador'}</Text>
                <Muted style={{ fontSize: 12 }}>{u.email} · senha: {u.password}</Muted>
              </View>
              <Ionicons name="arrow-forward" size={20} color={colors.primaryDark} />
            </Card>
          </FadeIn>
        ))}
      </Screen>
    </KeyboardAvoidingView>
  );
}
