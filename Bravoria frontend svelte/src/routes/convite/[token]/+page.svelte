<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase.js';

  let token = $page.params.token;
  let inviteData = null;
  let isLoading = true;
  let statusMsg = '';
  
  // Forms
  let fullName = '';
  let password = '';
  let isSubmitting = false;

  const roleLabels = {
    admin: 'Especial (Admin)',
    doctor: 'Doutor(a) / Dentista',
    receptionist: 'Recepção'
  };

  onMount(async () => {
    // Busca os dados do convite no banco pelo Token
    const { data, error } = await supabase
      .from('clinic_invites')
      .select('id, email, role, clinic_id, clinics(name)')
      .eq('token', token)
      .maybeSingle();

    if (error || !data) {
      statusMsg = 'Convite inválido ou já expirado.';
    } else {
      inviteData = data;
    }
    isLoading = false;
  });

  async function acceptInvite() {
    statusMsg = '';
    if (!fullName.trim() || password.length < 6) {
      statusMsg = 'Preencha seu nome e crie uma senha de no mínimo 6 caracteres.';
      return;
    }

    isSubmitting = true;

    try {
      // 1. Tentar fazer Signup na plataforma usando as credenciais do convite
      // Usaremos o email do inviteData para garantir que ninguem use o link com outro email
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: inviteData.email,
        password: password,
        options: {
          data: {
            full_name: fullName.trim()
          }
        }
      });

      if (signUpError) {
        // Se o email já existir, precisamos apenas fazer o login e vincular
        if (signUpError.message.includes('already registered')) {
            const { error: signInErr } = await supabase.auth.signInWithPassword({
                email: inviteData.email,
                password: password
            });
            if (signInErr) {
                statusMsg = 'Este e-mail já possui conta na Lumia, mas a senha informada está incorreta. Tente fazer login primeiro e depois clicar no convite.';
                isSubmitting = false;
                return;
            }
        } else {
            statusMsg = signUpError.message;
            isSubmitting = false;
            return;
        }
      }

      // Se passou (ou fez signup ou estava cadastrado e fez login com sucesso)
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // 2. Inserir na tabela clinic_members com a role do convite
        await supabase.from('clinic_members').insert({
          clinic_id: inviteData.clinic_id,
          user_id: user.id,
          role: inviteData.role,
          user_email: inviteData.email,
          user_name: fullName.trim()
        });

        // 3. Deletar o convite usado
        await supabase.from('clinic_invites').delete().eq('id', inviteData.id);

        statusMsg = '✅ Bem-vindo(a) à clínica! Redirecionando...';
        setTimeout(() => goto('/dashboard'), 2000);
      }
    } catch (err) {
      statusMsg = 'Erro inesperado: ' + err.message;
    }
    
    isSubmitting = false;
  }
</script>

<svelte:head>
  <title>Aceitar Convite • LumiaOS</title>
</svelte:head>

<div class="invite-wrapper">
  <div class="invite-box">
    <div class="logo-area">
      <img src="/logo.png" alt="Lumia" class="logo" />
    </div>

    {#if isLoading}
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Garantindo ambiente seguro...</p>
      </div>
    {:else if !inviteData}
      <div class="error-state">
        <div class="icon-error">🚫</div>
        <h2>Acesso Negado</h2>
        <p>{statusMsg}</p>
        <button class="btn-outline" on:click={() => goto('/login')}>Ir para o Login</button>
      </div>
    {:else}
      <div class="success-state">
        <div class="badge-role">{roleLabels[inviteData.role]}</div>
        <h2>Você foi convidado!</h2>
        <p class="subtitle">
          A clínica <strong>{inviteData.clinics?.name || 'sua clínica'}</strong> convidou você para fazer parte da equipe.
        </p>

        <div class="form-area">
          <div class="field">
            <label>E-mail de acesso</label>
            <input type="text" readonly value={inviteData.email} class="readonly" />
          </div>
          
          <div class="field">
            <label>Seu Nome Completo *</label>
            <input type="text" placeholder="Ex: Maria Silva" bind:value={fullName} />
          </div>

          <div class="field">
            <label>Crie uma Senha Segura *</label>
            <input type="password" placeholder="Mínimo 6 caracteres" bind:value={password} />
          </div>

          <button class="btn-primary" on:click={acceptInvite} disabled={isSubmitting}>
            {isSubmitting ? 'Processando acesso...' : 'Aceitar Convite e Entrar'}
          </button>

          {#if statusMsg}
            <p class="status-msg" class:error={statusMsg.includes('Erro') || statusMsg.includes('incorreta') || statusMsg.includes('Preencha')}>{statusMsg}</p>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  :global(body) { background: #0A0A0A; margin: 0; font-family: 'Inter', sans-serif; color: #fff; }
  .invite-wrapper { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 2rem; background: radial-gradient(circle at center, #111 0%, #000 100%); }
  
  .invite-box { background: #0F0F11; width: 100%; max-width: 440px; padding: 3rem 2.5rem; border-radius: 20px; border: 1px solid #1a1a1a; box-shadow: 0 20px 60px rgba(0,0,0,0.8), inset 0 1px 1px rgba(255,255,255,0.05); text-align: center; }
  .logo-area { margin-bottom: 2rem; }
  .logo { height: auto; width: 140px; }

  h2 { font-size: 1.5rem; font-weight: 800; margin: 0 0 0.5rem; letter-spacing: -0.03em; }
  .subtitle { color: #888; font-size: 0.95rem; margin-bottom: 2rem; line-height: 1.5; }
  .subtitle strong { color: #E5C100; }

  .badge-role { display: inline-block; background: rgba(229, 193, 0, 0.1); color: #E5C100; padding: 0.3rem 1rem; border-radius: 20px; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1.5rem; border: 1px solid rgba(229, 193, 0, 0.2); }

  .form-area { text-align: left; }
  .field { margin-bottom: 1.25rem; }
  .field label { display: block; font-size: 0.8rem; font-weight: 600; color: #999; margin-bottom: 0.5rem; }
  input { width: 100%; background: #16161A; border: 1px solid #222; color: #fff; padding: 1rem; border-radius: 10px; font-size: 0.95rem; box-sizing: border-box; outline: none; transition: 0.2s; }
  input:focus { border-color: #E5C100; box-shadow: 0 0 0 3px rgba(229, 193, 0, 0.1); }
  input.readonly { background: #0a0a0a; color: #666; cursor: not-allowed; border-color: #111; }

  .btn-primary { width: 100%; background: #E5C100; color: #000; border: none; padding: 1.1rem; border-radius: 10px; font-weight: 800; font-size: 1rem; cursor: pointer; transition: 0.2s; margin-top: 0.5rem; }
  .btn-primary:hover:not(:disabled) { background: #dfb900; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(229, 193, 0, 0.2); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-outline { background: transparent; border: 1px solid #333; color: #ccc; padding: 0.8rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 1rem; transition: 0.2s; }
  .btn-outline:hover { background: #1a1a1a; color: #fff; border-color: #555; }

  .status-msg { margin-top: 1.5rem; text-align: center; font-size: 0.85rem; color: #22C55E; font-weight: 600; padding: 0.8rem; background: rgba(34, 197, 94, 0.1); border-radius: 8px; }
  .status-msg.error { color: #EF4444; background: rgba(239, 68, 68, 0.1); }

  .icon-error { font-size: 3rem; margin-bottom: 1rem; }
  .loading-state p { margin-top: 1rem; color: #888; font-size: 0.9rem; }
  .spinner { width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #E5C100; border-radius: 50%; margin: 0 auto; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
