-- Dados de demonstração. Rode DEPOIS de schema.sql e DEPOIS de criar os usuários
-- demo no Supabase Auth (ver tutorial.md, passo 5):
--   admin@bazar.com  (senha admin123)
--   maria@email.com  (senha maria123)
-- Este script localiza os usuários pelo e-mail; se não existirem, vendas/doações são puladas.

DO $$
DECLARE
  admin_id uuid; maria_id uuid;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@bazar.com';
  SELECT id INTO maria_id FROM auth.users WHERE email = 'maria@email.com';

  -- Promove o admin (única forma de virar admin: SQL/painel, nunca pelo app).
  IF admin_id IS NOT NULL THEN
    UPDATE public.profiles SET role = 'admin', name = 'Administrador', phone = '(11) 99999-0000' WHERE id = admin_id;
  END IF;
  IF maria_id IS NOT NULL THEN
    UPDATE public.profiles SET name = 'Maria Silva', phone = '(11) 98888-1111' WHERE id = maria_id;
  END IF;

  INSERT INTO public.products (id, name, category, size, condition, price, image_url, description, created_by, created_at) VALUES
    ('00000000-0000-0000-0000-0000000000a1', 'Camiseta básica branca', 'Camisetas',  'M',     'Seminovo', 15,  'https://picsum.photos/seed/shirt1/400/400',   'Camiseta de algodão, sem manchas, pouco uso.', admin_id, now() - interval '20 days'),
    ('00000000-0000-0000-0000-0000000000a2', 'Calça jeans azul',       'Calças',     'G',     'Usado',    35,  'https://picsum.photos/seed/jeans2/400/400',   'Jeans reto, com leve desgaste na barra.',      admin_id, now() - interval '18 days'),
    ('00000000-0000-0000-0000-0000000000a3', 'Vestido floral',         'Vestidos',   'P',     'Novo',     60,  'https://picsum.photos/seed/dress3/400/400',   'Vestido midi com etiqueta, nunca usado.',      admin_id, now() - interval '15 days'),
    ('00000000-0000-0000-0000-0000000000a4', 'Jaqueta corta-vento',    'Casacos',    'G',     'Seminovo', 80,  'https://picsum.photos/seed/jacket4/400/400',  'Jaqueta impermeável preta, zíper perfeito.',   admin_id, now() - interval '12 days'),
    ('00000000-0000-0000-0000-0000000000a5', 'Tênis esportivo',        'Calçados',   'M',     'Usado',    45,  'https://picsum.photos/seed/shoes5/400/400',   'Tênis de corrida nº 39, sola em bom estado.',  admin_id, now() - interval '10 days'),
    ('00000000-0000-0000-0000-0000000000a6', 'Bolsa de couro',         'Acessórios', 'Único', 'Seminovo', 55,  'https://picsum.photos/seed/bag6/400/400',     'Bolsa marrom, alça ajustável.',                admin_id, now() - interval '9 days'),
    ('00000000-0000-0000-0000-0000000000a7', 'Moletom cinza',          'Casacos',    'M',     'Seminovo', 40,  'https://picsum.photos/seed/hoodie7/400/400',  'Moletom com capuz, muito confortável.',        admin_id, now() - interval '7 days'),
    ('00000000-0000-0000-0000-0000000000a8', 'Camisa social azul',     'Camisetas',  'G',     'Novo',     50,  'https://picsum.photos/seed/shirt8/400/400',   'Camisa de manga longa, ideal para trabalho.',  admin_id, now() - interval '5 days'),
    ('00000000-0000-0000-0000-0000000000a9', 'Saia plissada',          'Vestidos',   'M',     'Seminovo', 30,  'https://picsum.photos/seed/skirt9/400/400',   'Saia preta na altura do joelho.',              admin_id, now() - interval '4 days'),
    ('00000000-0000-0000-0000-0000000000b0', 'Boné vintage',           'Acessórios', 'Único', 'Usado',    12,  'https://picsum.photos/seed/cap10/400/400',    'Boné aba curva, cor bege.',                    admin_id, now() - interval '3 days'),
    ('00000000-0000-0000-0000-0000000000b1', 'Camiseta estampada',     'Camisetas',  'P',     'Usado',    10,  'https://picsum.photos/seed/tee11/400/400',    'Estampa de banda de rock.',                    admin_id, now() - interval '30 days'),
    ('00000000-0000-0000-0000-0000000000b2', 'Sandália de couro',      'Calçados',   'P',     'Seminovo', 38,  'https://picsum.photos/seed/sandal12/400/400', 'Sandália rasteira caramelo nº 37.',            admin_id, now() - interval '28 days'),
    ('00000000-0000-0000-0000-0000000000b3', 'Blazer preto',           'Casacos',    'M',     'Novo',     120, 'https://picsum.photos/seed/blazer13/400/400', 'Blazer alfaiataria, com etiqueta.',            admin_id, now() - interval '25 days');

  -- Histórico demo (inserção direta só funciona aqui, no SQL Editor, com papel postgres).
  IF maria_id IS NOT NULL THEN
    UPDATE public.products SET status = 'sold' WHERE id IN ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000b3');
    INSERT INTO public.sales (order_id, product_id, buyer_id, amount, payment, sold_at) VALUES
      (gen_random_uuid(), '00000000-0000-0000-0000-0000000000b1', maria_id, 10,  'Pix',               now() - interval '2 days'),
      (gen_random_uuid(), '00000000-0000-0000-0000-0000000000b2', maria_id, 38,  'Cartão de crédito', now() - interval '6 days'),
      (gen_random_uuid(), '00000000-0000-0000-0000-0000000000b3', maria_id, 120, 'Boleto',            now() - interval '20 days');
    INSERT INTO public.donations (donor_id, donor_name, amount, payment, donated_at) VALUES
      (maria_id, 'Maria Silva', 50, 'Pix', now() - interval '1 day');
  END IF;

  INSERT INTO public.donations (donor_id, donor_name, amount, payment, donated_at) VALUES
    (NULL, 'Carlos Lima',   100, 'Cartão de crédito', now() - interval '8 days'),
    (NULL, 'Anônimo',       20,  'Pix',               now() - interval '14 days'),
    (NULL, 'Beatriz Rocha', 200, 'Boleto',            now() - interval '40 days');
END $$;
