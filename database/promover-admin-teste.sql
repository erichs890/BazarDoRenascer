-- ============================================================================
-- Promover a conta de teste a administradora.
-- Rode no SQL Editor do projeto. Seguro rodar mais de uma vez.
-- ============================================================================
-- Todo cadastro nasce como 'user'. A promoção é manual por SQL de propósito:
-- ninguém vira administrador do bazar sozinho pela API.

UPDATE public.profiles SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@bazarteste.dev');

-- Conferência: deve listar admin@ como 'admin' e usuario@ como 'user'.
SELECT u.email, p.name, p.role
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY p.role, u.email;
