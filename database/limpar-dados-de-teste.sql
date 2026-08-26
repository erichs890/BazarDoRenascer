-- ============================================================================
-- Limpeza dos dados de teste criados na verificação do backend.
-- ============================================================================
-- Remove os usuários de teste (@bazarteste.dev),
-- suas compras e doações, e devolve as peças à vitrine.
-- OPCIONAL: rode só se quiser o banco limpo. Nada aqui toca dados reais.
-- ============================================================================
BEGIN;

-- O trigger impede alterar peça vendida — desligado só dentro desta transação.
ALTER TABLE public.products DISABLE TRIGGER products_protect_sold;

DELETE FROM public.sales
 WHERE buyer_id IN (SELECT id FROM auth.users WHERE email LIKE '%@bazarteste.dev');

DELETE FROM public.donations
 WHERE donor_id IN (SELECT id FROM auth.users WHERE email LIKE '%@bazarteste.dev');

-- Peça sem venda associada volta para a vitrine.
UPDATE public.products SET status = 'available'
 WHERE status = 'sold'
   AND id NOT IN (SELECT product_id FROM public.sales);

-- CASCADE em profiles e addresses.
DELETE FROM auth.users WHERE email LIKE '%@bazarteste.dev';

ALTER TABLE public.products ENABLE TRIGGER products_protect_sold;

COMMIT;

SELECT
  (SELECT count(*) FROM public.products WHERE status = 'available') AS disponiveis,
  (SELECT count(*) FROM public.products WHERE status = 'sold')      AS vendidas,
  (SELECT count(*) FROM public.sales)                               AS vendas,
  (SELECT count(*) FROM public.donations)                           AS doacoes;
