<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import { fade, fly } from 'svelte/transition';
  import { getClinicPlan, canAccess } from '$lib/planGuard.js';
  import UpgradeModal from '$lib/components/UpgradeModal.svelte';

  let loading = true;
  let clinicId = null;
  let settings = null;

  // Plan
  let planInfo = null;
  let hasAccess = false;
  let showUpgrade = false;

  // Content generation state
  let topic = '';
  let format = 'instagram';
  let generating = false;
  let generatedPack = null;
  let savedPacks = [];

  const formats = [
    { id: 'instagram', label: '📸 Post Instagram', desc: 'Imagem + legenda' },
    { id: 'stories', label: '📱 Série de Stories', desc: '3-5 slides sequenciais' },
    { id: 'reels', label: '🎬 Script de Reels', desc: 'Roteiro 30-60s' },
    { id: 'blog', label: '📝 Artigo Blog', desc: 'Texto longo + SEO' }
  ];

  const suggestions = [
    '🦷 Dicas de saúde bucal para o verão',
    '💉 Mitos sobre vacinas que você precisa saber',
    '🧘 Benefícios da meditação para ansiedade',
    '❤️ Sinais de alerta para problemas cardíacos',
    '🏃 Como começar a se exercitar do zero',
    '🧠 Saúde mental no ambiente de trabalho'
  ];

  onMount(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: member } = await supabase
        .from('clinic_members')
        .select('clinic_id')
        .eq('user_id', user.id).limit(1).maybeSingle();

      clinicId = member?.clinic_id ?? null;
      if (!clinicId) return;

      [planInfo, settings] = await Promise.all([
        getClinicPlan(clinicId),
        supabase.from('clinic_settings').select('specialty, tone, services').eq('user_id', user.id).maybeSingle().then(r => r.data)
      ]);

      hasAccess = planInfo ? canAccess(planInfo.limits, 'content_ai') : false;

      // Load saved content_posts
      const { data } = await supabase.from('content_posts')
        .select('*').eq('clinic_id', clinicId)
        .order('created_at', { ascending: false }).limit(10);
      savedPacks = data ?? [];

    } catch (e) { console.error(e); }
    finally { loading = false; }
  });

  function generateContent() {
    if (!topic.trim()) return;
    generating = true;

    // Simula geração (no futuro: chamada à Edge Function com Claude API)
    setTimeout(() => {
      const specialty = settings?.specialty || 'saúde';
      const toneLabel = settings?.tone || 'Profissional';

      generatedPack = {
        topic: topic,
        format: format,
        idea: `Série de conteúdo sobre "${topic}" para clínica de ${specialty}.`,
        hook: getRandomHook(topic),
        visual: getVisualSuggestion(format, topic),
        copy: generateCopy(topic, toneLabel, format),
        hashtags: generateHashtags(topic, specialty),
        generatedAt: new Date().toLocaleString('pt-BR')
      };
      generating = false;
    }, 2000);
  }

  function getRandomHook(topic) {
    const hooks = [
      `Você sabia que ${topic.toLowerCase()} pode mudar completamente sua qualidade de vida?`,
      `A verdade sobre ${topic.toLowerCase()} que ninguém te contou.`,
      `3 coisas que você precisa saber sobre ${topic.toLowerCase()} hoje.`,
      `O erro mais comum quando se trata de ${topic.toLowerCase()}.`
    ];
    return hooks[Math.floor(Math.random() * hooks.length)];
  }

  function getVisualSuggestion(fmt, topic) {
    if (fmt === 'instagram') return `Foto profissional do consultório com texto overlay: "${topic}". Cores suaves, boa iluminação.`;
    if (fmt === 'stories') return `Slide 1: Pergunta provocativa. Slide 2: Dado surpreendente. Slide 3: Dica prática. Slide 4: CTA para agendar.`;
    if (fmt === 'reels') return `Câmera frontal do profissional falando, com cortes dinâmicos e texto animado. 30-45 segundos.`;
    return `Imagem de destaque com título chamativo e preview do artigo.`;
  }

  function generateCopy(topic, tone, fmt) {
    const toneMap = {
      'Profissional': 'com linguagem técnica acessível e embasamento científico',
      'Humanizado': 'de forma acolhedora, empática e próxima do paciente',
      'Direto': 'de forma objetiva, clara e sem rodeios',
      'Premium': 'com sofisticação, exclusividade e cuidado nos detalhes'
    };
    return `[Conteúdo será gerado pela IA Claude]\n\nTópico: ${topic}\nFormato: ${formats.find(f => f.id === fmt)?.label}\nTom: ${tone} — ${toneMap[tone] || ''}\n\n💡 Quando a API Anthropic for conectada, a IA vai gerar:\n• Legenda completa otimizada para engajamento\n• Adaptada ao tom de voz da sua clínica\n• Com CTA personalizado para agendamento\n• Baseada nas informações do Treinamento da IA`;
  }

  function generateHashtags(topic, specialty) {
    const base = ['#saude', '#bemestar', '#clinica', '#cuidados'];
    const topicTag = '#' + topic.toLowerCase().replace(/\s+/g, '').replace(/[^a-záéíóúãõê]/gi, '').slice(0, 20);
    const specTag = '#' + specialty.toLowerCase().replace(/\s+/g, '');
    return [...new Set([topicTag, specTag, ...base])].slice(0, 8).join(' ');
  }

  async function saveDraft() {
    if (!generatedPack || !clinicId) return;
    const { error } = await supabase.from('content_posts').insert({
      clinic_id: clinicId,
      title: generatedPack.topic,
      body: generatedPack.copy,
      status: 'draft'
    });
    if (!error) {
      const { data } = await supabase.from('content_posts')
        .select('*').eq('clinic_id', clinicId)
        .order('created_at', { ascending: false }).limit(10);
      savedPacks = data ?? [];
    }
  }
</script>

<svelte:head><title>Conteúdo IA • Lumia</title></svelte:head>

<div class="wrap" in:fade>
  <div class="header">
    <div>
      <p class="label">CONTEÚDO IA</p>
      <h1>Gerador de Conteúdo</h1>
      <p class="sub">Crie posts, stories e artigos profissionais para sua clínica em segundos.</p>
    </div>
  </div>

  {#if loading}
    <p class="muted">Carregando...</p>

  {:else if !hasAccess}
    <div class="locked-state" in:fly={{ y: 20, duration: 400 }}>
      <span class="locked-icon">✍️</span>
      <h2>Geração de Conteúdo com IA</h2>
      <p class="locked-desc">Crie em segundos posts para Instagram, scripts de Reels, séries de Stories e artigos para blog — tudo adaptado à sua clínica.</p>
      <button class="btn-unlock" on:click={() => showUpgrade = true}>Desbloquear no plano Pro →</button>
    </div>

  {:else}
    <div class="two-col" in:fly={{ y: 20, duration: 400 }}>
      <!-- Coluna esquerda: Configuração -->
      <div class="config-panel">
        <div class="config-card">
          <h2>Criar novo conteúdo</h2>
          
          <div class="field">
            <label>Sobre o que quer falar?</label>
            <textarea rows="2" placeholder="Ex: Dicas de prevenção, benefícios de um procedimento, caso de sucesso..." bind:value={topic}></textarea>
          </div>

          <div class="field">
            <label>Formato</label>
            <div class="format-grid">
              {#each formats as f}
                <button class="format-btn" class:active={format === f.id} on:click={() => format = f.id}>
                  <strong>{f.label}</strong>
                  <span>{f.desc}</span>
                </button>
              {/each}
            </div>
          </div>

          <button class="btn-generate" on:click={generateContent} disabled={generating || !topic.trim()}>
            {generating ? '✨ Gerando com IA...' : '✨ Gerar Conteúdo'}
          </button>

          {#if settings?.tone}
            <p class="tone-tag">Tom: {settings.tone} • {settings.specialty || 'Saúde'}</p>
          {/if}
        </div>

        <!-- Sugestões -->
        <div class="suggestions-card">
          <h3>💡 Sugestões rápidas</h3>
          <div class="suggestion-list">
            {#each suggestions as s}
              <button class="sug-btn" on:click={() => { topic = s.slice(2).trim(); }}>
                {s}
              </button>
            {/each}
          </div>
        </div>
      </div>

      <!-- Coluna direita: Resultado -->
      <div class="result-panel">
        {#if generatedPack}
          <div class="result-card" in:fly={{ y: 20, duration: 400 }}>
            <div class="result-head">
              <h2>Resultado Gerado</h2>
              <span class="time">{generatedPack.generatedAt}</span>
            </div>

            <div class="result-section">
              <label>💡 Ideia Central</label>
              <p>{generatedPack.idea}</p>
            </div>

            <div class="result-section highlight-box">
              <label>🎣 Hook (Gancho)</label>
              <p class="hook-text">"{generatedPack.hook}"</p>
            </div>

            <div class="result-section">
              <label>🎨 Sugestão Visual</label>
              <p>{generatedPack.visual}</p>
            </div>

            <div class="result-section">
              <label>📝 Legenda / Copy</label>
              <div class="copy-box">{generatedPack.copy}</div>
            </div>

            <div class="result-section">
              <label>🏷️ Hashtags</label>
              <p class="hashtags">{generatedPack.hashtags}</p>
            </div>

            <div class="result-actions">
              <button class="btn-save-draft" on:click={saveDraft}>💾 Salvar como rascunho</button>
              <button class="btn-copy" on:click={() => navigator.clipboard.writeText(generatedPack.copy)}>📋 Copiar texto</button>
            </div>
          </div>

        {:else if generating}
          <div class="generating-state">
            <div class="gen-pulse"></div>
            <h3>Gerando com IA...</h3>
            <p>A IA está criando conteúdo personalizado para sua clínica.</p>
          </div>

        {:else}
          <div class="empty-result">
            <span class="empty-icon">✍️</span>
            <h3>Pronto para criar</h3>
            <p>Escolha um tema e formato ao lado para gerar seu primeiro conteúdo com IA.</p>
          </div>
        {/if}

        <!-- Histórico -->
        {#if savedPacks.length > 0}
          <div class="history">
            <h3>📄 Últimos rascunhos</h3>
            {#each savedPacks as pack}
              <div class="history-item">
                <strong>{pack.title || 'Sem título'}</strong>
                <div class="hist-meta">
                  <span class="hist-status" class:draft={pack.status === 'draft'} class:published={pack.status === 'published'}>
                    {pack.status === 'draft' ? 'Rascunho' : pack.status === 'approved' ? 'Aprovado' : 'Publicado'}
                  </span>
                  <span class="hist-date">{new Date(pack.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<UpgradeModal clinicId={clinicId} bind:show={showUpgrade} feature="content_ai" currentPlan={planInfo?.planName ?? 'Starter'} requiredPlan="Pro" />

<style>
  .wrap { max-width: 1200px; margin: 0 auto; padding-bottom: 2rem; }
  .header { margin-bottom: 1.5rem; }
  .label { color: #555; letter-spacing: 3px; font-size: .72rem; text-transform: uppercase; margin: 0 0 .3rem; font-weight: 700; }
  h1 { color: #fff; font-size: 2rem; margin: 0 0 .35rem; letter-spacing: -.5px; }
  .sub { color: #777; margin: 0; font-size: .9rem; }
  .muted { color: #666; font-size: .9rem; }

  /* Locked */
  .locked-state { text-align: center; padding: 4rem 2rem; background: #111; border: 1px solid #222; border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .locked-icon { font-size: 3rem; }
  .locked-state h2 { color: #fff; font-size: 1.3rem; margin: 0; }
  .locked-desc { color: #888; font-size: .9rem; margin: 0; line-height: 1.5; max-width: 450px; }
  .btn-unlock { background: #E5C100; color: #000; border: none; padding: .8rem 1.5rem; border-radius: 10px; font-weight: 700; font-size: .95rem; cursor: pointer; transition: all 0.2s; }
  .btn-unlock:hover { background: #fce141; transform: translateY(-2px); }

  /* Two column layout */
  .two-col { display: grid; grid-template-columns: 380px 1fr; gap: 1.5rem; align-items: start; }

  /* Config panel */
  .config-card { background: #141414; border: 1px solid #252525; border-radius: 16px; padding: 1.5rem; margin-bottom: 1rem; }
  .config-card h2 { color: #fff; font-size: 1.1rem; margin: 0 0 1.25rem; font-weight: 800; }
  .field { margin-bottom: 1.25rem; }
  .field label { display: block; color: #888; font-size: .7rem; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700; margin-bottom: .5rem; }
  textarea { width: 100%; background: #0A0A0A; border: 1px solid #2a2a2a; border-radius: 10px; padding: .85rem 1rem; color: #fff; font-size: .9rem; outline: none; resize: vertical; font-family: 'Inter', sans-serif; box-sizing: border-box; }
  textarea:focus { border-color: #E5C100; }

  .format-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .5rem; }
  .format-btn { background: #0A0A0A; border: 1px solid #2a2a2a; border-radius: 10px; padding: .75rem; text-align: left; cursor: pointer; transition: 0.2s; }
  .format-btn strong { display: block; color: #888; font-size: .8rem; margin-bottom: 2px; }
  .format-btn span { color: #555; font-size: .65rem; }
  .format-btn.active { border-color: #E5C100; background: rgba(229,193,0,0.04); }
  .format-btn.active strong { color: #E5C100; }
  .format-btn:hover:not(.active) { border-color: #444; }

  .btn-generate { width: 100%; background: #E5C100; color: #000; border: none; padding: 1rem; border-radius: 12px; font-weight: 800; font-size: .95rem; cursor: pointer; transition: 0.2s; }
  .btn-generate:hover { background: #fce141; transform: translateY(-1px); }
  .btn-generate:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .tone-tag { text-align: center; color: #555; font-size: .75rem; font-weight: 600; margin: .75rem 0 0; }

  /* Suggestions */
  .suggestions-card { background: #141414; border: 1px solid #252525; border-radius: 16px; padding: 1.25rem; }
  .suggestions-card h3 { color: #fff; font-size: .95rem; margin: 0 0 .75rem; font-weight: 700; }
  .suggestion-list { display: flex; flex-direction: column; gap: .4rem; }
  .sug-btn { background: #0A0A0A; border: 1px solid #1A1A1E; color: #888; padding: .6rem .75rem; border-radius: 8px; font-size: .8rem; font-weight: 500; cursor: pointer; text-align: left; transition: 0.2s; }
  .sug-btn:hover { border-color: #E5C100; color: #E5C100; }

  /* Result panel */
  .result-card { background: #141414; border: 1px solid #252525; border-radius: 16px; padding: 1.5rem; margin-bottom: 1rem; }
  .result-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; padding-bottom: .75rem; border-bottom: 1px solid #1A1A1E; }
  .result-head h2 { color: #fff; font-size: 1.1rem; margin: 0; font-weight: 800; }
  .time { color: #555; font-size: .7rem; font-weight: 600; }

  .result-section { margin-bottom: 1.25rem; }
  .result-section label { display: block; color: #888; font-size: .7rem; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700; margin-bottom: .4rem; }
  .result-section p { color: #ccc; font-size: .9rem; line-height: 1.5; margin: 0; }

  .highlight-box { background: #0F0F11; border-left: 3px solid #E5C100; padding: 1rem 1.25rem; border-radius: 0 10px 10px 0; }
  .hook-text { color: #E5C100 !important; font-style: italic; font-size: .95rem !important; font-weight: 600; }

  .copy-box { background: #0A0A0A; padding: 1.25rem; border-radius: 10px; color: #999; font-size: .85rem; line-height: 1.6; white-space: pre-wrap; border: 1px solid #1A1A1E; }

  .hashtags { color: #60a5fa !important; font-size: .85rem !important; letter-spacing: 0.5px; }

  .result-actions { display: flex; gap: .75rem; padding-top: .5rem; }
  .btn-save-draft, .btn-copy { flex: 1; padding: .7rem; border-radius: 10px; font-weight: 700; font-size: .85rem; cursor: pointer; transition: 0.2s; }
  .btn-save-draft { background: #fff; color: #000; border: none; } .btn-save-draft:hover { background: #E5C100; }
  .btn-copy { background: transparent; color: #888; border: 1px solid #2a2a2a; } .btn-copy:hover { border-color: #E5C100; color: #E5C100; }

  /* Generating state */
  .generating-state { text-align: center; padding: 4rem 2rem; background: #141414; border: 1px solid #252525; border-radius: 16px; }
  .gen-pulse { width: 48px; height: 48px; margin: 0 auto 1.5rem; border-radius: 50%; background: #E5C100; animation: pulse-gen 1.5s infinite; }
  @keyframes pulse-gen { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.1); } }
  .generating-state h3 { color: #fff; margin: 0 0 .5rem; } .generating-state p { color: #666; margin: 0; font-size: .85rem; }

  /* Empty result */
  .empty-result { text-align: center; padding: 4rem 2rem; background: #141414; border: 1px solid #252525; border-radius: 16px; margin-bottom: 1rem; }
  .empty-icon { font-size: 2.5rem; display: block; margin-bottom: 1rem; }
  .empty-result h3 { color: #fff; margin: 0 0 .5rem; font-size: 1.05rem; }
  .empty-result p { color: #666; font-size: .85rem; margin: 0; max-width: 300px; margin: 0 auto; line-height: 1.5; }

  /* History */
  .history { background: #141414; border: 1px solid #252525; border-radius: 16px; padding: 1.25rem; }
  .history h3 { color: #fff; font-size: .95rem; margin: 0 0 .75rem; font-weight: 700; }
  .history-item { display: flex; justify-content: space-between; align-items: center; padding: .7rem .75rem; background: #0F0F11; border-radius: 8px; margin-bottom: .4rem; }
  .history-item strong { color: #ccc; font-size: .85rem; }
  .hist-meta { display: flex; gap: .75rem; align-items: center; }
  .hist-status { font-size: .65rem; font-weight: 800; padding: 3px 8px; border-radius: 5px; }
  .hist-status.draft { background: rgba(245,158,11,0.1); color: #F59E0B; }
  .hist-status.published { background: rgba(34,197,94,0.1); color: #22C55E; }
  .hist-date { color: #555; font-size: .7rem; }

  @media (max-width: 900px) {
    .two-col { grid-template-columns: 1fr; }
    .format-grid { grid-template-columns: 1fr; }
    .result-actions { flex-direction: column; }
  }
</style>