<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import { fade, fly } from 'svelte/transition';

  let loading = true;
  let clinicId = null;

  let metrics = {
    totalPatients: 0,
    activePatients: 0,
    leadPatients: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    noShowAppointments: 0,
    noShowRate: 0,
    totalFaq: 0,
    totalPosts: 0,
    hasSettings: false
  };

  // Health score calculado
  let healthScore = 0;
  let healthFactors = [];

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

      const [patientsRes, appointmentsRes, faqRes, postsRes, settingsRes] = await Promise.all([
        supabase.from('patients').select('status').eq('clinic_id', clinicId),
        supabase.from('appointments').select('status').eq('clinic_id', clinicId),
        supabase.from('faq_items').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId),
        supabase.from('content_posts').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId),
        supabase.from('clinic_settings').select('specialty').eq('user_id', user.id).maybeSingle()
      ]);

      const patients = patientsRes.data ?? [];
      const appointments = appointmentsRes.data ?? [];
      const noShows = appointments.filter(a => a.status === 'no-show').length;

      metrics = {
        totalPatients: patients.length,
        activePatients: patients.filter(p => p.status === 'ativo').length,
        leadPatients: patients.filter(p => p.status === 'lead').length,
        totalAppointments: appointments.length,
        completedAppointments: appointments.filter(a => a.status === 'concluido').length,
        noShowAppointments: noShows,
        noShowRate: appointments.length > 0 ? Math.round((noShows / appointments.length) * 100) : 0,
        totalFaq: faqRes.count ?? 0,
        totalPosts: postsRes.count ?? 0,
        hasSettings: !!settingsRes.data?.specialty
      };

      calculateHealth();
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => { loading = false; }, 600);
    }
  });

  function calculateHealth() {
    let score = 0;
    let factors = [];

    // Configuração (20 pts)
    if (metrics.hasSettings) {
      score += 20;
      factors.push({ name: 'Configuração', score: 20, max: 20, status: 'good', detail: 'Clínica configurada' });
    } else {
      factors.push({ name: 'Configuração', score: 0, max: 20, status: 'critical', detail: 'Especialidade não definida' });
    }

    // Base de Conhecimento (20 pts)
    const faqScore = Math.min(20, metrics.totalFaq * 2);
    score += faqScore;
    factors.push({
      name: 'Base de Conhecimento',
      score: faqScore, max: 20,
      status: faqScore >= 16 ? 'good' : faqScore >= 8 ? 'warning' : 'critical',
      detail: `${metrics.totalFaq} perguntas no FAQ`
    });

    // Conteúdo (15 pts)
    const contentScore = Math.min(15, metrics.totalPosts * 3);
    score += contentScore;
    factors.push({
      name: 'Presença Digital',
      score: contentScore, max: 15,
      status: contentScore >= 12 ? 'good' : contentScore >= 6 ? 'warning' : 'critical',
      detail: `${metrics.totalPosts} posts criados`
    });

    // CRM / Pacientes (25 pts)
    const patientScore = metrics.totalPatients > 0 ? Math.min(25, 10 + Math.min(15, metrics.activePatients * 1.5)) : 0;
    score += patientScore;
    factors.push({
      name: 'CRM de Pacientes',
      score: Math.round(patientScore), max: 25,
      status: patientScore >= 20 ? 'good' : patientScore >= 10 ? 'warning' : 'critical',
      detail: `${metrics.totalPatients} contatos (${metrics.activePatients} ativos)`
    });

    // Agenda / No-show (20 pts)
    let agendaScore = 0;
    if (metrics.totalAppointments === 0) {
      agendaScore = 0;
    } else {
      agendaScore = metrics.noShowRate <= 5 ? 20 : metrics.noShowRate <= 15 ? 14 : metrics.noShowRate <= 30 ? 8 : 3;
    }
    score += agendaScore;
    factors.push({
      name: 'Saúde da Agenda',
      score: agendaScore, max: 20,
      status: agendaScore >= 16 ? 'good' : agendaScore >= 10 ? 'warning' : 'critical',
      detail: metrics.totalAppointments > 0 ? `${metrics.noShowRate}% de no-show` : 'Sem agendamentos'
    });

    healthScore = Math.min(100, score);
    healthFactors = factors;
  }

  $: scoreColor = healthScore >= 75 ? '#22C55E' : healthScore >= 50 ? '#F59E0B' : '#EF4444';
  $: scoreLabel = healthScore >= 75 ? 'SAUDÁVEL' : healthScore >= 50 ? 'ATENÇÃO' : 'CRÍTICO';
</script>

<svelte:head><title>Health Center • LumiaOS</title></svelte:head>

<div class="wrap">
  {#if loading}
    <div class="loading-state" out:fade={{ duration: 200 }}>
      <div class="scan-line"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card o70"></div>
      <div class="skeleton-card o40"></div>
      <p class="scanning-text">Executando diagnóstico do sistema...</p>
    </div>
  {:else if !clinicId}
    <div class="empty-card" in:fade>
      <span class="icon-lg">🏢</span>
      <h3>Nenhuma clínica vinculada</h3>
      <p class="muted">Finalize o setup para ativar o Health Center.</p>
      <a href="/setup" class="btn-cta">Ir para o Setup</a>
    </div>
  {:else}
    <div class="header" in:fade>
      <div>
        <p class="label">HEALTH CENTER</p>
        <h1>Diagnóstico Operacional</h1>
        <p class="sub">Análise em tempo real da saúde operacional da sua clínica.</p>
      </div>
    </div>

    <!-- Score Principal -->
    <div class="score-hero" in:fly={{ y: 20, duration: 400 }}>
      <div class="score-left">
        <div class="score-ring" style="--color: {scoreColor}; --pct: {healthScore}">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" class="ring-bg" />
            <circle cx="60" cy="60" r="52" class="ring-fill" style="stroke: {scoreColor}; stroke-dasharray: {healthScore * 3.267} 326.7" />
          </svg>
          <div class="score-num">{healthScore}</div>
        </div>
        <div class="score-meta">
          <div class="score-badge" style="color: {scoreColor}; border-color: {scoreColor}33">{scoreLabel}</div>
          <p>Health Score geral do sistema</p>
        </div>
      </div>

      <div class="score-right">
        <div class="quick-metric">
          <span class="qm-val">{metrics.totalPatients}</span>
          <span class="qm-label">Pacientes</span>
        </div>
        <div class="quick-metric">
          <span class="qm-val">{metrics.totalAppointments}</span>
          <span class="qm-label">Agendamentos</span>
        </div>
        <div class="quick-metric">
          <span class="qm-val {metrics.noShowRate > 15 ? 'warn' : ''}">{metrics.noShowRate}%</span>
          <span class="qm-label">No-Show</span>
        </div>
        <div class="quick-metric">
          <span class="qm-val">{metrics.totalFaq + metrics.totalPosts}</span>
          <span class="qm-label">Conteúdos</span>
        </div>
      </div>
    </div>

    <!-- Fatores -->
    <div class="factors" in:fly={{ y: 20, duration: 400, delay: 150 }}>
      <h2>Fatores de Saúde</h2>
      {#each healthFactors as f, i}
        <div class="factor-row" in:fly={{ y: 15, duration: 300, delay: 200 + i * 80 }}>
          <div class="f-indicator {f.status}"></div>
          <div class="f-info">
            <div class="f-top">
              <strong>{f.name}</strong>
              <span class="f-score">{f.score}/{f.max}</span>
            </div>
            <p>{f.detail}</p>
            <div class="f-bar-track">
              <div class="f-bar {f.status}" style="width: {(f.score / f.max) * 100}%"></div>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Recomendações -->
    <div class="recommendations" in:fly={{ y: 20, duration: 400, delay: 300 }}>
      <h2>Ações Recomendadas</h2>
      <div class="rec-grid">
        {#if !metrics.hasSettings}
          <a href="/dashboard/configuracoes" class="rec-card urgent">
            <span class="rec-icon">⚙️</span>
            <div>
              <strong>Configurar clínica</strong>
              <p>Defina especialidade e horários para ativar a IA.</p>
            </div>
            <span class="rec-arrow">→</span>
          </a>
        {/if}
        {#if metrics.totalFaq < 10}
          <a href="/dashboard/faq" class="rec-card warning">
            <span class="rec-icon">💬</span>
            <div>
              <strong>Expandir FAQ</strong>
              <p>Adicione mais perguntas para melhorar o atendimento autônomo.</p>
            </div>
            <span class="rec-arrow">→</span>
          </a>
        {/if}
        {#if metrics.totalPosts < 5}
          <a href="/dashboard/conteudo" class="rec-card info">
            <span class="rec-icon">✍️</span>
            <div>
              <strong>Criar conteúdo</strong>
              <p>Posts frequentes aumentam agendamentos em até 40%.</p>
            </div>
            <span class="rec-arrow">→</span>
          </a>
        {/if}
        {#if metrics.noShowRate > 15}
          <div class="rec-card warning">
            <span class="rec-icon">📅</span>
            <div>
              <strong>Reduzir no-shows</strong>
              <p>Taxa de {metrics.noShowRate}% está acima do ideal. Ative lembretes automáticos.</p>
            </div>
            <span class="rec-soon">Em breve</span>
          </div>
        {/if}
        {#if healthScore >= 75 && metrics.hasSettings && metrics.totalFaq >= 10 && metrics.totalPosts >= 5}
          <div class="rec-card success">
            <span class="rec-icon">✅</span>
            <div>
              <strong>Tudo certo!</strong>
              <p>Sua clínica está saudável. Continue monitorando.</p>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .wrap { max-width: 1000px; margin: 0 auto; padding-bottom: 3rem; }

  /* Loading */
  .loading-state { display: flex; flex-direction: column; gap: 1rem; position: relative; padding: 2rem 0; }
  .skeleton-card { height: 90px; background: #16161A; border: 1px solid #1A1A1E; border-radius: 16px; }
  .o70 { opacity: 0.7; } .o40 { opacity: 0.4; }
  .scan-line { position: absolute; top: 0; left: -10%; width: 120%; height: 2px; background: #22C55E; box-shadow: 0 0 15px 2px rgba(34,197,94,0.5); z-index: 10; animation: scan 1.5s ease-in-out infinite alternate; }
  .scanning-text { text-align: center; color: #22C55E; font-size: 0.85rem; font-weight: 600; letter-spacing: 1px; margin-top: 1rem; animation: blink 1.5s infinite; }
  @keyframes scan { from { top: 0; } to { top: 100%; } }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

  /* Empty */
  .empty-card { text-align: center; padding: 3rem 2rem; background: #16161A; border: 1px solid #1A1A1E; border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .icon-lg { font-size: 3rem; }
  .btn-cta { background: #fff; color: #000; padding: 0.8rem 1.5rem; border-radius: 10px; font-weight: 700; text-decoration: none; }

  /* Header */
  .header { margin-bottom: 2rem; }
  .label { color: #555; letter-spacing: 3px; font-size: .72rem; text-transform: uppercase; margin: 0 0 .3rem; font-weight: 700; }
  h1 { color: #fff; font-size: 2.2rem; margin: 0 0 .5rem; letter-spacing: -.5px; }
  h2 { color: #fff; font-size: 1.05rem; margin: 0 0 1.25rem; font-weight: 800; }
  .sub { color: #888; margin: 0; font-size: 1rem; }
  .muted { color: #666; font-size: 0.9rem; }

  /* Score Hero */
  .score-hero { display: flex; align-items: center; justify-content: space-between; background: #16161A; border: 1px solid #1A1A1E; border-radius: 16px; padding: 2rem; margin-bottom: 1.5rem; gap: 2rem; }
  .score-left { display: flex; align-items: center; gap: 1.5rem; }
  .score-ring { position: relative; width: 100px; height: 100px; }
  .score-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
  .ring-bg { fill: none; stroke: #1A1A1E; stroke-width: 8; }
  .ring-fill { fill: none; stroke-width: 8; stroke-linecap: round; transition: stroke-dasharray 1.5s ease; }
  .score-num { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 900; color: #fff; }
  .score-badge { font-size: 0.6rem; font-weight: 900; padding: 3px 8px; border: 1px solid; border-radius: 6px; letter-spacing: 0.05em; display: inline-block; margin-bottom: 4px; }
  .score-meta p { color: #555; font-size: 0.75rem; margin: 0; font-weight: 600; }

  .score-right { display: flex; gap: 2rem; }
  .quick-metric { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .qm-val { font-size: 1.8rem; font-weight: 900; color: #fff; letter-spacing: -0.05em; }
  .qm-val.warn { color: #F59E0B; }
  .qm-label { font-size: 0.6rem; color: #555; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }

  /* Factors */
  .factors { background: #16161A; border: 1px solid #1A1A1E; border-radius: 16px; padding: 2rem; margin-bottom: 1.5rem; }
  .factor-row { display: flex; gap: 1rem; align-items: flex-start; padding: 1rem; background: #0F0F11; border: 1px solid #1A1A1E; border-radius: 12px; margin-bottom: 0.75rem; }
  .factor-row:last-child { margin-bottom: 0; }
  .f-indicator { width: 4px; height: 50px; border-radius: 2px; flex-shrink: 0; margin-top: 2px; }
  .f-indicator.good { background: #22C55E; } .f-indicator.warning { background: #F59E0B; } .f-indicator.critical { background: #EF4444; }
  .f-info { flex: 1; }
  .f-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
  .f-top strong { color: #fff; font-size: 0.9rem; }
  .f-score { color: #555; font-size: 0.75rem; font-weight: 800; }
  .f-info p { color: #666; font-size: 0.8rem; margin: 0 0 8px; }
  .f-bar-track { height: 3px; background: #1A1A1E; border-radius: 2px; overflow: hidden; }
  .f-bar { height: 100%; border-radius: 2px; transition: width 1s ease; }
  .f-bar.good { background: #22C55E; } .f-bar.warning { background: #F59E0B; } .f-bar.critical { background: #EF4444; }

  /* Recommendations */
  .recommendations { margin-top: 0.5rem; }
  .rec-grid { display: flex; flex-direction: column; gap: 0.75rem; }
  .rec-card { display: flex; align-items: center; gap: 1rem; background: #16161A; border: 1px solid #1A1A1E; border-radius: 12px; padding: 1.25rem; text-decoration: none; color: inherit; transition: all 0.2s; position: relative; overflow: hidden; }
  a.rec-card:hover { border-color: #333; transform: translateY(-1px); }
  .rec-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: 3px 0 0 3px; }
  .rec-card.urgent::before { background: #EF4444; } .rec-card.warning::before { background: #F59E0B; }
  .rec-card.info::before { background: #3b82f6; } .rec-card.success::before { background: #22C55E; }
  .rec-icon { font-size: 1.3rem; flex-shrink: 0; }
  .rec-card strong { color: #fff; font-size: 0.95rem; display: block; margin-bottom: 2px; }
  .rec-card p { color: #666; font-size: 0.8rem; margin: 0; line-height: 1.4; }
  .rec-arrow { color: #555; font-size: 1.2rem; margin-left: auto; flex-shrink: 0; }
  .rec-soon { font-size: 0.6rem; color: #555; border: 1px solid #333; padding: 2px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase; margin-left: auto; flex-shrink: 0; }

  @media (max-width: 768px) {
    .score-hero { flex-direction: column; align-items: flex-start; }
    .score-right { flex-wrap: wrap; gap: 1.5rem; }
  }
</style>
