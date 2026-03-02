-- =============================================================
-- LUMIA — NUCLEAR FIX: Apagar TODAS as policies e recriar
-- Rode este SQL no Supabase SQL Editor
-- =============================================================

-- ── CLINICS ──
DO $$ DECLARE r RECORD;
BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'clinics') LOOP
  EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON clinics';
END LOOP; END $$;

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinics_insert" ON clinics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "clinics_select" ON clinics FOR SELECT TO authenticated USING (
  id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid())
  OR created_by = auth.uid()
);
CREATE POLICY "clinics_update" ON clinics FOR UPDATE TO authenticated USING (
  id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid())
);
CREATE POLICY "clinics_delete" ON clinics FOR DELETE TO authenticated USING (
  id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid() AND role = 'owner')
);

-- ── CLINIC_MEMBERS ──
DO $$ DECLARE r RECORD;
BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'clinic_members') LOOP
  EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON clinic_members';
END LOOP; END $$;

ALTER TABLE clinic_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_members_insert" ON clinic_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "clinic_members_select" ON clinic_members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "clinic_members_update" ON clinic_members FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "clinic_members_delete" ON clinic_members FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ── CLINIC_SETTINGS ──
DO $$ DECLARE r RECORD;
BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'clinic_settings') LOOP
  EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON clinic_settings';
END LOOP; END $$;

ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_settings_insert" ON clinic_settings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "clinic_settings_select" ON clinic_settings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "clinic_settings_update" ON clinic_settings FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- ── FAQ_ITEMS ──
DO $$ DECLARE r RECORD;
BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'faq_items') LOOP
  EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON faq_items';
END LOOP; END $$;

ALTER TABLE faq_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faq_items_insert" ON faq_items FOR INSERT TO authenticated WITH CHECK (
  clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid())
);
CREATE POLICY "faq_items_select" ON faq_items FOR SELECT TO authenticated USING (
  clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid())
);
CREATE POLICY "faq_items_update" ON faq_items FOR UPDATE TO authenticated USING (
  clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid())
);
CREATE POLICY "faq_items_delete" ON faq_items FOR DELETE TO authenticated USING (
  clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid())
);

-- ── CONTENT_POSTS ──
DO $$ DECLARE r RECORD;
BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'content_posts') LOOP
  EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON content_posts';
END LOOP; END $$;

ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_posts_insert" ON content_posts FOR INSERT TO authenticated WITH CHECK (
  clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid())
);
CREATE POLICY "content_posts_select" ON content_posts FOR SELECT TO authenticated USING (
  clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid())
);
CREATE POLICY "content_posts_update" ON content_posts FOR UPDATE TO authenticated USING (
  clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid())
);
CREATE POLICY "content_posts_delete" ON content_posts FOR DELETE TO authenticated USING (
  clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid())
);

-- ── PATIENTS ──
DO $$ DECLARE r RECORD;
BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'patients') LOOP
  EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON patients';
END LOOP; END $$;

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_insert" ON patients FOR INSERT TO authenticated WITH CHECK (
  clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid())
);
CREATE POLICY "patients_select" ON patients FOR SELECT TO authenticated USING (
  clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid())
);
CREATE POLICY "patients_update" ON patients FOR UPDATE TO authenticated USING (
  clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid())
);
CREATE POLICY "patients_delete" ON patients FOR DELETE TO authenticated USING (
  clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid())
);

-- ── APPOINTMENTS ──
DO $$ DECLARE r RECORD;
BEGIN FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'appointments') LOOP
  EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON appointments';
END LOOP; END $$;

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments_insert" ON appointments FOR INSERT TO authenticated WITH CHECK (
  clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid())
);
CREATE POLICY "appointments_select" ON appointments FOR SELECT TO authenticated USING (
  clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid())
);
CREATE POLICY "appointments_update" ON appointments FOR UPDATE TO authenticated USING (
  clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid())
);
CREATE POLICY "appointments_delete" ON appointments FOR DELETE TO authenticated USING (
  clinic_id IN (SELECT clinic_id FROM clinic_members WHERE user_id = auth.uid())
);

-- Verificar
SELECT tablename, policyname, cmd, permissive FROM pg_policies 
WHERE schemaname = 'public' ORDER BY tablename, cmd;
