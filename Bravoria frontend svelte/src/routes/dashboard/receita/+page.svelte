<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import { fade, fly } from 'svelte/transition';

  let loading = true;
  let clinicId = null;

  // Dados de receita (calculados a partir de agendamentos e pacientes)
  let revenue = {
    totalAppointments: 0,
    completedAppointments: 0,
    activePatients: 0,
    avgPerPatient: 0,
    monthlyBreakdown: []
  };

  // Serviços com valores simulados (no futuro: tabela de serviços com preços)
  let serviceBreakdown = [];

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

      const [appointmentsRes, patientsRes, settingsRes] = await Promise.all([
        supabase.from('appointments').select('*').eq('clinic_id', clinicId),
        supabase.from('patients').select('status').eq('clinic_id', clinicId),
        supabase.from('clinic_settings').select('services').eq('user_id', user.id).maybeSingle()
      ]);

      const appointments = appointmentsRes.data ?? [];
      const patients = patientsRes.data ?? [];
      const services = settingsRes.data?.services ?? [];
      const completed = appointments.filter(a => a.status === 'concluido');
      const active = patients.filter(p => p.status === 'ativo');

      // Breakdown por mês
      const monthMap = {};
      for (const appt of appointments) {
        if (!appt.date) continue;
        const monthKey = appt.date.slice(0, 7); // YYYY-MM
        if (!monthMap[monthKey]) monthMap[monthKey] = { total: 0, completed: 0, noshow: 0, cancelled: 0 };
        monthMap[monthKey].total++;
        if (appt.status === 'concluido') monthMap[monthKey].completed++;
        if (appt.status === 'no-show') monthMap[monthKey].noshow++;
        if (appt.status === 'cancelado') monthMap[monthKey].cancelled++;
      }

      const sortedMonths = Object.entries(monthMap)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 6)
        .map(([month, data]) => ({ month: formatMonth(month), ...data }));

      // Breakdown por tipo de consulta
      const typeMap = {};
      for (const appt of appointments) {
        const t = appt.type || 'Consulta';
        if (!typeMap[t]) typeMap[t] = { count: 0, completed: 0 };
        typeMap[t].count++;
        if (appt.status === 'concluido') typeMap[t].completed++;
      }
      serviceBreakdown = Object.entries(typeMap)
        .map(([name, data]) => ({ name, ...data, rate: data.count > 0 ? Math.round((data.completed / data.count) * 100) : 0 }))
        .sort((a, b) => b.count - a.count);

      revenue = {
        totalAppointments: appointments.length,
        completedAppointments: completed.length,
        activePatients: active.length,
        avgPerPatient: active.length > 0 ? (completed.length / active.length).toFixed(1) : 0,
        monthlyBreakdown: sortedMonths
      };

    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  });

  function formatMonth(ym) {
    const [y, m] = ym.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(m) - 1]} ${y}`;
  }

  $: completionRate = revenue.totalAppointments > 0 
    ? Math.round((revenue.completedAppointments / revenue.totalAppointments) * 100) 
    : 0;
</script>

<svelte:head><title>Receita • LumiaOS</title></svelte:head>

<div class="wrap">
  <div class="header" in:fade>
    <div>
      <p class="label">RECEITA DETALHADA</p>
      <h1>Painel Financeiro</h1>
      <p class="sub">Métricas de consultas, conversão e performance por serviço.</p>
    </div>
  </div>

  {#if loading}
    <p class="muted">Carregando dados financeiros...</p>
  {:else if !clinicId}
    <div class="empty-card">
      <span>💰</span>
      <h3>Configure sua clínica</h3>
      <p class="muted">Finalize o setup para acompanhar receita.</p>
      <a href="/setup" class="btn-link">Ir para Setup</a>
    </div>
  {:else}
    <!-- KPIs Principais -->
    <div class="kpi-grid" in:fly={{ y: 20, duration: 400 }}>
      <div class="kpi-card">
        <label>CONSULTAS REALIZADAS</label>
        <div class="kpi-val">{revenue.completedAppointments}</div>
        <span class="kpi-sub">de {revenue.totalAppointments} agendadas</span>
      </div>
      <div class="kpi-card highlight">
        <label class="dark">TAXA DE CONCLUSÃO</label>
        <div class="kpi-val dark">{completionRate}%</div>
        <span class="kpi-sub dark-sub">consultas concluídas / total</span>
      </div>
      <div class="kpi-card">
        <label>PACIENTES ATIVOS</label>
        <div class="kpi-val">{revenue.activePatients}</div>
        <span class="kpi-sub">no CRM</span>
      </div>
      <div class="kpi-card">
        <label>CONSULTAS / PACIENTE</label>
        <div class="kpi-val">{revenue.avgPerPatient}</div>
        <span class="kpi-sub">média por paciente ativo</span>
      </div>
    </div>

    <!-- Performance por Mês -->
    <div class="section" in:fly={{ y: 20, duration: 400, delay: 150 }}>
      <div class="section-head">
        <h2>Performance Mensal</h2>
        <span class="section-tag">Últimos 6 meses</span>
      </div>
      
      {#if revenue.monthlyBreakdown.length === 0}
        <div class="empty-section">
          <p>Ainda não há dados suficientes para mostrar a performance mensal.</p>
        </div>
      {:else}
        <div class="month-table">
          <div class="mt-header">
            <span>Mês</span>
            <span>Total</span>
            <span>Concluídas</span>
            <span>No-Show</span>
            <span>Canceladas</span>
            <span>Conversão</span>
          </div>
          {#each revenue.monthlyBreakdown as m, i}
            <div class="mt-row" in:fly={{ y: 10, duration: 200, delay: i * 60 }}>
              <span class="mt-month">{m.month}</span>
              <span class="mt-num">{m.total}</span>
              <span class="mt-num green">{m.completed}</span>
              <span class="mt-num {m.noshow > 0 ? 'red' : ''}">{m.noshow}</span>
              <span class="mt-num">{m.cancelled}</span>
              <span class="mt-num">
                <span class="rate-bar">
                  <span class="rate-fill" style="width: {m.total > 0 ? (m.completed / m.total) * 100 : 0}%"></span>
                </span>
                {m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0}%
              </span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Breakdown por Serviço -->
    <div class="section" in:fly={{ y: 20, duration: 400, delay: 300 }}>
      <div class="section-head">
        <h2>Performance por Serviço</h2>
      </div>
      
      {#if serviceBreakdown.length === 0}
        <div class="empty-section">
          <p>Nenhum serviço registrado ainda.</p>
        </div>
      {:else}
        <div class="service-grid">
          {#each serviceBreakdown as svc, i}
            <div class="svc-card" in:fly={{ y: 10, duration: 200, delay: i * 60 }}>
              <div class="svc-top">
                <strong>{svc.name}</strong>
                <span class="svc-rate" class:good={svc.rate >= 70} class:warn={svc.rate >= 40 && svc.rate < 70} class:bad={svc.rate < 40}>{svc.rate}%</span>
              </div>
              <div class="svc-bar-track">
                <div class="svc-bar" style="width: {svc.rate}%" class:good={svc.rate >= 70} class:warn={svc.rate >= 40 && svc.rate < 70} class:bad={svc.rate < 40}></div>
              </div>
              <div class="svc-detail">
                <span>{svc.completed} concluídas</span>
                <span>{svc.count} agendadas</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Info futura -->
    <div class="future-card" in:fly={{ y: 20, duration: 400, delay: 400 }}>
      <div class="future-head">
        <span class="lock">🔒</span>
        <h3>Em Breve</h3>
      </div>
      <div class="future-grid">
        <div class="future-item">
          <strong>Valores por Procedimento</strong>
          <span>Cadastre preços dos serviços e veja receita real.</span>
        </div>
        <div class="future-item">
          <strong>Projeção de Receita</strong>
          <span>IA projetando receita do próximo mês com base no pipeline.</span>
        </div>
        <div class="future-item">
          <strong>Ticket Médio</strong>
          <span>Valor médio por consulta e por paciente ao longo do tempo.</span>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .wrap { max-width: 1100px; margin: 0 auto; padding-bottom: 3rem; }
  .header { margin-bottom: 1.5rem; }
  .label { color: #555; letter-spacing: 3px; font-size: .72rem; text-transform: uppercase; margin: 0 0 .3rem; font-weight: 700; }
  h1 { color: #fff; font-size: 2rem; margin: 0 0 .35rem; letter-spacing: -.5px; }
  h2 { color: #fff; font-size: 1.05rem; margin: 0; font-weight: 800; }
  .sub { color: #777; margin: 0; font-size: .9rem; }
  .muted { color: #666; font-size: .9rem; }

  /* KPIs */
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
  .kpi-card { background: #16161A; border: 1px solid #1A1A1E; border-radius: 16px; padding: 1.5rem; }
  .kpi-card label { font-size: 0.6rem; font-weight: 800; color: #444; text-transform: uppercase; letter-spacing: 0.12em; display: block; }
  .kpi-val { font-size: 2.2rem; font-weight: 900; color: #fff; letter-spacing: -0.05em; margin-top: 8px; }
  .kpi-sub { font-size: 0.7rem; color: #555; font-weight: 600; }
  .highlight { background: #fff; border: none; }
  .dark { color: #000 !important; }
  .dark-sub { color: #666 !important; }

  /* Sections */
  .section { background: #16161A; border: 1px solid #1A1A1E; border-radius: 16px; padding: 1.5rem; margin-bottom: 1.5rem; }
  .section-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid #1A1A1E; }
  .section-tag { font-size: 0.6rem; font-weight: 800; color: #555; text-transform: uppercase; letter-spacing: 0.1em; }
  .empty-section { border: 1px dashed #222; border-radius: 10px; padding: 2rem; text-align: center; }
  .empty-section p { color: #444; font-size: 0.85rem; margin: 0; }

  /* Month Table */
  .month-table { display: flex; flex-direction: column; gap: 2px; }
  .mt-header { display: grid; grid-template-columns: 1.2fr repeat(5, 1fr); gap: 8px; padding: 0.75rem 1rem; font-size: 0.6rem; font-weight: 800; color: #444; text-transform: uppercase; letter-spacing: 0.1em; }
  .mt-row { display: grid; grid-template-columns: 1.2fr repeat(5, 1fr); gap: 8px; align-items: center; padding: 0.85rem 1rem; background: #0F0F11; border-radius: 8px; }
  .mt-month { color: #fff; font-size: 0.85rem; font-weight: 700; }
  .mt-num { color: #888; font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }
  .mt-num.green { color: #22C55E; } .mt-num.red { color: #EF4444; }
  .rate-bar { width: 40px; height: 3px; background: #1A1A1E; border-radius: 2px; overflow: hidden; display: inline-block; }
  .rate-fill { height: 100%; background: #22C55E; display: block; border-radius: 2px; }

  /* Service Grid */
  .service-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
  .svc-card { background: #0F0F11; border: 1px solid #1A1A1E; border-radius: 12px; padding: 1.25rem; }
  .svc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .svc-top strong { color: #fff; font-size: 0.9rem; }
  .svc-rate { font-size: 1.1rem; font-weight: 900; }
  .svc-rate.good { color: #22C55E; } .svc-rate.warn { color: #F59E0B; } .svc-rate.bad { color: #EF4444; }
  .svc-bar-track { height: 4px; background: #1A1A1E; border-radius: 2px; overflow: hidden; margin-bottom: 10px; }
  .svc-bar { height: 100%; border-radius: 2px; transition: width 1s ease; }
  .svc-bar.good { background: #22C55E; } .svc-bar.warn { background: #F59E0B; } .svc-bar.bad { background: #EF4444; }
  .svc-detail { display: flex; justify-content: space-between; font-size: 0.7rem; color: #555; font-weight: 600; }

  /* Future */
  .future-card { background: linear-gradient(145deg, #111 0%, #0A0A0A 100%); border: 1px solid #1A1A1E; border-radius: 16px; padding: 1.5rem; position: relative; }
  .future-card::after { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.01) 10px, rgba(255,255,255,0.01) 20px); pointer-events: none; border-radius: 16px; }
  .future-head { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid #1A1A1E; }
  .lock { font-size: 1rem; filter: grayscale(1) opacity(0.6); }
  .future-head h3 { color: #888; font-size: 0.85rem; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
  .future-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
  .future-item { display: flex; flex-direction: column; gap: 0.3rem; }
  .future-item strong { color: #aaa; font-size: 0.85rem; }
  .future-item span { color: #555; font-size: 0.8rem; line-height: 1.4; }

  .empty-card { text-align: center; padding: 3rem; background: #16161A; border: 1px solid #1A1A1E; border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
  .empty-card span { font-size: 2.5rem; } .empty-card h3 { color: #fff; margin: 0; }
  .btn-link { color: #E5C100; text-decoration: none; font-weight: 700; }

  @media (max-width: 768px) {
    .kpi-grid { grid-template-columns: 1fr 1fr; }
    .future-grid { grid-template-columns: 1fr; }
    .mt-header, .mt-row { font-size: 0.7rem; grid-template-columns: 1fr repeat(3, 1fr); }
    .mt-header span:nth-child(4), .mt-header span:nth-child(5),
    .mt-row span:nth-child(4), .mt-row span:nth-child(5) { display: none; }
  }
</style>
