// src/hooks.server.js
import { createClient } from '@supabase/supabase-js';
import { redirect } from '@sveltejs/kit';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const PUBLIC_ROUTES = ['/', '/login', '/cadastro', '/planos', '/termos', '/privacidade'];

export const handle = async ({ event, resolve }) => {
  const path = event.url.pathname;

  // Allow public routes, static files, and API routes
  if (
    PUBLIC_ROUTES.includes(path) ||
    path.startsWith('/api/') ||
    path.startsWith('/_app/') ||
    path.startsWith('/favicon') ||
    path.endsWith('.png') ||
    path.endsWith('.jpg') ||
    path.endsWith('.svg') ||
    path.endsWith('.xml') ||
    path.endsWith('.txt') ||
    path.endsWith('.webmanifest')
  ) {
    return resolve(event);
  }

  // Protected routes: /dashboard/*, /setup/*
  if (path.startsWith('/dashboard') || path.startsWith('/setup')) {
    const accessToken = event.cookies.get('sb-access-token') ||
      event.cookies.get('sb:token') ||
      event.request.headers.get('authorization')?.replace('Bearer ', '');

    // Try to get session from Supabase auth cookie
    const allCookies = event.cookies.getAll();
    const authCookie = allCookies.find(c => c.name.includes('auth-token') || c.name.includes('sb-'));

    if (!authCookie && !accessToken) {
      // No auth cookie found — check if there's a Supabase session via the URL-based auth
      // SvelteKit with Supabase typically stores auth in localStorage (client-side)
      // Server-side we can't access localStorage, so we let the client handle it
      // But we add a server-side check using the cookie approach

      // For SvelteKit + Supabase, the auth is primarily client-side
      // We'll add a lightweight server guard that checks for the presence of any supabase cookie
      const hasSupabaseCookie = allCookies.some(c => c.name.startsWith('sb-'));

      if (!hasSupabaseCookie) {
        throw redirect(303, '/login');
      }
    }
  }

  return resolve(event);
};

export const handleError = ({ error, event }) => {
  console.error('🔥 SvelteKit error:', event.url.toString());
  console.error(error);
};