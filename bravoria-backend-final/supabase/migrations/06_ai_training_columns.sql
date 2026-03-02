-- =============================================================
-- BRAVOR.IA — Adicionar colunas de contexto da IA ao clinic_settings
-- Rode este SQL no Supabase SQL Editor
-- =============================================================

-- Colunas base
ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS about_clinic text DEFAULT '';
ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS insurances text DEFAULT '';
ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS address_info text DEFAULT '';

-- Colunas expandidas (10 perguntas do treinamento)
ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS pricing_info text DEFAULT '';
ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS preparation_info text DEFAULT '';
ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS cancellation_policy text DEFAULT '';
ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS team_info text DEFAULT '';
ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS payment_methods text DEFAULT '';
ALTER TABLE clinic_settings ADD COLUMN IF NOT EXISTS differentials text DEFAULT '';

-- Verificar:
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'clinic_settings' ORDER BY ordinal_position;
