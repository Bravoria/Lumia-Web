-- =============================================================
-- LUMIA — Atualizar preços dos planos
-- =============================================================

UPDATE plans SET price_monthly = 29700, price_annual = 24700 WHERE id = 'pro';
UPDATE plans SET price_monthly = 79700, price_annual = 64700 WHERE id = 'business';

-- Verificar:
SELECT id, name, price_monthly/100.0 as mensal_reais, price_annual/100.0 as anual_reais FROM plans ORDER BY price_monthly;
