<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import { fade, fly } from 'svelte/transition';
  import { getClinicPlan, canAccess } from '$lib/planGuard.js';
  import UpgradeModal from '$lib/components/UpgradeModal.svelte';

  let isConnected = false;
  let loadingQR = false;
  let loading = true;
  let planInfo = null;
  let showUpgrade = false;
  let hasAccess = false;

  onMount(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: member } = await supabase
        .from('clinic_members')
        .select('clinic_id')
        .eq('user_id', user.id).limit(1).maybeSingle();
      if (!member?.clinic_id) return;
      planInfo = await getClinicPlan(member.clinic_id);
      hasAccess = canAccess(planInfo.limits, 'whatsapp_ai');
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  });

  function simulateConnection() {
    loadingQR = true;
    setTimeout(() => { loadingQR = false; }, 2000);
  }
</script>

<svelte:head><title>WhatsApp & IA • Lumia</title></svelte:head>

<div class="wrap">
  <div class="head">
    <div>
      <p class="label">INTEGRAÇÃO</p>
      <h1>WhatsApp + IA</h1>
      <p class="sub">Automatize seus agendamentos e o atendimento a pacientes usando IA diretamente no seu número.</p>
    </div>
  </div>

  {#if !loading && !hasAccess}
    <div class="locked-state" in:fly={{ y: 20, duration: 400 }}>
      <div class="locked-icon">🔒</div>
      <h2>WhatsApp com Agente IA é exclusivo do plano Business</h2>
      <p class="locked-desc">Automatize atendimento, agendamento e triagem 24h direto no WhatsApp da sua clínica.</p>
      <button class="btn-unlock" on:click={() => showUpgrade = true}>Ver plano Business →</button>
    </div>
    <UpgradeModal clinicId={clinicId} bind:show={showUpgrade} feature="whatsapp_ai" currentPlan={planInfo?.planName ?? 'Starter'} requiredPlan="Business" />
  {:else}

  <div class="grid">
    <div class="card glow-card">
      <div class="card-header">
        <h2>Status da Conexão</h2>
        <div class="status-badge" class:active={isConnected}>
          <div class="dot"></div>
          {isConnected ? 'Conectado' : 'Desconectado'}
        </div>
      </div>

      {#if !isConnected}
        <div class="empty-state">
          <div class="icon-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </div>
          <h3>Conecte seu WhatsApp</h3>
          <p>Escaneie o QR Code para vincular o número da sua clínica à Lumia.</p>
          
          <button class="btn-primary" on:click={simulateConnection} disabled={loadingQR}>
            {loadingQR ? 'Gerando QR Code...' : 'Gerar QR Code de Conexão'}
          </button>
        </div>
      {:else}
        <div class="connected-state">
          <p>Seu número está conectado e o agente de IA está monitorando as mensagens.</p>
          <button class="btn-danger">Desconectar</button>
        </div>
      {/if}
    </div>

    <div class="card">
      <div class="card-header">
        <h2>Capacidades do Agente</h2>
      </div>
      <p class="muted-text">O que a IA da Lumia fará automaticamente por você:</p>
      
      <div class="feature-list">
        <div class="feature-item">
          <div class="check">✅</div>
          <div>
            <strong>Agendamento Autônomo</strong>
            <span>Identifica a intenção, cruza com a agenda e marca a consulta.</span>
          </div>
        </div>
        <div class="feature-item">
          <div class="check">✅</div>
          <div>
            <strong>Triagem e FAQ</strong>
            <span>Responde dúvidas sobre convênios, localização e preparo de exames.</span>
          </div>
        </div>
        <div class="feature-item">
          <div class="check">⏳</div>
          <div>
            <strong>Redução de No-Show (Em breve)</strong>
            <span>Envia lembretes automáticos 24h antes e tenta reagendar faltas.</span>
          </div>
        </div>
        <div class="feature-item">
          <div class="check">⏳</div>
          <div>
            <strong>Reativação de Leads (Em breve)</strong>
            <span>Manda mensagens amigáveis para pacientes que pararam de responder.</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  {/if}
</div>

<style>
  .wrap { max-width: 1100px; margin: 0 auto; padding-bottom: 2rem; }
  .head { margin-bottom: 2rem; }
  .label { color: #555; letter-spacing: 3px; font-size: .72rem; text-transform: uppercase; margin: 0 0 .3rem; font-weight: 700; }
  h1 { color: #fff; font-size: 2rem; margin: 0 0 .35rem; letter-spacing: -.5px; }
  .sub { color: #777; margin: 0; font-size: .95rem; }

  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  
  /* Cards Base */
  .card {
    background: #141414; border: 1px solid #252525; border-radius: 16px;
    padding: 1.5rem; display: flex; flex-direction: column;
    transition: all 0.3s ease;
  }
  
  /* Glassmorphism e Glow - "O toque do Vale do Silício" */
  .glow-card { position: relative; overflow: hidden; }
  .glow-card::before {
    content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%);
    width: 60%; height: 20px; background: #E5C100;
    filter: blur(40px); opacity: 0.15; pointer-events: none;
  }

  .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid #1e1e1e; padding-bottom: 1rem; }
  h2 { color: #fff; font-size: 1.1rem; margin: 0; }
  .muted-text { color: #777; font-size: 0.9rem; margin-bottom: 1.5rem; }

  /* Status Badge */
  .status-badge {
    display: flex; align-items: center; gap: 6px;
    background: #1a1a1a; border: 1px solid #333; padding: 4px 10px;
    border-radius: 20px; font-size: 0.75rem; color: #888; font-weight: 600;
  }
  .status-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: #555; }
  .status-badge.active { color: #4ade80; border-color: rgba(74, 222, 128, 0.2); background: rgba(74, 222, 128, 0.05); }
  .status-badge.active .dot { background: #4ade80; box-shadow: 0 0 8px #4ade80; }

  /* Empty State */
  .empty-state { text-align: center; padding: 2rem 1rem 1rem; }
  .icon-placeholder {
    width: 64px; height: 64px; margin: 0 auto 1.25rem;
    background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; color: #555;
  }
  .icon-placeholder svg { width: 28px; height: 28px; }
  .empty-state h3 { color: #fff; font-size: 1.1rem; margin: 0 0 .5rem; }
  .empty-state p { color: #777; font-size: 0.9rem; margin: 0 0 1.5rem; line-height: 1.5; }

  /* Buttons */
  .btn-primary {
    background: #E5C100; color: #0A0A0A; border: none; padding: .8rem 1.5rem;
    border-radius: 10px; font-weight: 700; font-size: 0.95rem; cursor: pointer;
    transition: all 0.2s; width: 100%; box-shadow: 0 4px 12px rgba(229, 193, 0, 0.15);
  }
  .btn-primary:hover { background: #fce141; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(229, 193, 0, 0.25); }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
  .btn-danger { background: transparent; color: #ff6b6b; border: 1px solid #ff6b6b; padding: .5rem 1rem; border-radius: 8px; cursor: pointer; transition: 0.2s; }
  .btn-danger:hover { background: rgba(255, 107, 107, 0.1); }

  /* Feature List */
  .feature-list { display: flex; flex-direction: column; gap: 1.25rem; }
  .feature-item { display: flex; gap: 1rem; align-items: flex-start; }
  .feature-item .check { font-size: 1.1rem; margin-top: 2px; }
  .feature-item strong { display: block; color: #fff; font-size: 0.95rem; margin-bottom: 0.2rem; }
  .feature-item span { display: block; color: #666; font-size: 0.85rem; line-height: 1.4; }

  @media(max-width: 768px) { .grid { grid-template-columns: 1fr; } }

  /* Locked State */
  .locked-state { text-align: center; padding: 4rem 2rem; background: #111; border: 1px solid #222; border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .locked-icon { font-size: 3rem; }
  .locked-state h2 { color: #fff; font-size: 1.3rem; margin: 0; }
  .locked-desc { color: #888; font-size: 0.9rem; margin: 0; line-height: 1.5; max-width: 400px; }
  .btn-unlock { background: #E5C100; color: #000; border: none; padding: .8rem 1.5rem; border-radius: 10px; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: all 0.2s; }
  .btn-unlock:hover { background: #fce141; transform: translateY(-2px); }
</style>