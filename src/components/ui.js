import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet, Image, ScrollView, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts, radius, spacing, shadow, money } from '../theme';

/* ---------- Layout ---------- */

// Fundo com atmosfera: blobs suaves em gradiente atrás do conteúdo.
export const Atmosphere = ({ accent }) => (
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <LinearGradient colors={[colors.primaryGlow, 'transparent']} style={[s.blob, { top: -120, right: -80, width: 320, height: 320 }]} />
    <LinearGradient colors={[accent ? colors.accentLight : colors.primaryLight, 'transparent']} style={[s.blob, { bottom: -140, left: -100, width: 360, height: 360 }]} />
  </View>
);

export const Screen = ({ children, scroll = true, style, atmosphere }) => (
  <View style={s.root}>
    {atmosphere && <Atmosphere />}
    {scroll ? (
      <ScrollView contentContainerStyle={[s.pad, style]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    ) : (
      <View style={[s.pad, { flex: 1 }, style]}>{children}</View>
    )}
  </View>
);

// Entrada escalonada (fade + translate). index → delay de 40ms por item.
export function FadeIn({ children, index = 0, style }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 320, delay: Math.min(index, 8) * 40, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }, style]}>
      {children}
    </Animated.View>
  );
}

export const Card = ({ children, style, onPress, accessibilityLabel }) =>
  onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={({ pressed }) => [s.card, pressed && s.pressed, style]}>
      {children}
    </Pressable>
  ) : (
    <View style={[s.card, style]}>{children}</View>
  );

/* ---------- Tipografia ---------- */

export const Display = ({ children, style }) => <Text style={[s.display, style]}>{children}</Text>;
export const Title = ({ children, style }) => <Text style={[s.title, style]}>{children}</Text>;
export const Subtitle = ({ children, style }) => <Text style={[s.subtitle, style]}>{children}</Text>;
export const Body = ({ children, style, ...p }) => <Text style={[s.body, style]} {...p}>{children}</Text>;
export const Muted = ({ children, style, ...p }) => <Text style={[s.muted, style]} {...p}>{children}</Text>;
export const Label = ({ children, style }) => <Text style={[s.label, style]}>{children}</Text>;
export const Price = ({ value, size = 16, style }) => <Text style={[{ fontFamily: fonts.extrabold, fontSize: size, color: colors.primaryDeep, fontVariant: ['tabular-nums'] }, style]}>{money(value)}</Text>;
export const Empty = ({ text }) => <Muted style={{ textAlign: 'center', marginTop: spacing.xl }}>{text}</Muted>;

/* ---------- Controles ---------- */

export function Button({ title, onPress, variant = 'primary', loading, disabled, style, icon }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  const theme = {
    primary: { bg: colors.primary, fg: colors.onPrimary },
    dark: { bg: colors.primaryDeep, fg: colors.white },
    accent: { bg: colors.accent, fg: colors.onPrimary },
    success: { bg: colors.success, fg: colors.white },
    danger: { bg: colors.danger, fg: colors.white },
    outline: { bg: colors.surface, fg: colors.primaryDeep, border: colors.primaryDeep },
    ghost: { bg: 'transparent', fg: colors.muted },
  }[variant];
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() => to(0.97)}
        onPressOut={() => to(1)}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled, busy: !!loading }}
        style={({ pressed }) => [s.btn, { backgroundColor: theme.bg, opacity: disabled ? 0.45 : pressed ? 0.88 : 1 }, theme.border && { borderWidth: 1.5, borderColor: theme.border }, style]}
      >
        {loading ? <ActivityIndicator color={theme.fg} /> : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {icon}
            <Text style={[s.btnText, { color: theme.fg }]}>{title}</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function IconButton({ onPress, children, label, style }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6} style={({ pressed }) => [s.iconBtn, pressed && { backgroundColor: colors.primaryLight }, style]}>
      {children}
    </Pressable>
  );
}

export function Input({ label, error, hint, style, ...props }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={s.inputLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        accessibilityLabel={label}
        style={[s.input, focus && s.inputFocus, error && { borderColor: colors.danger }, style]}
        {...props}
      />
      {error ? <Text style={s.error} accessibilityLiveRegion="polite">{error}</Text> : hint ? <Muted style={{ fontSize: 12, marginTop: 4 }}>{hint}</Muted> : null}
    </View>
  );
}

export function Chips({ options, value, onChange, allLabel }) {
  const opts = allLabel ? [null, ...options] : options;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }} contentContainerStyle={{ gap: 8 }}>
      {opts.map((o) => {
        const active = o === value;
        return (
          <Pressable key={String(o)} onPress={() => onChange(o)} accessibilityRole="button" accessibilityState={{ selected: active }} style={[s.chip, active && s.chipActive]}>
            <Text style={{ color: active ? colors.onPrimary : colors.text, fontFamily: fonts.semibold, fontSize: 13 }}>{o ?? allLabel}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Badge({ text, tone = 'primary' }) {
  const t = {
    primary: [colors.primaryDark, colors.primaryLight],
    success: [colors.success, colors.successLight],
    danger: [colors.danger, colors.dangerLight],
    accent: [colors.accentDark, colors.accentLight],
    muted: [colors.muted, colors.border],
  }[tone];
  return (
    <View style={{ backgroundColor: t[1], paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' }}>
      <Text style={{ color: t[0], fontSize: 11, fontFamily: fonts.bold, letterSpacing: 0.6, textTransform: 'uppercase' }}>{text}</Text>
    </View>
  );
}

export function Row({ label, value, bold }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 }}>
      <Text style={{ color: colors.muted, flex: 1, fontFamily: fonts.body, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: colors.text, fontFamily: bold ? fonts.extrabold : fonts.semibold, fontSize: bold ? 18 : 14, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}

export const Divider = () => <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.sm }} />;

export function ProductCard({ product, onPress }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${product.name}, tamanho ${product.size}, ${money(product.price)}`} style={({ pressed }) => [s.card, { flex: 1, padding: 0, overflow: 'hidden' }, pressed && s.pressed]}>
      <Image source={{ uri: product.image }} accessibilityLabel={product.name} style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.border }} />
      <View style={{ position: 'absolute', top: 8, left: 8 }}><Badge text={product.condition} tone={product.condition === 'Novo' ? 'success' : 'primary'} /></View>
      <View style={{ padding: spacing.sm + 2 }}>
        <Text numberOfLines={1} style={{ fontFamily: fonts.semibold, color: colors.text, fontSize: 14 }}>{product.name}</Text>
        <Muted style={{ fontSize: 12 }}>Tam. {product.size}</Muted>
        <Price value={product.price} style={{ marginTop: 4 }} />
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: spacing.md, paddingBottom: spacing.xxl },
  blob: { position: 'absolute', borderRadius: 999 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, ...shadow },
  pressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.text, letterSpacing: -0.5 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.text, marginBottom: spacing.xs },
  subtitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, marginBottom: spacing.sm },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text },
  muted: { fontFamily: fonts.body, color: colors.muted, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.muted, marginBottom: 6 },
  btn: { minHeight: 52, paddingHorizontal: 20, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  btnText: { fontFamily: fonts.bold, fontSize: 16 },
  iconBtn: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  inputLabel: { fontFamily: fonts.semibold, color: colors.text, marginBottom: 6, fontSize: 14 },
  input: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, minHeight: 50, fontSize: 16, fontFamily: fonts.body, color: colors.text },
  inputFocus: { borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  error: { color: colors.danger, fontSize: 12, marginTop: 4, fontFamily: fonts.medium },
  chip: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});
