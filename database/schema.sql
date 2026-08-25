-- ============================================================================
-- Bazar do Renascer — schema PostgreSQL para Supabase (segurança máxima)
-- ============================================================================
-- Princípios:
--   1. Autenticação fica no Supabase Auth (auth.users). Nenhuma senha aqui.
--   2. Row Level Security em TODAS as tabelas. Sem policy = sem acesso.
--   3. Cliente (app) nunca escreve em sales/donations diretamente: só via RPC
--      SECURITY DEFINER que valida tudo no servidor.
--   4. Papel (admin/user) não pode ser alterado pelo próprio usuário.
--   5. anon (não logado) não vê nada. authenticated vê o mínimo necessário.
-- ============================================================================

-- ------------------------------------------------------------------ tipos
CREATE TYPE public.user_role         AS ENUM ('admin', 'user');
CREATE TYPE public.product_status    AS ENUM ('available', 'sold');
CREATE TYPE public.product_category  AS ENUM ('Camisetas', 'Calças', 'Vestidos', 'Casacos', 'Calçados', 'Acessórios');
CREATE TYPE public.product_size      AS ENUM ('PP', 'P', 'M', 'G', 'GG', 'Único');
CREATE TYPE public.product_condition AS ENUM ('Novo', 'Seminovo', 'Usado');
CREATE TYPE public.payment_method    AS ENUM ('Pix', 'Cartão de crédito', 'Boleto');

-- --------------------------------------------------------------- profiles
-- 1:1 com auth.users. Criado automaticamente por trigger no cadastro.
CREATE TABLE public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 80),
  role       public.user_role NOT NULL DEFAULT 'user',
  phone      text CHECK (phone IS NULL OR char_length(phone) <= 20),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.addresses (
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

CREATE TABLE public.products (
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
CREATE INDEX products_status_idx   ON public.products (status);
CREATE INDEX products_category_idx ON public.products (category) WHERE status = 'available';

-- Uma venda = uma peça. N itens de um checkout compartilham order_id.
CREATE TABLE public.sales (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid NOT NULL,
  product_id uuid NOT NULL UNIQUE REFERENCES public.products(id),   -- peça vende uma vez
  buyer_id   uuid NOT NULL REFERENCES public.profiles(id),
  amount     numeric(10,2) NOT NULL CHECK (amount > 0),
  payment    public.payment_method NOT NULL,
  sold_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sales_buyer_idx   ON public.sales (buyer_id);
CREATE INDEX sales_sold_at_idx ON public.sales (sold_at DESC);

CREATE TABLE public.donations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,  -- NULL = anônimo
  donor_name text NOT NULL CHECK (char_length(donor_name) BETWEEN 1 AND 80),
  amount     numeric(10,2) NOT NULL CHECK (amount > 0 AND amount <= 100000),
  payment    public.payment_method NOT NULL,
  donated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX donations_donor_idx      ON public.donations (donor_id);
CREATE INDEX donations_donated_at_idx ON public.donations (donated_at DESC);

-- ---------------------------------------------------------------- helpers
-- Todas as funções fixam search_path (evita hijack de schema) e são
-- SECURITY DEFINER só quando precisam furar o RLS de forma controlada.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER profiles_updated_at  BEFORE UPDATE ON public.profiles  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER products_updated_at  BEFORE UPDATE ON public.products  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Cria o profile quando um usuário se cadastra no Supabase Auth.
-- Papel SEMPRE 'user' aqui; admin é promovido manualmente (ver tutorial.md).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'name'), ''), split_part(NEW.email, '@', 1)));
  RETURN NEW;
END $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Bloqueia troca de papel por quem não é admin (mesmo que a policy deixasse passar).
CREATE OR REPLACE FUNCTION public.protect_role()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Alteração de papel não permitida' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER profiles_protect_role BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_role();

-- Peças vendidas não podem ser apagadas nem editadas (integridade do histórico).
CREATE OR REPLACE FUNCTION public.protect_sold_product()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.status = 'sold' THEN
    RAISE EXCEPTION 'Peça vendida não pode ser alterada ou removida' USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER products_protect_sold BEFORE UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.protect_sold_product();

-- ------------------------------------------------------------------- RPCs
-- checkout: compra atômica de N peças. Valida usuário, endereço, disponibilidade.
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

  -- Trava as linhas e marca como vendidas numa única instrução (sem race condition).
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
    RAISE EXCEPTION 'Uma ou mais peças não estão mais disponíveis' USING ERRCODE = '40001';
  END IF;
  RETURN oid;
END $$;

-- donate: doação avulsa, sem endereço. Valor limitado.
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

-- Dashboard do admin (só admin enxerga; demais recebem zero linhas).
CREATE OR REPLACE FUNCTION public.monthly_summary()
RETURNS TABLE (month date, sales_total numeric, donations_total numeric, total numeric, sales_count bigint, donations_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT t.month::date,
         COALESCE(SUM(s), 0), COALESCE(SUM(d), 0), COALESCE(SUM(s), 0) + COALESCE(SUM(d), 0),
         COALESCE(SUM(sc), 0), COALESCE(SUM(dc), 0)
  FROM (
    SELECT date_trunc('month', sold_at)    AS month, SUM(amount) s, NULL::numeric d, COUNT(*) sc, NULL::bigint dc FROM public.sales     GROUP BY 1
    UNION ALL
    SELECT date_trunc('month', donated_at), NULL, SUM(amount), NULL, COUNT(*) FROM public.donations GROUP BY 1
  ) t
  WHERE public.is_admin()
  GROUP BY t.month ORDER BY t.month DESC;
$$;

-- --------------------------------------------------------------------- RLS
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
-- FORCE: nem o dono das tabelas ignora o RLS.
ALTER TABLE public.profiles  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.addresses FORCE ROW LEVEL SECURITY;
ALTER TABLE public.products  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sales     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.donations FORCE ROW LEVEL SECURITY;

-- profiles: vê o próprio (admin vê todos); edita só o próprio (papel protegido por trigger + grant de coluna).
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- addresses: só o dono. Admin NÃO lê endereços (privacidade); entrega usa RPC/relatório separado se necessário.
CREATE POLICY addresses_own ON public.addresses FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- products: qualquer logado vê o catálogo; só admin altera.
CREATE POLICY products_select ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY products_insert ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_admin() AND created_by = auth.uid());
CREATE POLICY products_update ON public.products FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY products_delete ON public.products FOR DELETE TO authenticated USING (public.is_admin());

-- sales / donations: leitura do próprio histórico ou admin; escrita SOMENTE via RPC (nenhuma policy de INSERT/UPDATE/DELETE).
CREATE POLICY sales_select     ON public.sales     FOR SELECT TO authenticated USING (buyer_id = auth.uid() OR public.is_admin());
CREATE POLICY donations_select ON public.donations FOR SELECT TO authenticated USING (donor_id = auth.uid() OR public.is_admin());

-- ------------------------------------------------------------------ grants
-- Nega tudo por padrão; concede o mínimo por papel.
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated, public;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated, public;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, public;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated, public;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated, public;

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT                         ON public.profiles  TO authenticated;
GRANT UPDATE (name, phone)           ON public.profiles  TO authenticated;   -- role NÃO está na lista
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products  TO authenticated;   -- RLS restringe escrita a admin
GRANT SELECT                         ON public.sales     TO authenticated;
GRANT SELECT                         ON public.donations TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin()                                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkout(uuid[], public.payment_method)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.donate(numeric, public.payment_method, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.monthly_summary()                            TO authenticated;
-- anon (não logado) não recebe NADA: vitrine exige login.
