<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import { fade, fly, slide } from 'svelte/transition';
  import { getClinicPlan, canAccess } from '$lib/planGuard.js';
  import UpgradeModal from '$lib/components/UpgradeModal.svelte';

  let loading = true;
  let clinicId = null;
  let settings = null;
  let faqCount = 0;
  let postsCount = 0;

  // Plan guard
  let planInfo = null;
  let showUpgrade = false;

  let insights = [];
  let chatMessages = [];
  let chatInput = '';
  let chatLoading = false;
  let userId = null;

  const quickQuestions = [
    '📊 Como posso aumentar meu faturamento este mês?',
    '🎯 Quais pacientes devo reativar?',
    '📱 Como melhorar minha presença digital?',
    '⚡ O que posso automatizar na minha clínica?'
  ];

  async function sendChat(text) {
    const msg = text || chatInput.trim();
    if (!msg || chatLoading) return;
    chatInput = '';
    chatMessages = [...chatMessages, { role: 'user', content: msg }];
    chatLoading = true;

    try {
      const res = await fetch('/api/ai/ceo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, clinicId, userId })
      });
      const data = await res.json();
      if (data.reply) {
        chatMessages = [...chatMessages, { role: 'assistant', content: data.reply }];
      } else {
        chatMessages = [...chatMessages, { role: 'assistant', content: '⚠️ ' + (data.error || 'Erro ao consultar a IA.') }];
      }
    } catch {
      chatMessages = [...chatMessages, { role: 'assistant', content: '⚠️ Erro de conexão com o servidor.' }];
    } finally {
      chatLoading = false;
    }
  }

  onMount(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;

      const { data: member } = await supabase
        .from('clinic_members')
        .select('clinic_id')
        .eq('user_id', user.id).limit(1).maybeSingle();

      clinicId = member?.clinic_id ?? null;
      if (!clinicId) return;

      const [settingsRes, faqRes, postsRes] = await Promise.all([
        supabase.from('clinic_settings').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('faq_items').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId),
        supabase.from('content_posts').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId)
      ]);

      settings = settingsRes.data;
      faqCount = faqRes.count ?? 0;
      postsCount = postsRes.count ?? 0;

      // Verificar plano
      planInfo = await getClinicPlan(clinicId);
      if (!canAccess(planInfo.limits, 'ceo_virtual')) {
        loading = false;
        return;
      }

      // Array temporário para popular e garantir a reatividade do Svelte
      let newInsights = [];

      if (!settings?.specialty) {
        newInsights.push({ type: 'urgent', icon: '⚠️', title: 'Configuração incompleta', desc: 'Você ainda não definiu a especialidade da clínica. Isso afeta a qualidade do atendimento automático e a geração de conteúdo.', action: '/dashboard/configuracoes', cta: 'Configurar agora' });
      }
      if (faqCount === 0) {
        newInsights.push({ type: 'warning', icon: '💬', title: 'FAQ Vazio: IA sem contexto', desc: 'O agente de atendimento precisa de uma base de conhecimento para não dar respostas genéricas aos seus pacientes.', action: '/dashboard/faq', cta: 'Adicionar perguntas (FAQ)' });
      }
      if (faqCount > 0 && faqCount < 5) {
        newInsights.push({ type: 'info', icon: '📚', title: 'Expanda sua Base de Conhecimento', desc: `Você tem ${faqCount} pergunta(s) cadastrada(s). Clínicas com 10+ perguntas têm um atendimento autônomo muito mais preciso.`, action: '/dashboard/faq', cta: 'Ensinar mais à IA' });
      }
      if (postsCount === 0) {
        newInsights.push({ type: 'warning', icon: '✍️', title: 'Presença Digital Inativa', desc: 'Clínicas que publicam 3+ posts por semana têm até 40% mais agendamentos via redes sociais.', action: '/dashboard/conteudo', cta: 'Gerar 1º Post' });
      }
      if (newInsights.length === 0) {
        newInsights.push({ type: 'success', icon: '✅', title: 'Máquina rodando perfeitamente!', desc: 'Sua clínica está com uma ótima base de dados. Continue criando conteúdo e mantendo as configurações atualizadas.', action: null, cta: null });
      }

      insights = newInsights;

    } catch (e) {
      console.error(e);
    } finally {
      // Pequeno delay artificial (500ms) apenas para o efeito de "análise da IA" ficar mais claro para o usuário
      setTimeout(() => { loading = false; }, 500);
    }
  });
</script>

<svelte:head><title>CEO Virtual • Lumia</title></svelte:head>

<div class="wrap">
  <div class="head">
    <div class="title-row">
      <p class="label">CEO VIRTUAL</p>
      <div class="ai-status">
        <div class="pulse-dot"></div>
        <span>Monitoramento IA Ativo</span>
      </div>
    </div>
    <h1>Diagnóstico do negócio</h1>
    <p class="sub">Insights proativos extraídos dos dados da sua clínica em tempo real.</p>
  </div>

  {#if loading}
    <div class="loading-state" out:fade={{ duration: 200 }}>
      <div class="scan-line"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card opacity-70"></div>
      <div class="skeleton-card opacity-40"></div>
      <p class="scanning-text">A inteligência artificial está analisando suas métricas...</p>
    </div>
  {:else if !clinicId}
    <div class="card empty-card" in:fade>
      <span class="icon-lg">🏢</span>
      <h3>Nenhuma clínica vinculada</h3>
      <p class="muted">Finalize o processo de setup para que o CEO Virtual possa analisar os dados.</p>
      <a href="/setup" class="btn-primary">Ir para o Setup</a>
    </div>
  {:else if planInfo && !canAccess(planInfo.limits, 'ceo_virtual')}
    <div class="locked-state" in:fly={{ y: 20, duration: 400 }}>
      <div class="locked-icon">🔒</div>
      <h2>CEO Virtual é exclusivo do plano Pro</h2>
      <p class="locked-desc">Receba diagnósticos inteligentes em tempo real baseados nos dados da sua clínica.</p>
      <button class="btn-unlock" on:click={() => showUpgrade = true}>Ver plano Pro →</button>
    </div>
    <UpgradeModal clinicId={clinicId} bind:show={showUpgrade} feature="ceo_virtual" currentPlan={planInfo.planName} requiredPlan="Pro" />
  {:else}
    <div class="insights">
      {#each insights as ins, index}
        <div class="ins-card {ins.type}" in:fly={{ y: 20, duration: 400, delay: index * 100 }}>
          <div class="ins-content">
            <div class="ins-icon-wrapper">
              <span class="ins-icon">{ins.icon}</span>
            </div>
            <div class="ins-text">
              <h3>{ins.title}</h3>
              <p>{ins.desc}</p>
            </div>
          </div>
          
          {#if ins.action}
            <div class="ins-action">
              <a href={ins.action} class="btn-cta">{ins.cta}</a>
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <div class="coming-soon-card" in:fly={{ y: 20, duration: 400, delay: insights.length * 100 + 100 }}>
      <div class="coming-header">
        <span class="lock-icon">🧠</span>
        <h3>Pergunte ao CEO Virtual</h3>
      </div>

      <!-- Quick Questions -->
      {#if chatMessages.length === 0}
        <div class="quick-grid">
          {#each quickQuestions as q}
            <button class="quick-btn" on:click={() => sendChat(q.slice(2).trim())}>{q}</button>
          {/each}
        </div>
      {/if}

      <!-- Chat Messages -->
      <div class="chat-messages">
        {#each chatMessages as msg}
          <div class="chat-msg {msg.role}" in:fly={{ y: 10, duration: 200 }}>
            <div class="msg-avatar">{msg.role === 'user' ? '👤' : '🧠'}</div>
            <div class="msg-bubble">
              <p>{msg.content}</p>
            </div>
          </div>
        {/each}
        {#if chatLoading}
          <div class="chat-msg assistant">
            <div class="msg-avatar">🧠</div>
            <div class="msg-bubble typing">
              <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            </div>
          </div>
        {/if}
      </div>

      <!-- Input -->
      <div class="chat-input-row">
        <input type="text" bind:value={chatInput} placeholder="Pergunte algo sobre sua clínica..." on:keydown={(e) => e.key === 'Enter' && sendChat()} />
        <button class="btn-send" on:click={() => sendChat()} disabled={chatLoading || !chatInput.trim()}>↑</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .wrap { max-width: 1000px; margin: 0 auto; padding-bottom: 3rem; }
  
  /* Header & Status */
  .head { margin-bottom: 2rem; }
  .title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: .3rem; }
  .label { color: #555; letter-spacing: 3px; font-size: .72rem; text-transform: uppercase; margin: 0; font-weight: 700; }
  
  .ai-status { display: flex; align-items: center; gap: 8px; background: rgba(74, 222, 128, 0.05); border: 1px solid rgba(74, 222, 128, 0.15); padding: 4px 10px; border-radius: 20px; }
  .pulse-dot { width: 8px; height: 8px; background: #4ade80; border-radius: 50%; box-shadow: 0 0 8px #4ade80; animation: pulse 2s infinite; }
  .ai-status span { color: #4ade80; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.5px; }
  
  @keyframes pulse {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(74, 222, 128, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
  }

  h1 { color: #fff; font-size: 2.2rem; margin: 0 0 .5rem; letter-spacing: -.5px; }
  .sub { color: #888; margin: 0; font-size: 1rem; line-height: 1.5; }
  .muted { color: #666; font-size: 0.9rem; line-height: 1.5; }

  /* Loading Skeleton */
  .loading-state { display: flex; flex-direction: column; gap: 1rem; position: relative; padding: 2rem 0; }
  .skeleton-card { height: 90px; background: #141414; border: 1px solid #222; border-radius: 16px; position: relative; overflow: hidden; }
  .opacity-70 { opacity: 0.7; }
  .opacity-40 { opacity: 0.4; }
  .scan-line { position: absolute; top: 0; left: -10%; width: 120%; height: 2px; background: #E5C100; box-shadow: 0 0 15px 2px rgba(229, 193, 0, 0.5); z-index: 10; animation: scan 1.5s ease-in-out infinite alternate; }
  .scanning-text { text-align: center; color: #E5C100; font-size: 0.85rem; font-weight: 600; letter-spacing: 1px; margin-top: 1rem; animation: blink 1.5s infinite; }
  
  @keyframes scan { from { top: 0; } to { top: 100%; } }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

  /* Empty State */
  .empty-card { text-align: center; padding: 3rem 2rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .icon-lg { font-size: 3rem; margin-bottom: 0.5rem; }
  .btn-primary { background: #E5C100; color: #0A0A0A; padding: 0.8rem 1.5rem; border-radius: 10px; font-weight: 700; text-decoration: none; margin-top: 1rem; transition: all 0.2s; }
  .btn-primary:hover { background: #fce141; transform: translateY(-2px); }

  /* Insights Cards */
  .insights { display: flex; flex-direction: column; gap: 1.25rem; }

  .ins-card {
    background: #111; border: 1px solid #252525; border-radius: 16px; padding: 1.5rem;
    display: flex; align-items: center; justify-content: space-between; gap: 2rem;
    transition: all 0.3s ease; position: relative; overflow: hidden;
  }
  .ins-card:hover { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,0,0,0.3); border-color: #333; }
  
  /* Gradientes sutis por tipo */
  .ins-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; border-radius: 4px 0 0 4px; }
  .urgent::before { background: #ef4444; }
  .warning::before { background: #E5C100; }
  .info::before { background: #3b82f6; }
  .success::before { background: #4ade80; }

  .ins-content { display: flex; gap: 1.25rem; align-items: flex-start; flex: 1; }
  .ins-icon-wrapper { background: #1a1a1a; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid #2a2a2a; }
  .ins-icon { font-size: 1.4rem; }
  
  .ins-text h3 { color: #fff; margin: 0 0 .4rem; font-size: 1.1rem; letter-spacing: -0.3px; }
  .ins-text p { color: #888; font-size: .9rem; line-height: 1.5; margin: 0; }

  .ins-action { flex-shrink: 0; }
  .btn-cta {
    display: inline-block; padding: .6rem 1.2rem; background: #1a1a1a; color: #fff;
    border: 1px solid #333; border-radius: 10px; font-size: .85rem; font-weight: 600;
    text-decoration: none; transition: all .2s; white-space: nowrap;
  }
  
  /* Cores de hover dos botões baseadas no tipo de card */
  .urgent .btn-cta:hover { background: rgba(239, 68, 68, 0.1); border-color: #ef4444; color: #ef4444; }
  .warning .btn-cta:hover { background: rgba(229, 193, 0, 0.1); border-color: #E5C100; color: #E5C100; }
  .info .btn-cta:hover { background: rgba(59, 130, 246, 0.1); border-color: #3b82f6; color: #3b82f6; }
  .success .btn-cta:hover { background: rgba(74, 222, 128, 0.1); border-color: #4ade80; color: #4ade80; }

  /* Coming Soon Area */
  .coming-soon-card { background: linear-gradient(145deg, #111 0%, #0A0A0A 100%); border: 1px solid #222; border-radius: 16px; padding: 1.5rem; margin-top: 2rem; position: relative; }
  .coming-soon-card::after { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.01) 10px, rgba(255,255,255,0.01) 20px); pointer-events: none; border-radius: 16px; }
  
  .coming-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; border-bottom: 1px solid #222; padding-bottom: 1rem; }
  .lock-icon { font-size: 1.2rem; filter: grayscale(1) opacity(0.6); }
  .coming-header h3 { color: #888; font-size: 1rem; margin: 0; text-transform: uppercase; letter-spacing: 1px; }

  .coming-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  .coming-item { display: flex; flex-direction: column; gap: 0.3rem; }
  .coming-item strong { color: #aaa; font-size: 0.95rem; }
  .coming-item span { color: #555; font-size: 0.85rem; line-height: 1.4; }

  /* Locked State */
  .locked-state { text-align: center; padding: 4rem 2rem; background: #111; border: 1px solid #222; border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .locked-icon { font-size: 3rem; }
  .locked-state h2 { color: #fff; font-size: 1.3rem; margin: 0; }
  .locked-desc { color: #888; font-size: 0.9rem; margin: 0; line-height: 1.5; max-width: 400px; }
  .btn-unlock { background: #E5C100; color: #000; border: none; padding: .8rem 1.5rem; border-radius: 10px; font-weight: 700; font-size: 0.95rem; cursor: pointer; transition: all 0.2s; }
  .btn-unlock:hover { background: #fce141; transform: translateY(-2px); }

  @media (max-width: 768px) {
    .ins-card { flex-direction: column; align-items: flex-start; gap: 1.5rem; }
    .ins-action { width: 100%; }
    .btn-cta { width: 100%; text-align: center; box-sizing: border-box; }
    .coming-grid { grid-template-columns: 1fr; }
  }

  /* Chat UI */
  .quick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; margin-bottom: 1rem; }
  .quick-btn { background: #1a1a1a; border: 1px solid #2a2a2a; color: #aaa; padding: .65rem .75rem; border-radius: 10px; font-size: .8rem; font-weight: 500; cursor: pointer; text-align: left; transition: 0.2s; }
  .quick-btn:hover { border-color: #E5C100; color: #E5C100; }

  .chat-messages { display: flex; flex-direction: column; gap: .75rem; max-height: 400px; overflow-y: auto; margin-bottom: 1rem; padding: .5rem 0; }
  .chat-msg { display: flex; gap: .75rem; align-items: flex-start; }
  .chat-msg.assistant { flex-direction: row; }
  .chat-msg.user { flex-direction: row-reverse; }
  .msg-avatar { width: 32px; height: 32px; border-radius: 50%; background: #1a1a1a; display: flex; align-items: center; justify-content: center; font-size: .9rem; flex-shrink: 0; border: 1px solid #2a2a2a; }
  .msg-bubble { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 12px; padding: .75rem 1rem; max-width: 75%; }
  .chat-msg.user .msg-bubble { background: rgba(229,193,0,0.08); border-color: rgba(229,193,0,0.2); }
  .msg-bubble p { color: #ccc; font-size: .85rem; line-height: 1.6; margin: 0; white-space: pre-wrap; }
  .chat-msg.user .msg-bubble p { color: #E5C100; }

  .msg-bubble.typing { display: flex; gap: 4px; align-items: center; padding: .6rem 1rem; }
  .dot { width: 6px; height: 6px; background: #555; border-radius: 50%; animation: dotBounce 1.2s infinite; }
  .dot:nth-child(2) { animation-delay: .2s; }
  .dot:nth-child(3) { animation-delay: .4s; }
  @keyframes dotBounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }

  .chat-input-row { display: flex; gap: .5rem; }
  .chat-input-row input { flex: 1; background: #0A0A0A; border: 1px solid #2a2a2a; border-radius: 12px; padding: .8rem 1rem; color: #fff; font-size: .9rem; outline: none; }
  .chat-input-row input:focus { border-color: #E5C100; }
  .btn-send { width: 44px; height: 44px; background: #E5C100; color: #000; border: none; border-radius: 12px; font-size: 1.2rem; font-weight: 900; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
  .btn-send:hover { background: #fce141; }
  .btn-send:disabled { opacity: 0.4; cursor: not-allowed; }

  @media (max-width: 768px) {
    .quick-grid { grid-template-columns: 1fr; }
  }
</style>