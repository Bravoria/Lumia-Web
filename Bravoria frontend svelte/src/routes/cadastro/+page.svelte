<!-- src/routes/cadastro/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { register, getSessionUser } from '$lib/auth.js';

  let fullName = '';
  let email = '';
  let password = '';
  let isLoading = false;
  let errorMessage = '';
  let successMessage = '';

  // Se já estiver logado, manda pro dashboard
  onMount(async () => {
    try {
      const u = await getSessionUser();
      if (u) goto('/dashboard');
    } catch (e) {
      // ignora
    }
  });

  async function handleRegister() {
    if (!fullName || !email || !password) {
      errorMessage = 'Por favor, preencha todos os campos.';
      return;
    }
    if (password.length < 6) {
      errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
      return;
    }

    isLoading = true;
    errorMessage = '';
    successMessage = '';

    try {
      await register(fullName, email, password);

      successMessage = 'Conta criada com sucesso! Redirecionando...';
      fullName = '';
      email = '';
      password = '';

      setTimeout(() => goto('/setup'), 2000);
    } catch (error) {
      const msg = error?.message ?? '';
      errorMessage = msg.includes('already registered')
        ? 'Este e-mail já está em uso.'
        : 'Erro ao criar conta: ' + msg;
    } finally {
      isLoading = false;
    }
  }
</script>

<main>
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-header">
        <div class="logo-mark">
          <img src="/logo.png" alt="Lumia" class="logo-img" />
          <div class="logo-glow"></div>
        </div>
        <p class="subtitle">IA que executa todas as áreas da sua empresa</p>
      </div>

      <div class="divider"></div>

      <h2>Criar sua conta</h2>

      {#if errorMessage}
        <div class="error-alert">{errorMessage}</div>
      {/if}
      {#if successMessage}
        <div class="success-alert">{successMessage}</div>
      {/if}

      <form on:submit|preventDefault={handleRegister}>
        <div class="input-group">
          <label for="fullName">Nome Completo</label>
          <input type="text" id="fullName" bind:value={fullName} placeholder="Seu nome completo" required disabled={isLoading} class:opacity-50={isLoading} />
        </div>

        <div class="input-group">
          <label for="email">E-mail</label>
          <input type="email" id="email" bind:value={email} placeholder="seu@email.com" required disabled={isLoading} class:opacity-50={isLoading} />
        </div>

        <div class="input-group">
          <label for="password">Senha</label>
          <input type="password" id="password" bind:value={password} placeholder="Mínimo 6 caracteres" required disabled={isLoading} class:opacity-50={isLoading} />
        </div>

        <button type="submit" class="btn-primary" disabled={isLoading}>
          {isLoading ? 'Criando...' : 'Criar Conta'}
        </button>
      </form>

      <div class="auth-footer">
        <p>Já tem uma conta? <a href="/login">Fazer login</a></p>
      </div>
    </div>

    <p class="copyright">Lumia — Transformando gestão em resultado.</p>
  </div>
</main>

<style>
  main {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 1rem;
    background: #0A0A0A;
  }

  .auth-container { width: 100%; max-width: 420px; }

  .auth-card {
    background: #141414;
    padding: 2.5rem;
    border-radius: 12px;
    border: 1px solid #2A2A2A;
  }

  .auth-header { text-align: center; margin-bottom: 1.5rem; }

  .logo-mark {
    position: relative;
    display: flex;
    justify-content: center;
    margin-bottom: 1.25rem;
    height: 56px;
  }

  .logo-img {
    height: auto;
    width: 160px;
    object-fit: contain;
    background: transparent;
    border: none;
    filter: drop-shadow(0 10px 24px rgba(0,0,0,0.55));
    opacity: 0.95;
    position: relative;
    z-index: 2;
  }


  .logo-glow {
    position: absolute;
    width: 90px;
    height: 90px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 22px;
    background: radial-gradient(circle, rgba(229,193,0,0.20) 0%, rgba(229,193,0,0.06) 35%, rgba(0,0,0,0) 70%);
    filter: blur(10px);
    opacity: 0.9;
    z-index: 1;
  }

  .brand {
    color: #FFFFFF;
    font-family: 'Inter', sans-serif;
    font-size: 1.8rem;
    font-weight: 800;
    margin: 0;
    letter-spacing: -1px;
  }

  .brand-dot { color: #E5C100; }

  .subtitle {
    color: #666666;
    font-size: 0.85rem;
    margin-top: 0.5rem;
    letter-spacing: 0.3px;
  }

  .divider { height: 1px; background: #2A2A2A; margin: 1.5rem 0; }

  h2 {
    color: #FFFFFF;
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    text-align: center;
    letter-spacing: -0.3px;
  }

  .error-alert {
    background: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    color: #EF4444;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    font-size: 0.85rem;
    text-align: center;
  }

  .success-alert {
    background: rgba(229, 193, 0, 0.08);
    border: 1px solid rgba(229, 193, 0, 0.3);
    color: #E5C100;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    font-size: 0.85rem;
    text-align: center;
  }

  .input-group { margin-bottom: 1.25rem; }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #999999;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  input {
    width: 100%;
    padding: 0.85rem 1rem;
    background: #0A0A0A;
    border: 1px solid #2A2A2A;
    border-radius: 8px;
    color: #FFFFFF;
    font-family: 'Inter', sans-serif;
    font-size: 0.95rem;
    transition: all 0.2s;
  }

  input::placeholder { color: #444444; }
  input:focus:not(:disabled) { outline: none; border-color: #FFFFFF; }
  .opacity-50 { opacity: 0.5; }

  .btn-primary {
    width: 100%;
    padding: 0.85rem;
    background: #FFFFFF;
    color: #0A0A0A;
    border: none;
    border-radius: 8px;
    font-family: 'Inter', sans-serif;
    font-size: 0.95rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 0.5rem;
    letter-spacing: -0.3px;
  }

  .btn-primary:hover { background: #E5E5E5; transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .auth-footer {
    text-align: center;
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #2A2A2A;
  }

  .auth-footer p { color: #666666; font-size: 0.85rem; }
  .auth-footer a { color: #FFFFFF; font-weight: 600; transition: color 0.2s; }
  .auth-footer a:hover { color: #E5C100; }

  .copyright {
    text-align: center;
    color: #333333;
    font-size: 0.75rem;
    margin-top: 2rem;
    letter-spacing: 0.5px;
  }
</style>
