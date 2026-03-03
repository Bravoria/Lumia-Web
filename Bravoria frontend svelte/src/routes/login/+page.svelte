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

  let resetSent = false;
  async function forgotPassword() {
    if (!email.trim()) {
      errorMsg = 'Digite seu email acima para recuperar a senha.';
      return;
    }
    loading = true;
    errorMsg = '';
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`
      });
      if (error) throw error;
      resetSent = true;
    } catch (e) {
      errorMsg = e?.message ?? 'Erro ao enviar email de recuperação.';
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
    <input bind:value={email} placeholder="seu@email.com" disabled={loading} class:opacity-50={loading} />

    <label>Senha</label>
    <input bind:value={password} type="password" placeholder="********" disabled={loading} class:opacity-50={loading} />

    {#if errorMsg}
      <div class="err">{errorMsg}</div>
    {/if}

    <div class="row">
      <button class="btn-primary" on:click={signIn} disabled={loading || !email || !password}>
        {loading ? 'Processando...' : 'Entrar'}
      </button>

      <button class="ghost" on:click={signUp} disabled={loading || !email || !password}>
        Criar conta
      </button>
    </div>

    {#if resetSent}
      <div class="success-msg">📧 Email de recuperação enviado! Verifique sua caixa de entrada.</div>
    {:else}
      <button class="forgot-link" on:click={forgotPassword} disabled={loading}>Esqueci minha senha</button>
    {/if}
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
  input{ width:100%; border:1px solid #2b2b2b; background:#0f0f0f; color:#fff; border-radius:12px; padding:10px 12px; transition: opacity 0.2s; }
  .opacity-50 { opacity: 0.5; }
  .row{ display:flex; gap:10px; margin-top:14px; }
  button{ flex:1; padding:10px 12px; border-radius:12px; border:1px solid #303030; background:transparent; color:#fff; cursor:pointer; font-weight: 600; transition: all 0.2s; }
  .btn-primary { background: #fff; color: #000; border: none; }
  .btn-primary:hover:not(:disabled) { background: #e5e5e5; }
  button:hover:not(:disabled):not(.btn-primary){ border-color:#fff; }
  button:disabled{ opacity:.45; cursor:not-allowed; }
  .ghost{ color:#bbb; }
  .err{ margin-top:12px; color:#ff6b6b; font-size:13px; text-align: center; font-weight: 500;}
  .forgot-link { background: none; border: none; color: #777; font-size: 12px; cursor: pointer; margin-top: 16px; width: 100%; text-align: center; transition: color 0.2s; padding: 4px; }
  .forgot-link:hover:not(:disabled) { color: #E5C100; text-decoration: underline; }
  .forgot-link:disabled { opacity: 0.4; cursor: not-allowed; }
  .success-msg { margin-top: 16px; color: #4ade80; font-size: 13px; text-align: center; font-weight: 500; }
</style>