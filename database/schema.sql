-- ============================================================================
-- Bazar do Renascer — schema PostgreSQL para Supabase
-- ============================================================================
-- Decisões deste schema:
--   1. Autenticação no Supabase Auth (auth.users). Nenhuma senha aqui.
--   2. Row Level Security em TODAS as tabelas. Sem policy = sem acesso.
--   3. VITRINE PÚBLICA: anon lê products (link de peça compartilhável, SEO).
--      Tudo o mais (endereço, histórico, pessoas) exige login.
--   4. Cliente nunca escreve em sales/donations: só via RPC SECURITY DEFINER
--      que valida no servidor.
--   5. Papel (admin/user) não pode ser alterado pelo próprio usuário.
--   6. Fotos no Storage: leitura pública, escrita só admin.
-- Idempotente: pode rodar de novo sem quebrar.
-- ============================================================================

-- ------------------------------------------------------------------ tipos
DO $$ BEGIN
  CREATE TYPE public.user_role         AS ENUM ('admin', 'user');
  CREATE TYPE public.product_status    AS ENUM ('available', 'sold');
  CREATE TYPE public.product_category  AS ENUM ('Camisetas', 'Calças', 'Vestidos', 'Casacos', 'Calçados', 'Acessórios');
  CREATE TYPE public.product_size      AS ENUM ('PP', 'P', 'M', 'G', 'GG', 'Único');
  CREATE TYPE public.product_condition AS ENUM ('Novo', 'Seminovo', 'Usado');
  CREATE TYPE public.payment_method    AS ENUM ('Pix', 'Cartão de crédito', 'Boleto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- --------------------------------------------------------------- tabelas
-- 1:1 com auth.users. Criado por trigger no cadastro.
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  role       public.user_role NOT NULL DEFAULT 'user',
  phone      text CHECK (phone IS NULL OR char_length(phone) <= 20),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.addresses (
  user_id      uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  cep          char(8) NOT NULL CHECK (cep ~ '^\d{8}$'),
  street       text NOT NULL CHECK (char_length(street) BETWEEN 1 AND 120),
  number       text NOT NULL CHECK (char_length(number) BETWEEN 1 AND 10),
  complement   text CHECK (complement IS NULL OR char_length(complement) <= 60),
  neighborhood text NOT NULL CHECK (char_length(neighborhood) BETWEEN 1 AND 80),
  city         text NOT NULL CHECK (char_length(city) BETWEEN 1 AND 80),
  state        char(2) NOT NULL CHECK (state ~ '^[A-Z]{2}$'),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  category    public.product_category NOT NULL,
  size        public.product_size NOT NULL,
  condition   public.product_condition NOT NULL,
  price       numeric(10,2) NOT NULL CHECK (price > 0 AND price <= 100000),
  image_url   text CHECK (image_url IS NULL OR image_url ~ '^https://'),
  description text CHECK (description IS NULL OR char_length(description) <= 1000),
  status      public.product_status NOT NULL DEFAULT 'available',
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_status_idx   ON public.products (status);
CREATE INDEX IF NOT EXISTS products_category_idx ON public.products (category) WHERE status = 'available';

-- Uma venda = uma peça. N itens de um checkout compartilham order_id.
CREATE TABLE IF NOT EXISTS public.sales (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid NOT NULL,
  product_id uuid NOT NULL UNIQUE REFERENCES public.products(id),   -- peça vende uma vez
  buyer_id   uuid NOT NULL REFERENCES public.profiles(id),
  amount     numeric(10,2) NOT NULL CHECK (amount > 0),
  payment    public.payment_method NOT NULL,
  sold_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sales_buyer_idx   ON public.sales (buyer_id);
CREATE INDEX IF NOT EXISTS sales_sold_at_idx ON public.sales (sold_at DESC);
CREATE INDEX IF NOT EXISTS sales_order_idx   ON public.sales (order_id);

CREATE TABLE IF NOT EXISTS public.donations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,  -- NULL = anônimo
  donor_name text NOT NULL CHECK (char_length(donor_name) BETWEEN 1 AND 80),
  amount     numeric(10,2) NOT NULL CHECK (amount > 0 AND amount <= 100000),
  payment    public.payment_method NOT NULL,
  donated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS donations_donor_idx      ON public.donations (donor_id);
CREATE INDEX IF NOT EXISTS donations_donated_at_idx ON public.donations (donated_at DESC);

-- ---------------------------------------------------------------- helpers
-- Todas as funções fixam search_path (evita hijack de schema) e só são
-- SECURITY DEFINER quando precisam furar o RLS de forma controlada.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS profiles_updated_at  ON public.profiles;
DROP TRIGGER IF EXISTS addresses_updated_at ON public.addresses;
DROP TRIGGER IF EXISTS products_updated_at  ON public.products;
CREATE TRIGGER profiles_updated_at  BEFORE UPDATE ON public.profiles  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER products_updated_at  BEFORE UPDATE ON public.products  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cria o profile quando alguém se cadastra. Papel SEMPRE 'user' aqui;
-- admin é promovido manualmente por SQL (ver tutorial.md, passo 6).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''), split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Bloqueia troca de papel por quem não é admin (2ª barreira além do grant de coluna).
--
-- `auth.uid() IS NULL` significa que NÃO existe usuário logado na chamada:
-- SQL Editor, service_role ou migration. É por aí que o PRIMEIRO admin nasce —
-- sem essa exceção seria impossível promover ninguém (só admin promove, mas não
-- existe admin ainda).
--
-- Isso não abre porta na API pública: `anon` não tem GRANT UPDATE em profiles,
-- e todo `authenticated` tem auth.uid() preenchido, caindo na regra do is_admin().
-- Some-se a isso o GRANT de coluna, que nem inclui `role`.
CREATE OR REPLACE FUNCTION public.protect_role()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND auth.uid() IS NOT NULL
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Alteração de papel não permitida' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_protect_role ON public.profiles;
CREATE TRIGGER profiles_protect_role BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_role();

-- Peça vendida não pode ser editada nem apagada (integridade do histórico).
-- A venda em si passa: ali OLD.status ainda é 'available'.
CREATE OR REPLACE FUNCTION public.protect_sold_product()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.status = 'sold' THEN
    RAISE EXCEPTION 'Peça vendida não pode ser alterada ou removida' USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS products_protect_sold ON public.products;
CREATE TRIGGER products_protect_sold BEFORE UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.protect_sold_product();

-- ------------------------------------------------------------------- RPCs
-- checkout: compra atômica de N peças. Valida usuário, endereço e disponibilidade.
CREATE OR REPLACE FUNCTION public.checkout(product_ids uuid[], payment public.payment_method)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  uid      uuid := auth.uid();
  oid      uuid := gen_random_uuid();
  affected int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501'; END IF;
  IF product_ids IS NULL OR cardinality(product_ids) = 0 OR cardinality(product_ids) > 50 THEN
    RAISE EXCEPTION 'Carrinho inválido' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.addresses WHERE user_id = uid) THEN
    RAISE EXCEPTION 'Endereço de entrega obrigatório' USING ERRCODE = '23514';
  END IF;

  -- Trava as linhas e marca como vendidas numa instrução (sem race condition).
  WITH locked AS (
    SELECT id, price FROM public.products
    WHERE id = ANY(product_ids) AND status = 'available'
    FOR UPDATE SKIP LOCKED
  ), upd AS (
    UPDATE public.products p SET status = 'sold' FROM locked WHERE p.id = locked.id RETURNING p.id, p.price
  )
  INSERT INTO public.sales (order_id, product_id, buyer_id, amount, payment)
  SELECT oid, id, uid, price, payment FROM upd;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> cardinality(product_ids) THEN
    -- NÃO usar ERRCODE 40001/40P01 aqui: o PostgREST trata esses códigos como
    -- falha transitória e RETENTA a requisição sozinho. Como "peça vendida" é
    -- permanente, ele retentaria para sempre — a conexão pendura e vira DoS.
    -- P0001 é erro de aplicação: resposta imediata, sem retry.
    RAISE EXCEPTION 'Uma ou mais peças não estão mais disponíveis' USING ERRCODE = 'P0001';
  END IF;
  RETURN oid;
END $$;

-- donate: doação avulsa, sem endereço.
CREATE OR REPLACE FUNCTION public.donate(amount numeric, payment public.payment_method, anonymous boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE uid uuid := auth.uid(); did uuid; dname text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501'; END IF;
  IF amount IS NULL OR amount <= 0 OR amount > 100000 THEN RAISE EXCEPTION 'Valor inválido' USING ERRCODE = '22023'; END IF;
  SELECT name INTO dname FROM public.profiles WHERE id = uid;
  INSERT INTO public.donations (donor_id, donor_name, amount, payment)
  VALUES (CASE WHEN anonymous THEN NULL ELSE uid END, CASE WHEN anonymous THEN 'Anônimo' ELSE dname END, round(amount, 2), payment)
  RETURNING id INTO did;
  RETURN did;
END $$;

-- Endereço de entrega de um pedido. Só admin, e só do pedido pedido —
-- o admin não tem SELECT livre em addresses (privacidade).
CREATE OR REPLACE FUNCTION public.order_shipping(p_order_id uuid)
RETURNS TABLE (buyer_name text, cep char(8), street text, number text, complement text,
               neighborhood text, city text, state char(2))
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT pr.name, a.cep, a.street, a.number, a.complement, a.neighborhood, a.city, a.state
  FROM public.sales s
  JOIN public.profiles pr ON pr.id = s.buyer_id
  JOIN public.addresses a ON a.user_id = s.buyer_id
  WHERE s.order_id = p_order_id AND public.is_admin()
  LIMIT 1;
$$;

-- ------------------------------------------------------------------ views
-- O front consome estas views: já trazem os nomes resolvidos, sem join no cliente.
-- security_invoker = true: a view respeita o RLS de QUEM consulta, não do dono.
CREATE OR REPLACE VIEW public.sales_detail WITH (security_invoker = true) AS
  SELECT s.id, s.order_id, s.product_id, p.name AS product_name,
         s.buyer_id, pr.name AS buyer_name, s.amount, s.payment, s.sold_at AS date
  FROM public.sales s
  JOIN public.products p  ON p.id  = s.product_id
  LEFT JOIN public.profiles pr ON pr.id = s.buyer_id;

CREATE OR REPLACE VIEW public.donations_detail WITH (security_invoker = true) AS
  SELECT d.id, d.donor_id, d.donor_name, d.amount, d.payment, d.donated_at AS date
  FROM public.donations d;

-- --------------------------------------------------------------------- RLS
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
-- Sem FORCE ROW LEVEL SECURITY — de propósito.
-- FORCE submete também o DONO da tabela às policies, e é o dono que executa as
-- funções SECURITY DEFINER. Com FORCE ligado:
--   handle_new_user() não criaria o profile   -> ninguém se cadastra
--   checkout()       não gravaria a venda     -> ninguém compra
--   donate()         não gravaria a doação    -> ninguém doa
--   order_shipping() não leria o endereço     -> admin não despacha
-- O dono aqui é o papel `postgres` do Supabase, alcançável só pelo SQL Editor e
-- pela service_role — não pela API pública. `anon` e `authenticated`, que são o
-- que a internet enxerga, continuam 100% sujeitos às policies abaixo.
ALTER TABLE public.profiles  NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.addresses NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.products  NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sales     NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.donations NO FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select   ON public.profiles;
DROP POLICY IF EXISTS profiles_update   ON public.profiles;
DROP POLICY IF EXISTS addresses_own     ON public.addresses;
DROP POLICY IF EXISTS products_select   ON public.products;
DROP POLICY IF EXISTS products_insert   ON public.products;
DROP POLICY IF EXISTS products_update   ON public.products;
DROP POLICY IF EXISTS products_delete   ON public.products;
DROP POLICY IF EXISTS sales_select      ON public.sales;
DROP POLICY IF EXISTS donations_select  ON public.donations;

-- profiles: vê o próprio (admin vê todos); edita só o próprio.
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- addresses: só o dono. Nem admin lê direto — para logística existe order_shipping().
CREATE POLICY addresses_own ON public.addresses FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- products: VITRINE PÚBLICA. Qualquer visitante lê o catálogo; só admin escreve.
CREATE POLICY products_select ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY products_insert ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_admin() AND created_by = auth.uid());
CREATE POLICY products_update ON public.products FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY products_delete ON public.products FOR DELETE TO authenticated USING (public.is_admin());

-- sales / donations: só o próprio histórico ou admin.
-- Escrita SOMENTE via RPC — não existe policy de INSERT/UPDATE/DELETE de propósito.
CREATE POLICY sales_select     ON public.sales     FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR public.is_admin());
CREATE POLICY donations_select ON public.donations FOR SELECT TO authenticated USING (donor_id = auth.uid() OR public.is_admin());

-- ------------------------------------------------------------------ grants
-- Nega tudo por padrão; concede o mínimo por papel.
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated, public;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated, public;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, public;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated, public;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated, public;

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- anon: SÓ a vitrine. Nada de gente, endereço, venda ou doação.
GRANT SELECT ON public.products TO anon;

GRANT SELECT                         ON public.profiles        TO authenticated;
GRANT UPDATE (name, phone)           ON public.profiles        TO authenticated;   -- role NÃO está na lista
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products        TO authenticated;   -- RLS restringe escrita a admin
GRANT SELECT                         ON public.sales           TO authenticated;
GRANT SELECT                         ON public.donations       TO authenticated;
GRANT SELECT                         ON public.sales_detail    TO authenticated;
GRANT SELECT                         ON public.donations_detail TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin()                                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkout(uuid[], public.payment_method)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.donate(numeric, public.payment_method, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.order_shipping(uuid)                            TO authenticated;

-- ----------------------------------------------------------------- storage
-- Bucket das fotos: leitura pública (a vitrine é pública), escrita só admin.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('product-photos', 'product-photos', true, 3145728,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
ON CONFLICT (id) DO UPDATE
  SET public = true, file_size_limit = 3145728,
      allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

DROP POLICY IF EXISTS product_photos_read   ON storage.objects;
DROP POLICY IF EXISTS product_photos_insert ON storage.objects;
DROP POLICY IF EXISTS product_photos_update ON storage.objects;
DROP POLICY IF EXISTS product_photos_delete ON storage.objects;

CREATE POLICY product_photos_read   ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-photos');
CREATE POLICY product_photos_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-photos' AND public.is_admin());
CREATE POLICY product_photos_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-photos' AND public.is_admin());
CREATE POLICY product_photos_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-photos' AND public.is_admin());
