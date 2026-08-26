export const USERS = [
  { id: 'u1', name: 'Administrador', email: 'admin@bazar.com', password: 'admin123', role: 'admin', phone: '(11) 99999-0000', address: null },
  { id: 'u2', name: 'Maria Silva', email: 'maria@email.com', password: 'maria123', role: 'user', phone: '(11) 98888-1111', address: null },
];

export const CATEGORIES = ['Camisetas', 'Calças', 'Vestidos', 'Casacos', 'Calçados', 'Acessórios'];
export const SIZES = ['PP', 'P', 'M', 'G', 'GG', 'Único'];
export const CONDITIONS = ['Novo', 'Seminovo', 'Usado'];
export const PAYMENTS = ['Pix', 'Cartão de crédito', 'Boleto'];

const img = (seed) => `https://picsum.photos/seed/${seed}/400/400`;
const ago = (days) => new Date(Date.now() - days * 864e5).toISOString();

export const PRODUCTS = [
  { id: 'p1', name: 'Camiseta básica branca', category: 'Camisetas', size: 'M', condition: 'Seminovo', price: 15, image: img('shirt1'), description: 'Camiseta de algodão, sem manchas, pouco uso.', status: 'available', createdAt: ago(20) },
  { id: 'p2', name: 'Calça jeans azul', category: 'Calças', size: 'G', condition: 'Usado', price: 35, image: img('jeans2'), description: 'Jeans reto, com leve desgaste na barra.', status: 'available', createdAt: ago(18) },
  { id: 'p3', name: 'Vestido floral', category: 'Vestidos', size: 'P', condition: 'Novo', price: 60, image: img('dress3'), description: 'Vestido midi com etiqueta, nunca usado.', status: 'available', createdAt: ago(15) },
  { id: 'p4', name: 'Jaqueta corta-vento', category: 'Casacos', size: 'G', condition: 'Seminovo', price: 80, image: img('jacket4'), description: 'Jaqueta impermeável preta, zíper perfeito.', status: 'available', createdAt: ago(12) },
  { id: 'p5', name: 'Tênis esportivo', category: 'Calçados', size: 'M', condition: 'Usado', price: 45, image: img('shoes5'), description: 'Tênis de corrida nº 39, sola em bom estado.', status: 'available', createdAt: ago(10) },
  { id: 'p6', name: 'Bolsa de couro', category: 'Acessórios', size: 'Único', condition: 'Seminovo', price: 55, image: img('bag6'), description: 'Bolsa marrom, alça ajustável.', status: 'available', createdAt: ago(9) },
  { id: 'p7', name: 'Moletom cinza', category: 'Casacos', size: 'M', condition: 'Seminovo', price: 40, image: img('hoodie7'), description: 'Moletom com capuz, muito confortável.', status: 'available', createdAt: ago(7) },
  { id: 'p8', name: 'Camisa social azul', category: 'Camisetas', size: 'G', condition: 'Novo', price: 50, image: img('shirt8'), description: 'Camisa de manga longa, ideal para trabalho.', status: 'available', createdAt: ago(5) },
  { id: 'p9', name: 'Saia plissada', category: 'Vestidos', size: 'M', condition: 'Seminovo', price: 30, image: img('skirt9'), description: 'Saia preta na altura do joelho.', status: 'available', createdAt: ago(4) },
  { id: 'p10', name: 'Boné vintage', category: 'Acessórios', size: 'Único', condition: 'Usado', price: 12, image: img('cap10'), description: 'Boné aba curva, cor bege.', status: 'available', createdAt: ago(3) },
  { id: 'p11', name: 'Camiseta estampada', category: 'Camisetas', size: 'P', condition: 'Usado', price: 10, image: img('tee11'), status: 'sold', description: 'Estampa de banda de rock.', createdAt: ago(30) },
  { id: 'p12', name: 'Sandália de couro', category: 'Calçados', size: 'P', condition: 'Seminovo', price: 38, image: img('sandal12'), status: 'sold', description: 'Sandália rasteira caramelo nº 37.', createdAt: ago(28) },
  { id: 'p13', name: 'Blazer preto', category: 'Casacos', size: 'M', condition: 'Novo', price: 120, image: img('blazer13'), status: 'sold', description: 'Blazer alfaiataria, com etiqueta.', createdAt: ago(25) },
];

export const SALES = [
  { id: 's1', productId: 'p11', productName: 'Camiseta estampada', buyerId: 'u2', buyerName: 'Maria Silva', amount: 10, payment: 'Pix', date: ago(2) },
  { id: 's2', productId: 'p12', productName: 'Sandália de couro', buyerId: 'u3', buyerName: 'João Pereira', amount: 38, payment: 'Cartão de crédito', date: ago(6) },
  { id: 's3', productId: 'p13', productName: 'Blazer preto', buyerId: 'u4', buyerName: 'Ana Costa', amount: 120, payment: 'Boleto', date: ago(20) },
];

export const DONATIONS = [
  { id: 'd1', donorId: 'u2', donorName: 'Maria Silva', amount: 50, payment: 'Pix', date: ago(1) },
  { id: 'd2', donorId: 'u5', donorName: 'Carlos Lima', amount: 100, payment: 'Cartão de crédito', date: ago(8) },
  { id: 'd3', donorId: 'u6', donorName: 'Anônimo', amount: 20, payment: 'Pix', date: ago(14) },
  { id: 'd4', donorId: 'u7', donorName: 'Beatriz Rocha', amount: 200, payment: 'Boleto', date: ago(40) },
];
