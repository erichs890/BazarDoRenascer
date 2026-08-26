// Formatação pt-BR. Intl faz o trabalho — não reimplementar separador de milhar.
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DATE = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const MONTH = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

export const money = (v) => BRL.format(Number(v) || 0);
export const dateBR = (iso) => DATE.format(new Date(iso));
export const monthBR = (d = new Date()) => MONTH.format(d);

/**
 * "12,50" | "12.50" | "1.234,56" | 12.5 -> número ; entrada inválida -> NaN.
 * Com vírgula, o ponto é separador de milhar ("1.234,56"). Sem vírgula, o ponto
 * é decimal ("12.50") — é o que alguém digita num campo de preço.
 */
export const parseAmount = (v) => {
  const s = String(v).trim();
  return Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
};

export const uid = () => Math.random().toString(36).slice(2, 9);
