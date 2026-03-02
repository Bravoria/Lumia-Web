<!-- src/routes/login/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase.js';

  let email = '';
  let password = '';
  let loading = false;
  let errorMsg = '';

  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    if (data?.session) goto('/dashboard');
  });

  async function signIn() {
    loading = true;
    errorMsg = '';
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (error) throw error;
      goto('/dashboard');
    } catch (e) {
      errorMsg = e?.message ?? 'Erro ao entrar';
    } finally {
      loading = false;
    }
  }

  async function signUp() {
    loading = true;
    errorMsg = '';
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password
      });
      if (error) throw error;
      errorMsg = 'Conta criada! Agora faça login.';
    } catch (e) {
      errorMsg = e?.message ?? 'Erro ao criar conta';
    } finally {
      loading = false;
    }
  }
</script>

<main class="wrap">
  <div class="card">
    <div class="logo-box">
      <img src="/logo.png" alt="Lumia" class="login-logo" />
    </div>
    <h1>Entrar</h1>
    <p>Acesse sua conta.</p>

    <label>Email</label>
    <input bind:value={email} placeholder="seu@email.com" />

    <label>Senha</label>
    <input bind:value={password} type="password" placeholder="********" />

    {#if errorMsg}
      <div class="err">{errorMsg}</div>
    {/if}

    <div class="row">
      <button on:click={signIn} disabled={loading || !email || !password}>
        {loading ? 'Entrando...' : 'Entrar'}
      </button>

      <button class="ghost" on:click={signUp} disabled={loading || !email || !password}>
        Criar conta
      </button>
    </div>
  </div>
</main>

<style>
  .wrap{ min-height:100vh; display:flex; align-items:center; justify-content:center; background:#0f0f0f; color:#fff; padding:24px; }
  .card{ width:100%; max-width:420px; border:1px solid #252525; background:#141414; border-radius:16px; padding:24px; }
  .logo-box { text-align: center; margin-bottom: 24px; }
  .login-logo { height: auto; width: 160px; object-fit: contain; }
  h1{ margin:0 0 6px; font-size:24px; text-align: center; font-weight: 800; letter-spacing: -0.5px; }
  p{ margin:0 0 24px; opacity:.7; font-size:14px; text-align: center; }
  label{ display:block; font-size:12px; opacity:.8; margin:10px 0 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
  input{ width:100%; border:1px solid #2b2b2b; background:#0f0f0f; color:#fff; border-radius:12px; padding:10px 12px; }
  .row{ display:flex; gap:10px; margin-top:14px; }
  button{ flex:1; padding:10px 12px; border-radius:12px; border:1px solid #303030; background:transparent; color:#fff; cursor:pointer; }
  button:hover{ border-color:#fff; }
  button:disabled{ opacity:.45; cursor:not-allowed; }
  .ghost{ color:#bbb; }
  .err{ margin-top:12px; color:#ff6b6b; font-size:13px; }
</style>