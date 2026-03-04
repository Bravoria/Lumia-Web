-- ================================================
-- SQL para criar as tabelas do Agente Treinador
-- Execute no Supabase SQL Editor
-- ================================================

-- 1. Adicionar coluna agent_name na tabela clinic_settings
ALTER TABLE clinic_settings 
ADD COLUMN IF NOT EXISTS agent_name TEXT DEFAULT 'Lumia';

-- 2. Tabela de regras de treinamento
CREATE TABLE IF NOT EXISTS training_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  category TEXT DEFAULT 'general',
  rule_text TEXT NOT NULL,
  source TEXT DEFAULT 'trainer_agent',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE training_rules ENABLE ROW LEVEL SECURITY;

-- 4. Policies para training_rules
CREATE POLICY "Users can view training rules of their clinic" ON training_rules
  FOR SELECT USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert training rules for their clinic" ON training_rules
  FOR INSERT WITH CHECK (
    clinic_id IN (
      SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete training rules of their clinic" ON training_rules
  FOR DELETE USING (
    clinic_id IN (
      SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid()
    )
  );
