// src/lib/clinic.js
import { supabase } from '$lib/supabase.js';

export async function fetchMyClinic() {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;

  const user = userRes?.user;
  if (!user) return null;

  // pega a 1ª clínica do usuário
  const { data: member, error: memberErr } = await supabase
    .from('clinic_members')
    .select('clinic_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (memberErr) throw memberErr;
  if (!member?.clinic_id) return null;

  const { data: clinicRow, error: clinicErr } = await supabase
    .from('clinics')
    .select('id,name,whatsapp,timezone,created_at,created_by')
    .eq('id', member.clinic_id)
    .maybeSingle();

  if (clinicErr) throw clinicErr;

  return clinicRow ?? null;
}

export async function createClinic({ name, whatsapp }) {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;

  const user = userRes?.user;
  if (!user) throw new Error('Usuário não autenticado');

  const { data: clinicRow, error: clinicErr } = await supabase
    .from('clinics')
    .insert({
      name,
      whatsapp,
      timezone: 'America/Sao_Paulo',
      created_by: user.id
    })
    .select('id,name,whatsapp,timezone,created_at,created_by')
    .single();

  if (clinicErr) throw clinicErr;

  const { error: memberErr } = await supabase
    .from('clinic_members')
    .insert({
      clinic_id: clinicRow.id,
      user_id: user.id,
      role: 'owner'
    });

  if (memberErr) throw memberErr;

  return clinicRow;
}