-- ============================================================================
-- Migração: Pix e cartão pelo Mercado Pago, com confirmação automática.
-- ============================================================================
-- Pré-requisito: migracao-pix.sql (ou um schema.sql recente).
--
-- O que muda:
--   * cada pedido/doação Pix ganha uma cobrança própria no Mercado Pago
--     (provider_ref = id do pagamento lá);
--   * o webhook marca como pago sozinho — sem o admin conferir extrato;
--   * Pix não pago expira e a peça volta para a vitrine (pg_cron);
--   * cartão também nasce pendente: só vira pago quando o Mercado Pago aprova
--     (antes, checkout com cartão gravava "pago" direto — qualquer um podia
--     chamar a RPC e levar a peça sem pagar);
--   * Checkout Pro (página do Mercado Pago): o pedido guarda a preferência
--     ("pref:<id>") até um pagamento ser aprovado — tentativas recusadas não
--     cancelam, porque a pessoa pode tentar de novo na mesma página;
--   * set_order_status/set_donation_status continuam: o admin ainda pode
--     resolver na mão qualquer caso.
--
-- As funções gateway_* só são executáveis pela service_role, ou seja, pelas
-- Edge Functions. Nada aqui fica exposto para anon/authenticated.
--
-- Rode no SQL Editor. Seguro rodar mais de uma vez.
-- ============================================================================

-- 1. Referência do pagamento no Mercado Pago --------------------------------
-- Em sales, todas as linhas de um pedido recebem o mesmo valor.
ALTER TABLE public.sales     ADD COLUMN IF NOT EXISTS provider_ref text;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS provider_ref text;
CREATE INDEX IF NOT EXISTS sales_provider_ref_idx     ON public.sales (provider_ref)     WHERE provider_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS donations_provider_ref_idx ON public.donations (provider_ref) WHERE provider_ref IS NOT NULL;
-- Checkout Pro: pagamento em andamento (boleto emitido, cartão em análise)
-- estende o prazo antes de o pedido abandonado ser cancelado.
ALTER TABLE public.sales     ADD COLUMN IF NOT EXISTS provider_hold_until timestamptz;
ALTER TABLE public.donations ADD COLUMN IF NOT EXISTS provider_hold_until timestamptz;

-- 2. Núcleo de confirmação/cancelamento, compartilhado ---------------------
-- Admin (set_*_status), webhook (gateway_settle) e expiração (cancel_stale_pix)
-- passam todos por aqui: a regra de devolver a peça vive num lugar só.
-- p_by NULL = resolvido pelo sistema, não por uma pessoa.
CREATE OR REPLACE FUNCTION public.settle_order(p_order_id uuid, p_status public.payment_status, p_by uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE n int;
BEGIN
  IF p_status = 'pending' THEN RAISE EXCEPTION 'Status inválido' USING ERRCODE = '22023'; END IF;

  UPDATE public.sales
     SET payment_status = p_status, confirmed_at = now(), confirmed_by = p_by
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

CREATE OR REPLACE FUNCTION public.settle_donation(p_donation_id uuid, p_status public.payment_status, p_by uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE n int;
BEGIN
  IF p_status = 'pending' THEN RAISE EXCEPTION 'Status inválido' USING ERRCODE = '22023'; END IF;

  UPDATE public.donations
     SET payment_status = p_status, confirmed_at = now(), confirmed_by = p_by
   WHERE id = p_donation_id AND payment_status = 'pending';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN RAISE EXCEPTION 'Pedido não encontrado ou já resolvido' USING ERRCODE = 'P0001'; END IF;
END $$;

-- Mesma assinatura e mesmo comportamento de antes, agora delegando ao núcleo.
CREATE OR REPLACE FUNCTION public.set_order_status(p_order_id uuid, p_status public.payment_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores' USING ERRCODE = '42501'; END IF;
  PERFORM public.settle_order(p_order_id, p_status, auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.set_donation_status(p_donation_id uuid, p_status public.payment_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Apenas administradores' USING ERRCODE = '42501'; END IF;
  PERFORM public.settle_donation(p_donation_id, p_status, auth.uid());
END $$;

-- 3. Funções do gateway (só service_role) ----------------------------------
-- p_kind: 'sale' (p_ref = order_id) ou 'donation' (p_ref = donations.id).

-- Valor a cobrar, lido do banco: o front nunca decide quanto se paga.
-- NULL = não existe pedido pendente com essa referência.
CREATE OR REPLACE FUNCTION public.gateway_amount(p_kind text, p_ref uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp AS $$
  SELECT CASE p_kind
    WHEN 'sale' THEN (SELECT sum(amount) FROM public.sales
                       WHERE order_id = p_ref AND payment_status = 'pending')
    WHEN 'donation' THEN (SELECT amount FROM public.donations
                           WHERE id = p_ref AND payment_status = 'pending')
  END
$$;

CREATE OR REPLACE FUNCTION public.gateway_attach(p_kind text, p_ref uuid, p_provider_ref text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF p_kind = 'sale' THEN
    UPDATE public.sales SET provider_ref = p_provider_ref
     WHERE order_id = p_ref AND payment_status = 'pending';
  ELSIF p_kind = 'donation' THEN
    UPDATE public.donations SET provider_ref = p_provider_ref
     WHERE id = p_ref AND payment_status = 'pending';
  ELSE
    RAISE EXCEPTION 'Tipo inválido' USING ERRCODE = '22023';
  END IF;
END $$;

-- Checkout Pro: pagamento em andamento (boleto emitido, Pix gerado, cartão em
-- análise) segura o pedido até p_until. Só estende, nunca encurta.
CREATE OR REPLACE FUNCTION public.gateway_hold(p_kind text, p_ref uuid, p_until timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF p_kind = 'sale' THEN
    UPDATE public.sales SET provider_hold_until = greatest(provider_hold_until, p_until)
     WHERE order_id = p_ref AND payment_status = 'pending' AND provider_ref LIKE 'pref:%';
  ELSIF p_kind = 'donation' THEN
    UPDATE public.donations SET provider_hold_until = greatest(provider_hold_until, p_until)
     WHERE id = p_ref AND payment_status = 'pending' AND provider_ref LIKE 'pref:%';
  END IF;
END $$;

-- Chamado pelo webhook com o status que o PRÓPRIO Mercado Pago informou
-- (a Edge Function consulta a API; o corpo da notificação não é confiável).
-- Devolve um resultado em vez de levantar erro: o webhook precisa responder
-- 200 para casos já resolvidos, senão o Mercado Pago reenvia por horas.
--   ok                 resolvido agora
--   already            já estava resolvido (notificação repetida)
--   unknown            referência inexistente
--   ref_mismatch       o pagamento não é o que foi gerado para este pedido
--   amount_mismatch    valor pago diferente do devido — não confirma
--   paid_after_cancel  pagou um pedido já cancelado: precisa de estorno manual
--   ignored            Checkout Pro: tentativa recusada, o pedido segue aberto
CREATE OR REPLACE FUNCTION public.gateway_settle(
  p_kind text, p_ref uuid, p_provider_ref text, p_status public.payment_status, p_amount numeric
) RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  cur_ref    text;
  cur_status public.payment_status;
  expected   numeric;
BEGIN
  IF p_status = 'pending' THEN RAISE EXCEPTION 'Status inválido' USING ERRCODE = '22023'; END IF;

  IF p_kind = 'sale' THEN
    SELECT provider_ref, payment_status INTO cur_ref, cur_status
      FROM public.sales WHERE order_id = p_ref LIMIT 1;
    SELECT sum(amount) INTO expected FROM public.sales WHERE order_id = p_ref;
  ELSIF p_kind = 'donation' THEN
    SELECT provider_ref, payment_status, amount INTO cur_ref, cur_status, expected
      FROM public.donations WHERE id = p_ref;
  ELSE
    RETURN 'unknown';
  END IF;

  IF NOT FOUND OR cur_status IS NULL THEN RETURN 'unknown'; END IF;

  -- Checkout Pro: o id do pagamento só nasce na página do Mercado Pago, então
  -- vale qualquer pagamento com esta external_reference. Recusa não cancela:
  -- a pessoa pode tentar outro cartão ali mesmo; o abandono é tratado pela
  -- expiração. Aprovado, o pedido passa a apontar para o pagamento.
  IF cur_ref LIKE 'pref:%' AND cur_status = 'pending' THEN
    IF p_status = 'cancelled' THEN RETURN 'ignored'; END IF;
    IF round(p_amount, 2) <> round(expected, 2) THEN RETURN 'amount_mismatch'; END IF;
    IF p_kind = 'sale' THEN
      UPDATE public.sales SET provider_ref = p_provider_ref WHERE order_id = p_ref;
      PERFORM public.settle_order(p_ref, 'paid', NULL);
    ELSE
      UPDATE public.donations SET provider_ref = p_provider_ref WHERE id = p_ref;
      PERFORM public.settle_donation(p_ref, 'paid', NULL);
    END IF;
    RETURN 'ok';
  END IF;
  IF cur_ref LIKE 'pref:%' THEN  -- já resolvido (expirou ou o admin decidiu)
    IF cur_status = 'cancelled' AND p_status = 'paid' THEN RETURN 'paid_after_cancel'; END IF;
    RETURN 'already';
  END IF;

  IF cur_ref IS DISTINCT FROM p_provider_ref THEN RETURN 'ref_mismatch'; END IF;

  IF cur_status <> 'pending' THEN
    IF cur_status = 'cancelled' AND p_status = 'paid' THEN RETURN 'paid_after_cancel'; END IF;
    RETURN 'already';
  END IF;

  IF p_status = 'paid' AND round(p_amount, 2) <> round(expected, 2) THEN RETURN 'amount_mismatch'; END IF;

  IF p_kind = 'sale' THEN
    PERFORM public.settle_order(p_ref, p_status, NULL);
  ELSE
    PERFORM public.settle_donation(p_ref, p_status, NULL);
  END IF;
  RETURN 'ok';
END $$;

-- 4. Expiração ------------------------------------------------------------
-- O Pix do Mercado Pago vence em 30 min (a Edge Function define isso) e o
-- próprio Mercado Pago avisa o cancelamento pelo webhook. Esta função é a
-- rede de segurança caso o aviso se perca: cancela cobranças do gateway
-- pendentes há mais de 2 h e devolve as peças.
-- Pix estático (provider_ref NULL) fica de fora: esse depende do admin
-- conferir o extrato, e pode levar dias. Cartão também fica de fora: em
-- análise antifraude ele pode levar até 2 dias, e quem resolve é o webhook.
CREATE OR REPLACE FUNCTION public.cancel_stale_pix()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT DISTINCT order_id FROM public.sales
            WHERE payment_status = 'pending' AND provider_ref IS NOT NULL AND payment = 'Pix'
              AND provider_ref NOT LIKE 'pref:%'
              AND sold_at < now() - interval '2 hours' LOOP
    PERFORM public.settle_order(r.order_id, 'cancelled', NULL);
    n := n + 1;
  END LOOP;
  FOR r IN SELECT id FROM public.donations
            WHERE payment_status = 'pending' AND provider_ref IS NOT NULL AND payment = 'Pix'
              AND provider_ref NOT LIKE 'pref:%'
              AND donated_at < now() - interval '2 hours' LOOP
    PERFORM public.settle_donation(r.id, 'cancelled', NULL);
    n := n + 1;
  END LOOP;
  -- Checkout Pro: abandonado há 2 h, ou com o prazo do pagamento em andamento
  -- vencido (qualquer forma de pagamento).
  FOR r IN SELECT DISTINCT order_id FROM public.sales
            WHERE payment_status = 'pending' AND provider_ref LIKE 'pref:%'
              AND coalesce(provider_hold_until, sold_at + interval '2 hours') < now() LOOP
    PERFORM public.settle_order(r.order_id, 'cancelled', NULL);
    n := n + 1;
  END LOOP;
  FOR r IN SELECT id FROM public.donations
            WHERE payment_status = 'pending' AND provider_ref LIKE 'pref:%'
              AND coalesce(provider_hold_until, donated_at + interval '2 hours') < now() LOOP
    PERFORM public.settle_donation(r.id, 'cancelled', NULL);
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

-- 4b. Todo pedido nasce pendente --------------------------------------------
-- Com o gateway, quem diz "pago" é o Mercado Pago (webhook ou mp-card), nunca
-- a RPC chamada pelo navegador. Mesmas funções de schema.sql, mudando só o
-- status inicial. O boleto continua simulado: o app o esconde quando o
-- gateway está ligado, e se alguém chamar a RPC direto ele fica pendente até
-- o admin resolver.
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

  -- "sold" aqui significa RESERVADA até o pagamento resolver.
  WITH locked AS (
    SELECT id, price FROM public.products
    WHERE id = ANY(product_ids) AND status = 'available'
    FOR UPDATE SKIP LOCKED
  ), upd AS (
    UPDATE public.products p SET status = 'sold' FROM locked WHERE p.id = locked.id RETURNING p.id, p.price
  )
  INSERT INTO public.sales (order_id, product_id, buyer_id, amount, payment, payment_status)
  SELECT oid, id, uid, price, payment, 'pending'::public.payment_status FROM upd;

  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> cardinality(product_ids) THEN
    -- NÃO usar ERRCODE 40001/40P01: o PostgREST retentaria para sempre.
    RAISE EXCEPTION 'Uma ou mais peças não estão mais disponíveis' USING ERRCODE = 'P0001';
  END IF;
  RETURN oid;
END $$;

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
          round(amount, 2), payment, 'pending'::public.payment_status)
  RETURNING id INTO did;
  RETURN did;
END $$;

-- 5. Permissões -----------------------------------------------------------
-- Núcleo e gateway: ninguém da API pública executa. Só a service_role.
REVOKE ALL ON FUNCTION public.settle_order(uuid, public.payment_status, uuid)    FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.settle_donation(uuid, public.payment_status, uuid) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.gateway_amount(text, uuid)                         FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.gateway_attach(text, uuid, text)                   FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.gateway_hold(text, uuid, timestamptz)              FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.gateway_settle(text, uuid, text, public.payment_status, numeric) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.cancel_stale_pix()                                 FROM anon, authenticated, public;

GRANT EXECUTE ON FUNCTION public.gateway_amount(text, uuid)                         TO service_role;
GRANT EXECUTE ON FUNCTION public.gateway_attach(text, uuid, text)                   TO service_role;
GRANT EXECUTE ON FUNCTION public.gateway_hold(text, uuid, timestamptz)              TO service_role;
GRANT EXECUTE ON FUNCTION public.gateway_settle(text, uuid, text, public.payment_status, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_stale_pix()                                 TO service_role;

-- set_*_status, checkout e donate foram recriadas: reafirma o grant de antes.
GRANT EXECUTE ON FUNCTION public.set_order_status(uuid, public.payment_status)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_donation_status(uuid, public.payment_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkout(uuid[], public.payment_method)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.donate(numeric, public.payment_method, boolean) TO authenticated;

-- 6. Agendamento da expiração (pg_cron) -----------------------------------
-- Se a extensão não estiver disponível, o resto da migração já valeu; ative
-- em Database → Extensions → pg_cron e rode só este bloco de novo.
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.schedule('bazar-cancela-pix-vencido', '*/15 * * * *', 'SELECT public.cancel_stale_pix()');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron indisponível (%). Ative em Database → Extensions e rode este bloco de novo.', SQLERRM;
END $$;
