<script>
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { supabase } from '$lib/supabase.js';
  import PriorityEngine from '$lib/components/PriorityEngine.svelte';
  import DetailedHealth from '$lib/components/DetailedHealth.svelte';

  let loading = true;
  let clinicId = null;

  // KPIs reais
  let totalPatients = 0;
  let activePatients = 0;
  let leadPatients = 0;
  let inactivePatients = 0;
  let totalAppointments = 0;
  let monthAppointments = 0;
  let completedAppointments = 0;
  let noShowCount = 0;
  let noShowRate = 0;
  let totalFaq = 0;
  let totalPosts = 0;
  let hasSettings = false;
  let healthScore = 0;

  // Dados para os componentes filhos
  let patients = [];
  let appointments = [];

  // Gráfico de crescimento — últimos 6 meses
  let monthlyData = [];

  // Membros da clínica
  let memberCount = 0;
  let planName = 'Starter';

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

      // Buscar todos os dados em paralelo
      const [patientsRes, appointmentsRes, faqRes, postsRes, settingsRes, membersRes, subscriptionRes] = await Promise.all([
        supabase.from('patients').select('*').eq('clinic_id', clinicId),
        supabase.from('appointments').select('*').eq('clinic_id', clinicId),
        supabase.from('faq_items').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId),
        supabase.from('content_posts').select('id', { count: 'exact', head: true }).eq('clinic_id', clinicId),
        supabase.from('clinic_settings').select('specialty').eq('user_id', user.id).maybeSingle(),
        supabase.from('clinic_members').select('user_id').eq('clinic_id', clinicId),
        supabase.from('subscriptions').select('plan_id').eq('clinic_id', clinicId).maybeSingle()
      ]);

      patients = patientsRes.data ?? [];
      appointments = appointmentsRes.data ?? [];
      totalFaq = faqRes.count ?? 0;
      totalPosts = postsRes.count ?? 0;
      hasSettings = !!settingsRes.data?.specialty;
      memberCount = membersRes.data?.length ?? 0;
      planName = (subscriptionRes.data?.plan_id ?? 'starter').charAt(0).toUpperCase() + (subscriptionRes.data?.plan_id ?? 'starter').slice(1);

      // Calcular KPIs
      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

      totalPatients = patients.length;
      activePatients = patients.filter(p => p.status === 'ativo').length;
      leadPatients = patients.filter(p => p.status === 'lead').length;
      inactivePatients = patients.filter(p => p.status === 'inativo').length;
      totalAppointments = appointments.length;
      monthAppointments = appointments.filter(a => a.date && a.date.startsWith(currentMonth)).length;
      completedAppointments = appointments.filter(a => a.status === 'concluido').length;
      noShowCount = appointments.filter(a => a.status === 'no-show').length;
      noShowRate = totalAppointments > 0 ? Math.round((noShowCount / totalAppointments) * 100) : 0;

      // Health Score (mesma lógica do health/+page.svelte)
      let score = 0;
      if (hasSettings) score += 20;
      score += Math.min(20, totalFaq * 2);
      score += Math.min(15, totalPosts * 3);
      score += totalPatients > 0 ? Math.min(25, 10 + Math.min(15, activePatients * 1.5)) : 0;
      if (totalAppointments > 0) {
        score += noShowRate <= 5 ? 20 : noShowRate <= 15 ? 14 : noShowRate <= 30 ? 8 : 3;
      }
      healthScore = Math.min(100, Math.round(score));

      // Dados mensais para o gráfico (últimos 6 meses)
      const monthMap = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toISOString().slice(0, 7);
        monthMap[key] = { month: key, total: 0, completed: 0 };
      }
      for (const appt of appointments) {
        if (!appt.date) continue;
        const mk = appt.date.slice(0, 7);
        if (monthMap[mk]) {
          monthMap[mk].total++;
          if (appt.status === 'concluido') monthMap[mk].completed++;
        }
      }
      monthlyData = Object.values(monthMap);

    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      loading = false;
    }
  });

  // Conversion rate
  $: conversionRate = totalPatients > 0
    ? Math.round((activePatients / totalPatients) * 100)
    : 0;

  // Health score color
  $: scoreColor = healthScore >= 75 ? '#22C55E' : healthScore >= 50 ? '#F59E0B' : '#EF4444';

  // Gráfico SVG path
  $: chartPath = (() => {
    if (monthlyData.length === 0) return '';
    const maxVal = Math.max(...monthlyData.map(m => m.total), 1);
    const w = 800;
    const h = 100;
    const step = w / (monthlyData.length - 1 || 1);
    const points = monthlyData.map((m, i) => ({
      x: i * step,
      y: h - (m.total / maxVal) * (h - 10) - 5
    }));
    if (points.length < 2) return `M0,${h} L${w},${h}`;
    let d = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const cx = (points[i - 1].x + points[i].x) / 2;
      d += ` C${cx},${points[i - 1].y} ${cx},${points[i].y} ${points[i].x},${points[i].y}`;
    }
    return d;
  })();

  $: chartFill = chartPath ? chartPath + ` V120 H0 Z` : '';

  function formatMonth(ym) {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months[parseInt(m) - 1] ?? '';
  }
</script>

<svelte:head><title>Dashboard • LumiaOS</title></svelte:head>

{#if loading}
  <div class="os-v2-container" in:fade>
    <div class="grid-4">
      {#each Array(4) as _, i}
        <div class="card-os skeleton-card">
          <div class="skeleton-line short"></div>
          <div class="skeleton-line tall"></div>
        </div>
      {/each}
    </div>
  </div>
{:else if !clinicId}
  <div class="os-v2-container" in:fade>
    <div class="empty-state">
      <span class="empty-icon">🏢</span>
      <h2>Nenhuma clínica vinculada</h2>
      <p>Finalize o setup para começar a usar o dashboard.</p>
      <a href="/setup" class="btn-cta">Ir para o Setup</a>
    </div>
  </div>
{:else}
  <div class="os-v2-container" in:fade>

    <div class="grid-4">
      <div class="card-os" in:fly={{ y: 15, duration: 300 }}>
        <label>PACIENTES NO CRM</label>
        <div class="val">{totalPatients}
          {#if leadPatients > 0}<span class="trend-info">{leadPatients} leads</span>{/if}
        </div>
      </div>
      <div class="card-os" in:fly={{ y: 15, duration: 300, delay: 50 }}>
        <label>AGENDAMENTOS (MÊS)</label>
        <div class="val">{monthAppointments}
          <span class="trend-sub">de {totalAppointments} total</span>
        </div>
      </div>
      <div class="card-os highlight" in:fly={{ y: 15, duration: 300, delay: 100 }}>
        <label class="dark">TAXA DE CONVERSÃO</label>
        <div class="val dark">{conversionRate}%</div>
      </div>
      <div class="card-os" in:fly={{ y: 15, duration: 300, delay: 150 }}>
        <label>HEALTH SCORE</label>
        <div class="val" style="color: {scoreColor}">{healthScore}<small>/100</small></div>
      </div>
    </div>

    <div class="grid-intelligence">
      <PriorityEngine {patients} {appointments} />
      <DetailedHealth
        {totalPatients}
        {activePatients}
        {totalAppointments}
        {noShowRate}
        {totalFaq}
        {totalPosts}
        {hasSettings}
        {healthScore}
      />
    </div>

    <div class="grid-bottom">
      <div class="card-os chart-box" in:fly={{ y: 15, duration: 300, delay: 200 }}>
        <div class="c-head">
          <h3>Consultas por Mês</h3>
          <span class="label-caps">Últimos 6 meses</span>
        </div>
        <div class="viz">
          {#if monthlyData.some(m => m.total > 0)}
            <svg viewBox="0 0 800 120" class="line-chart">
              <path d={chartFill} fill="white" opacity="0.03"/>
              <path d={chartPath} fill="none" stroke="white" stroke-width="2" opacity="0.8"/>
              {#each monthlyData as m, i}
                {@const maxVal = Math.max(...monthlyData.map(d => d.total), 1)}
                {@const x = i * (800 / (monthlyData.length - 1 || 1))}
                {@const y = 100 - (m.total / maxVal) * 90 - 5}
                <circle cx={x} cy={y} r="3" fill="white" opacity="0.9"/>
              {/each}
            </svg>
            <div class="chart-labels">
              {#each monthlyData as m}
                <span>{formatMonth(m.month)}</span>
              {/each}
            </div>
          {:else}
            <div class="chart-empty">
              <p>📊 Dados aparecerão aqui quando houver agendamentos</p>
            </div>
          {/if}
        </div>
        <div class="forecast-stats">
          <div class="f-item"><span>Concluídas</span> <strong>{completedAppointments}</strong></div>
          <div class="f-item"><span>No-Show</span> <strong class:warn={noShowRate > 15}>{noShowRate}%</strong></div>
          <div class="f-item"><span>Pacientes Ativos</span> <strong>{activePatients}</strong></div>
        </div>
      </div>

      <div class="card-os team-box" in:fly={{ y: 15, duration: 300, delay: 250 }}>
        <div class="c-head"><h3>Sua Clínica</h3> <span class="tag">{planName}</span></div>
        <div class="clinic-stats">
          <div class="cs-row">
            <span class="cs-icon">👥</span>
            <div class="cs-info">
              <strong>{memberCount}</strong>
              <p>membro{memberCount !== 1 ? 's' : ''} na equipe</p>
            </div>
          </div>
          <div class="cs-row">
            <span class="cs-icon">🎯</span>
            <div class="cs-info">
              <strong>{leadPatients}</strong>
              <p>leads para converter</p>
            </div>
          </div>
          <div class="cs-row">
            <span class="cs-icon">✅</span>
            <div class="cs-info">
              <strong>{activePatients}</strong>
              <p>pacientes ativos</p>
            </div>
          </div>
          <div class="cs-row">
            <span class="cs-icon">💤</span>
            <div class="cs-info">
              <strong>{inactivePatients}</strong>
              <p>inativos para reativar</p>
            </div>
          </div>
        </div>
        <div class="team-footer">
          <a href="/dashboard/pipeline" class="link-subtle">Ver pipeline completo →</a>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .os-v2-container { display: flex; flex-direction: column; gap: 1.25rem; width: 100%; padding-bottom: 2rem; }
  .card-os { background: #16161A; border: 1px solid #1A1A1E; border-radius: 16px; padding: 1.5rem; }

  /* Grids */
  .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; }
  .grid-intelligence { display: grid; grid-template-columns: 1.6fr 1fr; gap: 1.25rem; }
  .grid-bottom { display: grid; grid-template-columns: 2fr 1fr; gap: 1.25rem; }

  /* Typography */
  label { font-size: 0.6rem; font-weight: 800; color: #444; text-transform: uppercase; letter-spacing: 0.12em; }
  .val { font-size: 2.2rem; font-weight: 900; color: #fff; letter-spacing: -0.05em; margin-top: 8px; }
  .val small { font-size: 1.2rem; opacity: 0.2; margin-left: 4px; }
  .trend-info { font-size: 0.75rem; color: #3b82f6; font-weight: 800; }
  .trend-sub { font-size: 0.65rem; color: #444; font-weight: 700; }
  .highlight { background: #fff; border: none; }
  .dark { color: #000 !important; }

  /* Skeleton */
  .skeleton-card { min-height: 90px; }
  .skeleton-line { background: #1A1A1E; border-radius: 4px; animation: shimmer 1.5s infinite; }
  .skeleton-line.short { width: 60%; height: 10px; margin-bottom: 12px; }
  .skeleton-line.tall { width: 40%; height: 28px; }
  @keyframes shimmer { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

  /* Empty state */
  .empty-state { text-align: center; padding: 4rem 2rem; background: #16161A; border: 1px solid #1A1A1E; border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .empty-icon { font-size: 3rem; }
  .empty-state h2 { color: #fff; margin: 0; font-size: 1.3rem; }
  .empty-state p { color: #666; margin: 0; font-size: 0.9rem; }
  .btn-cta { background: #fff; color: #000; padding: 0.8rem 1.5rem; border-radius: 10px; font-weight: 700; text-decoration: none; transition: 0.2s; }
  .btn-cta:hover { background: #E5C100; }

  /* Growth Chart */
  .c-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
  .c-head h3 { font-size: 1rem; font-weight: 800; margin: 0; color: #fff; }
  .label-caps { font-size: 0.6rem; font-weight: 800; color: #444; text-transform: uppercase; letter-spacing: 0.1em; }
  .viz { min-height: 120px; border-bottom: 1px solid #1A1A1E; margin-bottom: 1.5rem; padding-bottom: 0.5rem; }
  .line-chart { width: 100%; height: 100px; }
  .chart-labels { display: flex; justify-content: space-between; margin-top: 8px; }
  .chart-labels span { font-size: 0.6rem; color: #444; font-weight: 700; text-transform: uppercase; }
  .chart-empty { display: flex; align-items: center; justify-content: center; height: 100px; }
  .chart-empty p { color: #333; font-size: 0.8rem; font-weight: 600; }
  .forecast-stats { display: flex; gap: 30px; }
  .f-item span { display: block; font-size: 0.65rem; color: #444; font-weight: 700; text-transform: uppercase; }
  .f-item strong { font-size: 1.1rem; color: #fff; font-weight: 800; }
  .f-item strong.warn { color: #F59E0B; }

  /* Clinic Box (replaces Team Box) */
  .clinic-stats { display: flex; flex-direction: column; gap: 10px; }
  .cs-row { display: flex; align-items: center; gap: 12px; padding: 8px 10px; background: #0F0F11; border-radius: 10px; border: 1px solid #1A1A1E; }
  .cs-icon { font-size: 1rem; flex-shrink: 0; filter: grayscale(0.3); }
  .cs-info { flex: 1; }
  .cs-info strong { font-size: 0.9rem; color: #fff; display: block; font-weight: 800; }
  .cs-info p { font-size: 0.65rem; color: #444; margin: 0; font-weight: 600; }
  .team-footer { margin-top: 1.5rem; }
  .link-subtle { font-size: 0.7rem; color: #555; font-weight: 700; text-decoration: none; transition: 0.2s; }
  .link-subtle:hover { color: #E5C100; }
  .tag { font-size: 0.6rem; font-weight: 900; color: #E5C100; border: 1px solid rgba(229,193,0,0.15); padding: 2px 6px; border-radius: 4px; }

  @media (max-width: 1024px) {
    .grid-4 { grid-template-columns: repeat(2, 1fr); }
    .grid-intelligence { grid-template-columns: 1fr; }
    .grid-bottom { grid-template-columns: 1fr; }
  }

  @media (max-width: 640px) {
    .grid-4 { grid-template-columns: 1fr; }
    .forecast-stats { flex-wrap: wrap; gap: 16px; }
  }
</style>