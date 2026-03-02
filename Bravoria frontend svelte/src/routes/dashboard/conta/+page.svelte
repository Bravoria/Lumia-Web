<script>
  import { supabase } from '$lib/supabase.js';
  import { onMount } from 'svelte';
  import { getClinicPlan } from '$lib/planGuard.js';

  let email = '';
  let fullName = '';
  let planName = 'Carregando...';
  let newPassword = '';
  
  // Estados para salvar o nome
  let savingName = false;
  let msgName = '';
  let isErrorName = false;

  // Estados para salvar a senha
  let savingPass = false;
  let msgPass = '';
  let isErrorPass = false;

  onMount(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    email = user?.email ?? '';
    fullName = user?.user_metadata?.full_name ?? '';

    // Fetch real plan
    const { data: member } = await supabase.from('clinic_members')
      .select('clinic_id').eq('user_id', user.id).limit(1).maybeSingle();
    if (member?.clinic_id) {
      const info = await getClinicPlan(member.clinic_id);
      planName = info?.planName || 'Starter (Gratuito)';
    } else {
      planName = 'Sem clínica';
    }
  });

  async function saveName() {
    if (!fullName || fullName.trim() === '') {
      msgName = 'O nome não pode ficar vazio.';
      isErrorName = true;
      return;
    }
    savingName = true;
    msgName = '';
    
    // Atualiza o user_metadata no Supabase Auth
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName }
    });
    
    if (error) {
      msgName = 'Erro: ' + error.message;
      isErrorName = true;
    } else {
      msgName = 'Nome atualizado com sucesso ✅';
      isErrorName = false;
    }
    savingName = false;
  }

  async function savePassword() {
    if (!newPassword || newPassword.length < 6) {
      msgPass = 'A senha precisa ter pelo menos 6 caracteres.';
      isErrorPass = true;
      return;
    }
    savingPass = true;
    msgPass = '';
    
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      msgPass = 'Erro: ' + error.message;
      isErrorPass = true;
    } else {
      msgPass = 'Senha atualizada com sucesso ✅';
      isErrorPass = false;
      newPassword = '';
    }
    savingPass = false;
  }
</script>

<svelte:head><title>Conta • Lumia</title></svelte:head>

<div class="wrap">
  <p class="label">CONTA</p>
  <h1>Minha conta</h1>

  <div class="box">
    <h2>Dados do perfil</h2>
    
    <div class="input-group">
      <span class="k">Nome completo</span>
      <input type="text" bind:value={fullName} placeholder="Seu nome" />
    </div>

    <div class="row"><span class="k">E-mail</span><span class="v">{email}</span></div>
    <div class="row last"><span class="k">Plano</span><span class="v accent">{planName}</span></div>
    
    {#if msgName}
      <p class="msg" class:err={isErrorName}>{msgName}</p>
    {/if}
    
    <button class="btn-primary" on:click={saveName} disabled={savingName}>
      {savingName ? 'Salvando...' : 'Salvar nome'}
    </button>
  </div>

  <div class="box" style="margin-top:1.5rem">
    <h2>Alterar senha</h2>
    <input type="password" bind:value={newPassword} placeholder="Nova senha (mín. 6 caracteres)" />
    
    {#if msgPass}
      <p class="msg" class:err={isErrorPass}>{msgPass}</p>
    {/if}
    
    <button class="btn-primary" on:click={savePassword} disabled={savingPass}>
      {savingPass ? 'Salvando...' : 'Salvar nova senha'}
    </button>
  </div>
</div>

<style>
  .wrap { padding-bottom: 2rem; }
  .label { color:#555; letter-spacing:3px; font-size:.72rem; text-transform:uppercase; margin:0 0 .3rem; font-weight:700; }
  h1 { color:#fff; font-size:2rem; margin:0 0 1.25rem; letter-spacing:-.5px; }
  h2 { color:#fff; font-size:1.1rem; margin:0 0 1rem; border-bottom: 1px solid #1e1e1e; padding-bottom: 0.5rem; }
  
  .box { background:#141414; border:1px solid #252525; border-radius:14px; padding:1.25rem; max-width:520px; }
  
  .row { margin-bottom:.9rem; }
  .row.last { margin-bottom: 1rem; }
  .input-group { margin-bottom: 1rem; }
  
  .k { display:block; color:#666; font-size:.72rem; text-transform:uppercase; letter-spacing:2px; margin-bottom:.3rem; }
  .v { display:block; color:#fff; font-weight:700; }
  .accent { color:#E5C100; }
  
  input {
    width:100%; background:#0A0A0A; border:1px solid #2a2a2a;
    border-radius:10px; padding:.85rem 1rem; color:#fff;
    font-size:.95rem; outline:none; margin-bottom:.75rem;
    box-sizing:border-box; transition: border-color 0.2s;
  }
  input:focus { border-color:#E5C100; }
  
  .btn-primary {
    padding:.75rem 1.25rem; background:#fff; color:#0A0A0A;
    border:none; border-radius:10px; font-weight:700;
    cursor:pointer; transition: all .2s; margin-top: 0.5rem;
  }
  .btn-primary:hover { background:#E5E5E5; }
  .btn-primary:disabled { opacity:.5; cursor:not-allowed; }
  
  .msg { font-size:.85rem; color:#E5C100; margin:0 0 .75rem; }
  .msg.err { color:#ff6b6b; }
</style>