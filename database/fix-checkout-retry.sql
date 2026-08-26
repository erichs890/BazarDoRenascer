-- ============================================================================
-- Correção crítica: checkout() pendurava a conexão em peça já vendida.
-- ============================================================================
-- ERRCODE 40001 (serialization_failure) faz o PostgREST RETENTAR a requisição
-- sozinho, achando que é falha transitória. Como "peça vendida" é permanente,
-- ele retentava para sempre e a chamada nunca respondia — vetor de DoS.
-- P0001 é erro de aplicação: resposta imediata, sem retry.
--
-- Rode no SQL Editor. Seguro rodar mais de uma vez.
-- ============================================================================

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

GRANT EXECUTE ON FUNCTION public.checkout(uuid[], public.payment_method) TO authenticated;
