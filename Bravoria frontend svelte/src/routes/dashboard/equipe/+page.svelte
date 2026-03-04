<script>
  import { onMount } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  import { supabase } from '$lib/supabase.js';

  let isLoading = true;
  let members = [];
  let invites = [];
  let myClinicId = null;
  let myRole = null;
  
  // Forms
  let showInviteForm = false;
  let isSending = false;
  let newEmail = '';
  let newRole = 'receptionist';
  let message = '';
  let generatedLink = '';

  const roleLabels = {
    owner: 'Dono (Owner)',
    admin: 'Gerente (Admin)',
    doctor: 'Doutor(a) / Dentista',
    receptionist: 'Recepcionista'
  };

  onMount(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Pega a clínica e a role do usuário atual
    const { data: mData } = await supabase
      .from('clinic_members')
      .select('clinic_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (mData) {
      myClinicId = mData.clinic_id;
      myRole = mData.role;
      await loadData();
    }
    isLoading = false;
  });

  async function loadData() {
    if (!myClinicId) return;

    // Carregar membros atuais
    const { data: mList } = await supabase
      .from('clinic_members')
      .select('id, user_id, user_email, user_name, role, created_at')
      .eq('clinic_id', myClinicId)
      .order('created_at');
    
    if (mList) members = mList;

    // Carregar convites pendentes
    const { data: iList } = await supabase
      .from('clinic_invites')
      .select('*')
      .eq('clinic_id', myClinicId)
      .order('created_at', { ascending: false });

    if (iList) invites = iList;
  }

  async function createInvite() {
    message = '';
    generatedLink = '';
    if (!newEmail.trim()) {
      message = '⚠️ Digite um e-mail válido.';
      return;
    }

    if (myRole !== 'owner' && myRole !== 'admin') {
      message = '⚠️ Apenas admins podem enviar convites.';
      return;
    }

    isSending = true;

    // Gerar um token aleatório simples (ex: 16 chars)
    const token = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);

    const { data, error } = await supabase.from('clinic_invites').insert({
      clinic_id: myClinicId,
      email: newEmail.trim().toLowerCase(),
      role: newRole,
      token: token
    }).select().single();

    if (error) {
      if (error.code === '23505') {
        message = '⚠️ Já existe um convite pendente com este token/email.';
      } else {
        message = 'Erro ao convidar: ' + error.message;
      }
    } else {
      // Cria o link copiável (localhost em dev, ou o domínio oficial em prod)
      const base = window.location.origin;
      generatedLink = `${base}/convite/${token}`;
      message = '✅ Convite gerado com sucesso!';
      invites = [data, ...invites];
      newEmail = '';
      showInviteForm = false;
    }
    isSending = false;
  }

  async function revokeInvite(inviteId) {
    if(!confirm('Tem certeza que deseja cancelar este convite?')) return;
    const { error } = await supabase.from('clinic_invites').delete().eq('id', inviteId);
    if(!error) {
      invites = invites.filter(i => i.id !== inviteId);
    }
  }

  async function removeMember(memberId, role) {
    if (role === 'owner') {
      alert('Não é possível remover o Dono da clínica.');
      return;
    }
    if(!confirm('Atenção: Tem certeza que deseja remover este membro da clínica?')) return;
    const { error } = await supabase.from('clinic_members').delete().eq('id', memberId);
    if(!error) {
      members = members.filter(m => m.id !== memberId);
    }
  }

  function copyText(txt) {
    navigator.clipboard.writeText(txt);
    alert('Link copiado!');
  }
</script>

<svelte:head>
  <title>Equipe e Acessos • LumiaOS</title>
</svelte:head>

<div class="head">
  <div>
    <h1>Gestão de Equipe</h1>
    <p>Adicione recepcionistas e doutores para gerenciar a clínica junto com você.</p>
  </div>
  {#if myRole === 'owner' || myRole === 'admin'}
    <button class="btn-primary" on:click={() => showInviteForm = !showInviteForm}>
      + Novo Membro
    </button>
  {/if}
</div>

{#if isLoading}
  <p class="muted">Carregando dados da equipe...</p>
{:else}
  {#if showInviteForm}
    <div class="invite-card" transition:slide>
      <h3>Gerar Convite Seguro</h3>
      <p class="desc">Envie um link único para a pessoa criar a conta dela já vinculada à sua clínica.</p>
      
      <div class="flex-row">
        <label>
          E-mail do convidado:
          <input type="email" placeholder="recepcao@email.com" bind:value={newEmail} />
        </label>
        <label>
          Nível de Acesso (Role):
          <select bind:value={newRole}>
            <option value="receptionist">Recepcionista (Sem acesso financeiro/settings)</option>
            <option value="doctor">Doutor/Dentista (Pode ver agenda e CRM)</option>
            <option value="admin">Admin (Acesso Total)</option>
          </select>
        </label>
        <button class="btn-submit" disabled={isSending} on:click={createInvite}>
          {isSending ? 'Gerando...' : 'Gerar Link'}
        </button>
      </div>
      {#if message}
        <p class="msg-box" class:error={message.includes('⚠️') || message.includes('Erro')}>{message}</p>
      {/if}
    </div>
  {/if}

  {#if generatedLink}
    <div class="link-box" transition:fade>
      <p><strong>Envie este link para a pessoa:</strong></p>
      <div class="link-row">
        <input type="text" readonly value={generatedLink} />
        <button on:click={() => copyText(generatedLink)}>Copiar</button>
      </div>
      <p class="sub-alert">Esse link é válido apenas para o primeiro acesso e expira após o uso.</p>
    </div>
  {/if}

  <h2>Convites Pendentes</h2>
  {#if invites.length === 0}
    <div class="empty-state">
      <p>Nenhum convite pendente no momento.</p>
    </div>
  {:else}
    <div class="grid list-grid">
      {#each invites as invite}
        <div class="member-card">
          <div class="m-info">
            <span class="m-icon">📩</span>
            <div>
              <strong>{invite.email}</strong>
              <span class="badge badge-pending">Pendente</span>
            </div>
          </div>
          <div class="m-meta">
            <span>Acesso: <em>{roleLabels[invite.role]}</em></span>
            <button class="btn-action red" on:click={() => revokeInvite(invite.id)}>Cancelar</button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <h2 class="mt-4">Membros Ativos</h2>
  <div class="grid list-grid mb-4">
    {#each members as member}
      <div class="member-card">
        <div class="m-info">
          <span class="m-icon">{member.role === 'owner' ? '👑' : (member.role === 'doctor' ? '🩺' : '👩‍💻')}</span>
          <div>
            <strong>{member.user_name || member.user_email || 'Usuário Sem Nome'}</strong>
            <span class="badge" class:owner={member.role === 'owner'}>{roleLabels[member.role] || member.role}</span>
          </div>
        </div>
        <div class="m-meta">
          <span>{member.user_email || 'Email Privado'}</span>
          {#if member.role !== 'owner' && (myRole === 'owner' || myRole === 'admin')}
            <button class="btn-action red" on:click={() => removeMember(member.id, member.role)}>Remover</button>
          {/if}
        </div>
      </div>
    {/each}
  </div>

{/if}

<style>
  .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 1px solid #1a1a1a; padding-bottom: 1.5rem; margin-bottom: 2rem; }
  h1 { font-size: 1.6rem; font-weight: 800; margin: 0 0 0.4rem; letter-spacing: -0.03em; }
  p { margin: 0; color: #888; font-size: 0.9rem; }
  h2 { font-size: 1.2rem; font-weight: 700; margin: 2rem 0 1rem; color: #ddd; }

  .btn-primary { background: #E5C100; color: #000; border: none; padding: 0.8rem 1.5rem; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.2s; white-space: nowrap; }
  .btn-primary:hover { background: #dfb900; transform: translateY(-2px); }

  .invite-card { background: #111; border: 1px solid #222; border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; }
  .invite-card h3 { margin: 0 0 0.5rem; font-size: 1.1rem; }
  .invite-card .desc { margin-bottom: 1.5rem; color: #777; }
  .flex-row { display: flex; gap: 1rem; align-items: flex-end; }
  .flex-row label { display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.8rem; font-weight: 600; color: #999; flex: 1; }
  input, select { background: #0A0A0A; border: 1px solid #333; color: #fff; padding: 0.9rem; border-radius: 8px; font-size: 0.9rem; outline: none; transition: 0.2s; }
  input:focus, select:focus { border-color: #E5C100; box-shadow: 0 0 0 3px rgba(229, 193, 0, 0.1); }
  .btn-submit { background: #fff; color: #000; font-weight: 800; border: none; border-radius: 8px; padding: 0.9rem 1.5rem; cursor: pointer; transition: 0.2s; height: 46px; }
  .btn-submit:hover:not(:disabled) { background: #e0e0e0; }
  .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

  .link-box { background: rgba(229, 193, 0, 0.1); border: 1px solid rgba(229, 193, 0, 0.3); border-radius: 10px; padding: 1.2rem; margin-bottom: 2rem; }
  .link-box p { color: #E5C100; margin-bottom: 0.6rem; }
  .link-row { display: flex; gap: 0.5rem; }
  .link-row input { flex: 1; background: #000; border-color: #333; font-family: monospace; color: #E5C100; }
  .link-row button { background: #E5C100; color: #000; font-weight: 700; padding: 0 1.5rem; border-radius: 8px; border: none; cursor: pointer; }
  .link-row button:hover { background: #dfb900; }
  .sub-alert { font-size: 0.75rem !important; color: #aaa !important; margin-top: 0.6rem !important; }

  .msg-box { margin-top: 1rem; padding: 0.8rem; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); color: #22C55E; border-radius: 8px; font-weight: 600; font-size: 0.85rem; }
  .msg-box.error { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); color: #EF4444; }

  .list-grid { display: flex; flex-direction: column; gap: 0.8rem; }
  .member-card { display: flex; justify-content: space-between; align-items: center; background: #16161A; border: 1px solid #222; padding: 1rem 1.5rem; border-radius: 10px; transition: 0.2s; }
  .member-card:hover { border-color: #333; background: #1a1a1e; }
  .m-info { display: flex; align-items: center; gap: 1rem; }
  .m-icon { font-size: 1.5rem; background: #0a0a0a; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: 1px solid #333; }
  .m-info strong { display: block; font-size: 1rem; margin-bottom: 0.2rem; color: #fff; }
  .badge { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; background: #333; color: #ccc; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .badge.owner { background: rgba(229, 193, 0, 0.15); color: #E5C100; }
  .badge-pending { background: rgba(239, 68, 68, 0.15); color: #EF4444; }

  .m-meta { display: flex; align-items: center; gap: 1.5rem; color: #666; font-size: 0.85rem; }
  .btn-action { background: none; border: none; font-size: 0.8rem; font-weight: 600; cursor: pointer; padding: 0; outline: none; }
  .btn-action.red { color: #EF4444; }
  .btn-action.red:hover { color: #fca5a5; text-decoration: underline; }

  .empty-state { text-align: center; padding: 3rem; background: #0a0a0a; border: 1px dashed #222; border-radius: 12px; color: #555; }
  .mt-4 { margin-top: 3rem; }
  .mb-4 { margin-bottom: 3rem; }

  @media (max-width: 768px) {
    .flex-row { flex-direction: column; align-items: stretch; }
    .head { flex-direction: column; align-items: flex-start; gap: 1rem; }
    .member-card { flex-direction: column; align-items: flex-start; gap: 1rem; }
    .m-meta { width: 100%; justify-content: space-between; }
  }
</style>
