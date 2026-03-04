<script>
  import { onMount, onDestroy } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import { fade, fly } from 'svelte/transition';
  import { getClinicPlan, canAccess } from '$lib/planGuard.js';
  import UpgradeModal from '$lib/components/UpgradeModal.svelte';

  let connectionState = 'disconnected';
  let loading = true;
  let planInfo = null;
  let showUpgrade = false;
  let hasAccess = false;
  let progressVal = 0;

  let clinicId = null;
  let qrCodeBase64 = null;
  let connectionError = null;

  let msgsHoje = 0;
  let leadsHoje = 0;
  let agendamentosHoje = 0;
  let aiEnabled = true;
  let pollingInterval;

  // URL do backend Node.js (via proxy do Vite em dev, ou direto em produção)
  const ENGINE_URL = '';

  onMount(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: member } = await supabase
        .from('clinic_members')
        .select('clinic_id')
        .eq('user_id', user.id).limit(1).maybeSingle();
      if (!member?.clinic_id) return;

      clinicId = member.clinic_id;
      planInfo = await getClinicPlan(clinicId);
      hasAccess = canAccess(planInfo.limits, 'whatsapp_ai');

      if (hasAccess) {
        await checkStatus();
        pollingInterval = setInterval(checkStatus, 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  });

  onDestroy(() => {
    if (pollingInterval) clearInterval(pollingInterval);
  });

  async function checkStatus() {
    try {
      const res = await fetch(`${ENGINE_URL}/api/whatsapp/status`);
      const data = await res.json();
      if (!data.success) {
        connectionState = 'disconnected';
        connectionError = data.error || 'Erro ao conectar com o motor de IA.';
        return;
      }

      const st = data.data;

      if (st.state === 'qr_ready' && st.qrCode) {
        qrCodeBase64 = st.qrCode;
        connectionState = 'qr_ready';
      } else if (st.state === 'online') {
        connectionState = 'online';
        msgsHoje = st.stats?.msgs || 0;
      } else if (st.state === 'disconnected') {
        connectionState = 'disconnected';
      }
    } catch (e) {
      connectionState = 'disconnected';
      connectionError = 'Motor de IA offline. Verifique se o server_node está rodando.';
    }
  }

  async function startPairing() {
    connectionState = 'qr_loading';
    connectionError = null;
    qrCodeBase64 = null;
    await checkStatus();
  }

  async function disconnect() {
    try {
      await fetch(`${ENGINE_URL}/api/whatsapp/disconnect`, { method: 'POST' });
    } catch(e) { /* ignore */ }
    connectionState = 'disconnected';
    progressVal = 0;
    msgsHoje = 0;
    leadsHoje = 0;
    agendamentosHoje = 0;
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
    <div class="card glow-card" class:online={connectionState === 'online'}>
      <div class="card-header">
        <h2>Motor de IA no WhatsApp</h2>
        <div class="status-badge" class:active={connectionState === 'online'}>
          <div class="dot" class:loading={connectionState === 'scanning' || connectionState === 'connecting'}></div>
          {connectionState === 'online' ? 'Agente Online' : connectionState === 'disconnected' ? 'Desconectado' : 'Conectando...'}
        </div>
      </div>

      {#if connectionState === 'disconnected'}
        <div class="empty-state" in:fade>
          <div class="wpp-icon-bg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
          </div>
          <h3>Vincule o número da Clínica</h3>
          <p>O agente vai responder mensagens e agendar pacientes de forma autônoma (API Oficial Cloud).</p>
          <button class="btn-primary" on:click={startPairing}>Conectar Aparelho</button>
          {#if connectionError}
             <p class="error-msg" style="margin-top: 1rem; color: #EF4444; font-size: 0.85rem;">{connectionError}</p>
          {/if}
        </div>

      {:else if connectionState === 'qr_loading'}
        <div class="qr-state" in:fade>
          <div class="spinner"></div>
          <p>Gerando token de sessão seguro...</p>
        </div>

      {:else if connectionState === 'qr_ready'}
        <div class="qr-state" in:fade>
          <h3>Escaneie o QR Code</h3>
          <p class="muted-text">Abra o WhatsApp no celular da clínica > Aparelhos Conectados > Conectar um aparelho</p>
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <div class="qr-mockup">
            <img src={qrCodeBase64} alt="QR Code" class="real-qr-image" />
          </div>
          <button class="btn-ghost" on:click={disconnect}>Cancelar</button>
        </div>

      {:else if connectionState === 'scanning' || connectionState === 'connecting'}
        <div class="qr-state" in:fade>
          <div class="handshake-animation">
            <div class="device phone">📱</div>
            <div class="sync-arrows">⇄</div>
            <div class="device brain">🧠</div>
          </div>
          <h3>{connectionState === 'scanning' ? 'Lendo credenciais...' : 'Sincronizando chats...'}</h3>
          <div class="progress-bar">
            <div class="progress-fill" style="width: {progressVal}%"></div>
          </div>
        </div>

      {:else if connectionState === 'online'}
        <div class="connected-state" in:fade>
          <div class="connected-hero">
            <div class="pulse-ring">
              <div class="brain-icon outline">🧠</div>
            </div>
            <h3>O Agente assumiu o controle!</h3>
            <p>Seus pacientes estão sendo respondidos pela inteligência da Lumia.</p>
          </div>

          <div class="controls-row">
            <label class="toggle-switch">
              <input type="checkbox" bind:checked={aiEnabled}>
              <span class="slider"></span>
            </label>
            <div class="control-text">
              <strong>{aiEnabled ? 'Respostas Autônomas ATIVADAS' : 'Respostas Autônomas PAUSADAS'}</strong>
              <span>{aiEnabled ? 'A IA responde instantaneamente' : 'A IA apenas sugere respostas aos humanos'}</span>
            </div>
          </div>

          <div class="stats-row">
            <div class="stat-box">
              <span class="st-label">Mensagens Hoje</span>
              <strong class="st-val">{msgsHoje}</strong>
            </div>
            <div class="stat-box">
              <span class="st-label">Novos Leads</span>
              <strong class="st-val">{leadsHoje}</strong>
            </div>
            <div class="stat-box highlight">
              <span class="st-label">Agendados pela IA</span>
              <strong class="st-val">{agendamentosHoje}</strong>
            </div>
          </div>

          <button class="btn-danger outline mt-4" on:click={disconnect}>Desconectar Número</button>
        </div>
      {/if}
    </div>

    <!-- O que o agente faz -->
    <div class="card bg-alt">
      <div class="card-header borderless">
        <h2>Capacidades do Agente</h2>
      </div>
      <p class="muted-text">O que a IA da Lumia faz no piloto automático:</p>
      
      <div class="feature-list">
        <div class="feature-item">
          <div class="icon-sq blue">📅</div>
          <div>
            <strong>Agendamento Perfeito</strong>
            <span>Cruza horários da sua agenda e marca consultas direto pelo chat usando conversação natural.</span>
          </div>
        </div>
        <div class="feature-item">
          <div class="icon-sq yell">💬</div>
          <div>
            <strong>Expertise Clínica (FAQ)</strong>
            <span>Responde dúvidas sobre tratamentos, preços, localização e convênios baseados na base de conhecimento.</span>
          </div>
        </div>
        <div class="feature-item">
          <div class="icon-sq green">💰</div>
          <div>
            <strong>Reativação de Leads</strong>
            <span>Manda follow-ups automáticos e altamente gentis para pacientes que orçaram mas sumiram, recuperando Vendas.</span>
          </div>
        </div>
        <div class="feature-item">
          <div class="icon-sq red">⏳</div>
          <div>
            <strong>Anti-Falta de Pacientes</strong>
            <span>24 horas antes, a IA confirma os agendamentos. Se o paciente desmarcar, ela tenta repor o buraco na agenda.</span>
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
  .glow-card.online::before { background: #4ade80; }

  .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid #252525; padding-bottom: 1rem; }
  .borderless { border-bottom: none; margin-bottom: 0.5rem; padding-bottom: 0px; }
  h2 { color: #fff; font-size: 1.1rem; margin: 0; }
  .muted-text { color: #777; font-size: 0.9rem; margin-bottom: 1.5rem; }
  .bg-alt { background: #0c0c0c; border: 1px solid #1a1a1a; }

  /* Status Badge */
  .status-badge { display: flex; align-items: center; gap: 6px; background: #1a1a1a; border: 1px solid #333; padding: 4px 10px; border-radius: 20px; font-size: 0.75rem; color: #888; font-weight: 600; }
  .status-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: #555; }
  .status-badge.active { color: #4ade80; border-color: rgba(74, 222, 128, 0.2); background: rgba(74, 222, 128, 0.05); }
  .status-badge.active .dot { background: #4ade80; box-shadow: 0 0 8px #4ade80; }
  .status-badge .dot.loading { background: #E5C100; box-shadow: 0 0 8px #E5C100; animation: blink 1s infinite alternate; }

  /* States */
  .empty-state, .qr-state, .connected-state { display: flex; flex-direction: column; align-items: center; text-align: center; justify-content: center; height: 100%; padding: 1rem; }
  
  .wpp-icon-bg { width: 64px; height: 64px; border-radius: 50%; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); color: #22c55e; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; }
  .wpp-icon-bg svg { width: 28px; height: 28px; }
  
  .empty-state h3, .qr-state h3 { color: #fff; font-size: 1.25rem; margin: 0 0 .5rem; }
  .empty-state p { color: #888; font-size: 0.95rem; margin: 0 0 2rem; max-width: 320px; line-height: 1.5; }

  .qr-mockup { width: 240px; height: 240px; background: #fff; border-radius: 12px; margin: 1.5rem 0; position: relative; border: 4px solid #252525; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .real-qr-image { width: 100%; height: 100%; object-fit: contain; }

  .spinner { width: 32px; height: 32px; border: 3px solid rgba(229,193,0,0.2); border-top-color: #E5C100; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem; }

  .handshake-animation { display: flex; align-items: center; gap: 1.5rem; font-size: 2.5rem; margin-bottom: 1.5rem; }
  .sync-arrows { font-size: 1.5rem; color: #E5C100; animation: spin 2s linear infinite; }
  .progress-bar { width: 100%; max-width: 250px; height: 6px; background: #252525; border-radius: 6px; overflow: hidden; margin-top: 1rem; }
  .progress-fill { height: 100%; background: #E5C100; transition: width 0.3s; }

  /* Online State / Dashboard mini */
  .connected-hero { display: flex; flex-direction: column; align-items: center; margin-bottom: 2rem; }
  .pulse-ring { width: 80px; height: 80px; border-radius: 50%; background: rgba(74, 222, 128, 0.1); border: 2px solid rgba(74, 222, 128, 0.4); display: flex; align-items: center; justify-content: center; margin-bottom: 1rem; box-shadow: 0 0 30px rgba(74,222,128,0.2); animation: ringPulse 2s infinite; }
  .brain-icon.outline { font-size: 2.5rem; }
  .connected-hero h3 { color: #4ade80; font-size: 1.4rem; margin: 0 0 0.5rem; }
  .connected-hero p { color: #aaa; margin: 0; font-size: 0.95rem; }

  /* Config toggles */
  .controls-row { display: flex; align-items: center; gap: 1rem; background: #0F0F11; padding: 1rem; border-radius: 12px; border: 1px solid #252525; width: 100%; margin-bottom: 1.5rem; text-align: left; }
  .control-text { display: flex; flex-direction: column; gap: 2px; }
  .control-text strong { color: #fff; font-size: .95rem; }
  .control-text span { color: #666; font-size: .8rem; }
  
  .toggle-switch { position: relative; width: 44px; height: 24px; }
  .toggle-switch input { opacity: 0; width: 0; height: 0; }
  .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #333; transition: .3s; border-radius: 24px; }
  .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
  input:checked + .slider { background-color: #E5C100; }
  input:checked + .slider:before { transform: translateX(20px); background-color: #000; }

  /* Stats Row */
  .stats-row { display: flex; gap: 1rem; width: 100%; margin-bottom: 1rem; }
  .stat-box { flex: 1; background: #0F0F11; border: 1px solid #1a1a1e; border-radius: 12px; padding: 1rem; text-align: left; display: flex; flex-direction: column; gap: 4px; }
  .stat-box.highlight { border-color: rgba(229,193,0,0.3); background: rgba(229,193,0,0.02); }
  .st-label { font-size: 0.7rem; color: #888; text-transform: uppercase; font-weight: 700; }
  .st-val { font-size: 1.8rem; color: #fff; font-weight: 900; }
  .stat-box.highlight .st-val { color: #E5C100; }

  /* Buttons */
  .btn-primary { background: #E5C100; color: #0A0A0A; border: none; padding: .9rem 2rem; border-radius: 10px; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(229, 193, 0, 0.15); }
  .btn-primary:hover { background: #fce141; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(229, 193, 0, 0.25); }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn-ghost { background: transparent; color: #888; border: none; font-size: 0.9rem; margin-top: 1rem; cursor: pointer; font-weight: 600; transition: 0.2s; }
  .btn-ghost:hover { color: #fff; }
  .btn-danger.outline { width: 100%; background: transparent; color: #ff6b6b; border: 1px solid #ff6b6b; padding: .8rem; border-radius: 10px; font-weight: 700; cursor: pointer; transition: 0.2s; }
  .btn-danger.outline:hover { background: rgba(239, 68, 68, 0.1); }
  .mt-4 { margin-top: 1rem; }

  /* Feature List - Apple Style */
  .feature-list { display: flex; flex-direction: column; gap: 1.25rem; }
  .feature-item { display: flex; gap: 1rem; align-items: flex-start; padding: 1rem; background: #111; border: 1px solid #1a1a1a; border-radius: 12px; transition: 0.2s; }
  .feature-item:hover { transform: translateX(5px); border-color: #333; }
  .icon-sq { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
  .icon-sq.blue { background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); }
  .icon-sq.yell { background: rgba(229, 193, 0, 0.1); border: 1px solid rgba(229, 193, 0, 0.2); }
  .icon-sq.green { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); }
  .icon-sq.red { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); }
  
  .feature-item strong { display: block; color: #fff; font-size: 1rem; margin-bottom: 0.3rem; }
  .feature-item span { display: block; color: #888; font-size: 0.85rem; line-height: 1.5; }

  @keyframes ringPulse { 0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.4); } 70% { box-shadow: 0 0 0 20px rgba(74, 222, 128, 0); } 100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); } }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media(max-width: 768px) { .grid { grid-template-columns: 1fr; } .stats-row { flex-direction: column; } }
</style>