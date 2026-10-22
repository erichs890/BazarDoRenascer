-- ============================================================================
-- Migração: Pix real com confirmação manual pelo admin.
-- ============================================================================
-- Antes: "Já paguei" gravava a venda como concluída, sem conferir nada.
-- Agora: compra/doação via Pix nasce PENDENTE. A peça fica reservada (sai da
-- vitrine) até o admin confirmar o Pix no extrato — ou cancelar, e aí a peça
-- volta a ficar disponível.
-- Cartão e boleto continuam simulados e nascem como pagos.
--
-- Rode no SQL Editor. Seguro rodar mais de uma vez.
-- ============================================================================

-- 1. Status do pagamento --------------------------------------------------
-- Bloco próprio: no DO dos outros tipos, um tipo já existente aborta o bloco
-- inteiro e este nunca seria criado em um banco que já tem o schema.
DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Linhas que já existem entram como 'paid' (foram registradas como concluídas).
ALTER TABLE public.sales     ADD COLUMN IF NOT EXISTS payment_status public.payment_status NOT NULL DEFAULT 'paid';
ALTER TABLE public.sales     ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE public.sales     ADD COLUMN IF NOT EXISTS confirmed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS payment_status public.payment_status NOT NULL DEFAULT 'paid';
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS confirmed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.sales     ALTER COLUMN payment_status SET DEFAULT 'pending';
ALTER TABLE public.donations ALTER COLUMN payment_status SET DEFAULT 'pending';

-- 2. Peça vende uma vez — exceto se o pedido foi cancelado ------------------
-- O UNIQUE antigo impediria revender a peça de um Pix que nunca foi pago.
ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_product_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS sales_product_once
  ON public.sales (product_id) WHERE payment_status <> 'cancelled';

-- 3. Peça vendida continua intocável — salvo a devolução por cancelamento ---
CREATE OR REPLACE FUNCTION public.protect_sold_product()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF OLD.status = 'sold' THEN
    -- Única saída: set_order_status() cancelando um Pix não pago devolve a
    -- peça à vitrine. A flag só existe dentro da transação dessa função.
    IF TG_OP = 'UPDATE' AND NEW.status = 'available'
       AND current_setting('app.liberando_peca', true) = 'on' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Peça vendida não pode ser alterada ou removida' USING ERRCODE = '42501';
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

-- 4. Checkout: Pix nasce pendente -----------------------------------------
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
  -- Com Pix, "vendida" aqui significa RESERVADA: sai da vitrine na hora, para
  -- ninguém pagar por uma peça que outra pessoa já está pagando.
  WITH locked AS (
    SELECT id, price FROM public.products
    WHERE id = ANY(product_ids) AND status = 'available'
    FOR UPDATE SKIP LOCKED
  ), upd AS (
    UPDATE public.products p SET status = 'sold' FROM locked WHERE p.id = locked.id RETURNING p.id, p.price
  )
  INSERT INTO public.sales (order_id, product_id, buyer_id, amount, payment, payment_status)
  SELECT oid, id, uid, price, payment,
         CASE WHEN payment = 'Pix' THEN 'pending'::public.payment_status ELSE 'paid' END
  FROM upd;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> cardinality(product_ids) THEN
    -- NÃO usar ERRCODE 40001/40P01: o PostgREST retentaria para sempre.
    RAISE EXCEPTION 'Uma ou mais peças não estão mais disponíveis' USING ERRCODE = 'P0001';
  END IF;
  RETURN oid;
END $$;

-- 5. Doação: Pix nasce pendente -------------------------------------------
CREATE OR REPLACE FUNCTION public.donate(amount numeric, payment public.payment_method, anonymous boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE uid uuid := auth.uid(); did uuid; dname text;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501'; END IF;
  IF amount IS NULL OR amount <= 0 OR amount > 100000 THEN RAISE EXCEPTION 'Valor inválido' USING ERRCODE = '22023'; END IF;
  SELECT name INTO dname FROM public.profiles WHERE id = uid;
  INSERT INTO public.donations (donor_id, donor_name, amount, payment, payment_status)
  VALUES (CASE WHEN anonymous THEN NULL ELSE uid END,
          CASE WHEN anonymous THEN 'Anônimo' ELSE dname END,
          round(amount, 2), payment,
          CASE WHEN payment = 'Pix' THEN 'pending'::public.payment_status ELSE 'paid' END)
  RETURNING id INTO did;
  RETURN did;
END $$;

-- 6. Admin confirma ou cancela --------------------------------------------
CREATE OR REPLACE FUNCTION public.set_order_status(p_order_id uuid, p_status public.payment_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE n int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores' USING ERRCODE = '42501'; END IF;
  IF p_status = 'pending' THEN RAISE EXCEPTION 'Status inválido' USING ERRCODE = '22023'; END IF;

  UPDATE public.sales
     SET payment_status = p_status, confirmed_at = now(), confirmed_by = auth.uid()
   WHERE order_id = p_order_id AND payment_status = 'pending';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RAISE EXCEPTION 'Pedido não encontrado ou já resolvido' USING ERRCODE = 'P0001'; END IF;

  -- Pix não pago: as peças voltam para a vitrine.
  IF p_status = 'cancelled' THEN
    PERFORM set_config('app.liberando_peca', 'on', true);  -- true = só nesta transação
    UPDATE public.products SET status = 'available'
     WHERE id IN (SELECT product_id FROM public.sales WHERE order_id = p_order_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_donation_status(p_donation_id uuid, p_status public.payment_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE n int;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores' USING ERRCODE = '42501'; END IF;
  IF p_status = 'pending' THEN RAISE EXCEPTION 'Status inválido' USING ERRCODE = '22023'; END IF;

  UPDATE public.donations
     SET payment_status = p_status, confirmed_at = now(), confirmed_by = auth.uid()
   WHERE id = p_donation_id AND payment_status = 'pending';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RAISE EXCEPTION 'Pedido não encontrado ou já resolvido' USING ERRCODE = 'P0001'; END IF;
END $$;

-- 7. Views expõem o status (coluna nova no fim: exigência do CREATE OR REPLACE)
CREATE OR REPLACE VIEW public.sales_detail WITH (security_invoker = true) AS
  SELECT s.id, s.order_id, s.product_id, p.name AS product_name,
         s.buyer_id, pr.name AS buyer_name, s.amount, s.payment, s.sold_at AS date,
         s.payment_status
  FROM public.sales s
  JOIN public.products p  ON p.id  = s.product_id
  LEFT JOIN public.profiles pr ON pr.id = s.buyer_id;

CREATE OR REPLACE VIEW public.donations_detail WITH (security_invoker = true) AS
  SELECT d.id, d.donor_id, d.donor_name, d.amount, d.payment, d.donated_at AS date,
         d.payment_status
  FROM public.donations d;

-- 8. Permissões ----------------------------------------------------------
REVOKE ALL ON FUNCTION public.set_order_status(uuid, public.payment_status)    FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.set_donation_status(uuid, public.payment_status) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.set_order_status(uuid, public.payment_status)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_donation_status(uuid, public.payment_status) TO authenticated;
GRANT SELECT ON public.sales_detail, public.donations_detail TO authenticated;
