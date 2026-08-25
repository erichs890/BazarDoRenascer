// Tokens semânticos — nunca hex solto nas telas.
export const colors = {
  primary: 'rgb(76, 196, 233)',   // marca (fundo de CTA, destaques)
  primaryDark: '#1483AB',         // texto/ícone azul sobre branco (AA 4.6:1)
  primaryDeep: '#0B4F6C',         // navy-azul para contraste alto
  primaryLight: '#E3F6FC',
  primaryGlow: 'rgba(76,196,233,0.18)',
  onPrimary: '#082A3A',           // texto sobre o azul da marca (9:1)
  white: '#FFFFFF',
  bg: '#F4F9FB',                  // off-white frio
  surface: '#FFFFFF',
  border: '#DCE7ED',
  text: '#0F2233',                // navy
  muted: '#5B6E7C',               // 5.3:1 sobre branco
  accent: '#F4B53F',              // âmbar — doações/coração (acento quente)
  accentDark: '#8A5A00',
  accentLight: '#FFF4DB',
  success: '#1B9E5A',
  successLight: '#E4F6EC',
  danger: '#D9363E',
  dangerLight: '#FDEBEC',
};

export const fonts = {
  display: 'Fraunces_700Bold',
  displaySoft: 'Fraunces_500Medium',
  body: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const shadow = {
  shadowColor: '#0B4F6C',
  shadowOpacity: 0.07,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};

export const money = (v) =>
  'R$ ' + Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const dateBR = (iso) => new Date(iso).toLocaleDateString('pt-BR');
