-- =============================================================
-- LUMIA — Fix: Permitir SELECT após INSERT na tabela clinics
-- Rode DEPOIS do 03_fix_rls_policies.sql
-- =============================================================

-- Adicionar coluna created_by se não existir
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();

-- Trigger para auto-preencher created_by
CREATE OR REPLACE FUNCTION set_clinic_created_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_clinic_created_by ON clinics;
CREATE TRIGGER trg_set_clinic_created_by
  BEFORE INSERT ON clinics
  FOR EACH ROW EXECUTE FUNCTION set_clinic_created_by();

-- Atualizar SELECT policy para incluir created_by
DROP POLICY IF EXISTS "clinics_select" ON clinics;
CREATE POLICY "clinics_select" ON clinics FOR SELECT TO authenticated USING (
  id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid())
  OR created_by = auth.uid()
);
