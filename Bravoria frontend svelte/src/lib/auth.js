// src/lib/auth.js
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { supabase } from '$lib/supabase.js';

export const user = writable(null);

// mantém o store sincronizado no browser
if (browser) {
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) console.error('getSession error:', error);
    user.set(data?.session?.user ?? null);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    user.set(session?.user ?? null);
  });
}

// usado para redirecionar /app, guards etc
export async function getSessionUser() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session?.user ?? null;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  user.set(null);
}

export async function register(fullName, email, password) {
  // Cria o usuário via Edge Function (register) que insere na tabela users também
  const { data: { session: existingSession } } = await supabase.auth.getSession();
  
  // Usa signUp direto do Supabase Auth com metadata
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  });

  if (error) throw error;

  // Se o usuário foi criado e há sessão imediata, atualiza o store
  if (data?.session?.user) {
    user.set(data.session.user);
  }

  return data;
}