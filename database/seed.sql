-- ============================================================================
-- Seed de demonstração — rode DEPOIS de schema.sql.
-- ============================================================================
-- Cria só peças no catálogo. Usuários NÃO são criados aqui: senha é assunto do
-- Supabase Auth, e inserir direto em auth.users gera conta quebrada.
-- Para ter contas de teste, cadastre pelo próprio app (/cadastro) e depois
-- promova uma a admin — passo 6 do tutorial.md.
--
-- As fotos apontam para picsum.photos só para o catálogo não nascer vazio.
-- Ao cadastrar uma peça pelo app, a foto vai para o bucket product-photos.
-- Idempotente: roda de novo sem duplicar.
-- ============================================================================

INSERT INTO public.products (name, category, size, condition, price, image_url, description, status, created_at)
SELECT * FROM (VALUES
  ('Camiseta básica branca', 'Camisetas'::public.product_category, 'M'::public.product_size,  'Seminovo'::public.product_condition,  15.00, 'https://picsum.photos/seed/shirt1/600/600',   'Camiseta de algodão, sem manchas, pouco uso.',   'available'::public.product_status, now() - interval '20 days'),
  ('Calça jeans azul',       'Calças',     'G',  'Usado',    35.00, 'https://picsum.photos/seed/jeans2/600/600',   'Jeans reto, com leve desgaste na barra.',        'available', now() - interval '18 days'),
  ('Vestido floral',         'Vestidos',   'P',  'Novo',     60.00, 'https://picsum.photos/seed/dress3/600/600',   'Vestido midi com etiqueta, nunca usado.',        'available', now() - interval '15 days'),
  ('Jaqueta corta-vento',    'Casacos',    'G',  'Seminovo', 80.00, 'https://picsum.photos/seed/jacket4/600/600',  'Jaqueta impermeável preta, zíper perfeito.',     'available', now() - interval '12 days'),
  ('Tênis esportivo',        'Calçados',   'M',  'Usado',    45.00, 'https://picsum.photos/seed/shoes5/600/600',   'Tênis de corrida nº 39, sola em bom estado.',    'available', now() - interval '10 days'),
  ('Bolsa de couro',         'Acessórios', 'Único', 'Seminovo', 55.00, 'https://picsum.photos/seed/bag6/600/600',  'Bolsa marrom, alça ajustável.',                  'available', now() - interval '9 days'),
  ('Moletom cinza',          'Casacos',    'M',  'Seminovo', 40.00, 'https://picsum.photos/seed/hoodie7/600/600',  'Moletom com capuz, muito confortável.',          'available', now() - interval '7 days'),
  ('Camisa social azul',     'Camisetas',  'G',  'Novo',     50.00, 'https://picsum.photos/seed/shirt8/600/600',   'Camisa de manga longa, ideal para trabalho.',    'available', now() - interval '5 days'),
  ('Saia plissada',          'Vestidos',   'M',  'Seminovo', 30.00, 'https://picsum.photos/seed/skirt9/600/600',   'Saia preta na altura do joelho.',                'available', now() - interval '4 days'),
  ('Boné vintage',           'Acessórios', 'Único', 'Usado', 12.00, 'https://picsum.photos/seed/cap10/600/600',    'Boné aba curva, cor bege.',                      'available', now() - interval '3 days')
) AS v(name, category, size, condition, price, image_url, description, status, created_at)
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE public.products.name = v.name);
