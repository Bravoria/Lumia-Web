<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import { fade, fly } from 'svelte/transition';

  let loading = true;
  let clinicId = null;
  let stats = { 
    totalPosts: 0, draftPosts: 0, approvedPosts: 0, publishedPosts: 0, 
    totalFaq: 0, publishedFaq: 0,
    totalPatients: 0, activePatients: 0, leadPatients: 0,
    totalAppointments: 0, scheduledAppointments: 0, completedAppointments: 0, noShowAppointments: 0, noShowRate: 0
  };

  onMount(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: member } = await supabase.from('clinic_members').select('clinic_id').eq('user_id', user.id).limit(1).maybeSingle();
      clinicId = member?.clinic_id ?? null;
      if (!clinicId) return;

      const [postsRes, faqRes, patientsRes, appointmentsRes] = await Promise.all([
        supabase.from('content_posts').select('status').eq('clinic_id', clinicId),
        supabase.from('faq_items').select('is_published').eq('clinic_id', clinicId),
        supabase.from('patients').select('status').eq('clinic_id', clinicId),
        supabase.from('appointments').select('status').eq('clinic_id', clinicId)
      ]);

      const posts = postsRes.data ?? [];
      const faq = faqRes.data ?? [];
      const patients = patientsRes.data ?? [];
      const appointments = appointmentsRes.data ?? [];
      const noShows = appointments.filter(a => a.status === 'no-show').length;

      stats = {
        totalPosts: posts.length,
        draftPosts: posts.filter(p => p.status === 'draft').length,
        approvedPosts: posts.filter(p => p.status === 'approved').length,
        publishedPosts: posts.filter(p => p.status === 'published').length,
        totalFaq: faq.length,
        publishedFaq: faq.filter(f => f.is_published).length,
        totalPatients: patients.length,
        activePatients: patients.filter(p => p.status === 'ativo').length,
        leadPatients: patients.filter(p => p.status === 'lead').length,
        totalAppointments: appointments.length,
        scheduledAppointments: appointments.filter(a => a.status === 'agendado').length,
        completedAppointments: appointments.filter(a => a.status === 'concluido').length,
        noShowAppointments: noShows,
        noShowRate: appointments.length > 0 ? Math.round((noShows / appointments.length) * 100) : 0
      };
    } catch (e) { console.error(e); }
    finally { setTimeout(() => { loading = false; }, 400); }
  });
</script>

<svelte:head><title>Relatórios • Lumia</title></svelte:head>

<div class="wrap">
  <div class="head">
    <p class="label">RELATÓRIOS</p>
    <h1>Painel de Performance</h1>
    <p class="sub">Visão geral do uso da plataforma, conteúdo e gestão da sua clínica.</p>
  </div>

  {#if loading}
    <div class="loading-state">
      <div class="scan-line"></div>
      <div class="skeleton-card"></div>
      <div class="skeleton-card o70"></div>
      <div class="skeleton-card o40"></div>
      <p class="scanning-text">Calculando métricas de performance...</p>
    </div>
  {:else if !clinicId}
    <div class="empty" in:fade>
      <span class="empty-icon">📊</span>
      <h3>Configure sua clínica</h3>
      <p>Finalize o setup para ver os relatórios.</p>
      <a href="/setup" class="btn-link">Ir para Setup</a>
    </div>
  {:else}
    <div class="section" in:fly={{ y: 20, duration: 400 }}>
      <div class="section-head"><h2>👥 Pacientes (CRM)</h2></div>
      <div class="cards">
        <div class="stat-card" in:fly={{ y: 15, duration: 300, delay: 50 }}>
          <span class="num">{stats.totalPatients}</span>
          <span class="desc">Total de contatos</span>
          <div class="card-bar"><div class="bar-fill" style="width: 100%; background: #555;"></div></div>
        </div>
        <div class="stat-card" in:fly={{ y: 15, duration: 300, delay: 100 }}>
          <span class="num blue">{stats.leadPatients}</span>
          <span class="desc">Leads / Potenciais</span>
          <div class="card-bar"><div class="bar-fill" style="width: {stats.totalPatients > 0 ? (stats.leadPatients / stats.totalPatients) * 100 : 0}%; background: #60a5fa;"></div></div>
        </div>
        <div class="stat-card" in:fly={{ y: 15, duration: 300, delay: 150 }}>
          <span class="num green">{stats.activePatients}</span>
          <span class="desc">Pacientes Ativos</span>
          <div class="card-bar"><div class="bar-fill" style="width: {stats.totalPatients > 0 ? (stats.activePatients / stats.totalPatients) * 100 : 0}%; background: #22C55E;"></div></div>
        </div>
      </div>
    </div>

    <div class="section" in:fly={{ y: 20, duration: 400, delay: 100 }}>
      <div class="section-head"><h2>📅 Agendamentos</h2></div>
      <div class="cards">
        <div class="stat-card" in:fly={{ y: 15, duration: 300, delay: 150 }}>
          <span class="num">{stats.totalAppointments}</span><span class="desc">Total de consultas</span>
        </div>
        <div class="stat-card" in:fly={{ y: 15, duration: 300, delay: 200 }}>
          <span class="num blue">{stats.scheduledAppointments}</span><span class="desc">Agendadas</span>
        </div>
        <div class="stat-card" in:fly={{ y: 15, duration: 300, delay: 250 }}>
          <span class="num green">{stats.completedAppointments}</span><span class="desc">Concluídas</span>
        </div>
        <div class="stat-card" in:fly={{ y: 15, duration: 300, delay: 300 }}>
          <span class="num {stats.noShowRate > 15 ? 'red' : 'yellow'}">{stats.noShowRate}%</span>
          <span class="desc">No-Show ({stats.noShowAppointments} faltas)</span>
        </div>
      </div>
    </div>

    <div class="section" in:fly={{ y: 20, duration: 400, delay: 200 }}>
      <div class="section-head"><h2>✍️ Conteúdo e IA</h2></div>
      <div class="cards">
        <div class="stat-card"><span class="num">{stats.totalPosts}</span><span class="desc">Posts criados</span></div>
        <div class="stat-card"><span class="num yellow">{stats.draftPosts}</span><span class="desc">Em rascunho</span></div>
        <div class="stat-card"><span class="num blue">{stats.approvedPosts}</span><span class="desc">Aprovados</span></div>
        <div class="stat-card"><span class="num green">{stats.publishedPosts}</span><span class="desc">Publicados</span></div>
      </div>
    </div>

    <div class="section" in:fly={{ y: 20, duration: 400, delay: 300 }}>
      <div class="section-head"><h2>💬 FAQ / Atendimento</h2></div>
      <div class="cards">
        <div class="stat-card"><span class="num">{stats.totalFaq}</span><span class="desc">Perguntas cadastradas</span></div>
        <div class="stat-card"><span class="num green">{stats.publishedFaq}</span><span class="desc">Publicadas (ativas)</span></div>
        <div class="stat-card"><span class="num yellow">{stats.totalFaq - stats.publishedFaq}</span><span class="desc">Em rascunho</span></div>
      </div>
    </div>

    <div class="coming" in:fly={{ y: 20, duration: 400, delay: 400 }}>
      <div class="coming-head"><span class="lock-icon">🔒</span><h3>Em Breve</h3></div>
      <p class="muted">Integração completa de relatórios com Evolution API e insights do CEO Virtual.</p>
    </div>
  {/if}
</div>

<style>
  .wrap { max-width:1100px; margin:0 auto; padding-bottom: 2rem; }
  .head { margin-bottom:1.5rem; }
  .label { color:#555; letter-spacing:3px; font-size:.72rem; text-transform:uppercase; margin:0 0 .3rem; font-weight:700; }
  h1 { color:#fff; font-size:2rem; margin:0 0 .35rem; letter-spacing:-.5px; }
  .sub { color:#777; margin:0; font-size:.9rem; }
  .muted { color:#666; font-size:.9rem; }

  .loading-state { display: flex; flex-direction: column; gap: 1rem; position: relative; padding: 2rem 0; }
  .skeleton-card { height: 80px; background: #141414; border: 1px solid #222; border-radius: 14px; }
  .o70 { opacity: 0.7; } .o40 { opacity: 0.4; }
  .scan-line { position: absolute; top: 0; left: -10%; width: 120%; height: 2px; background: #E5C100; box-shadow: 0 0 15px 2px rgba(229, 193, 0, 0.5); z-index: 10; animation: scan 1.5s ease-in-out infinite alternate; }
  .scanning-text { text-align: center; color: #E5C100; font-size: 0.85rem; font-weight: 600; letter-spacing: 1px; margin-top: 1rem; animation: blink 1.5s infinite; }
  @keyframes scan { from { top: 0; } to { top: 100%; } }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

  .section { margin-bottom:1.5rem; background: #141414; border: 1px solid #252525; border-radius: 16px; padding: 1.5rem; }
  .section-head { margin-bottom: 1rem; padding-bottom: 0.6rem; border-bottom: 1px solid #1e1e1e; }
  .section-head h2 { color:#fff; font-size:1rem; margin:0; font-weight: 800; }
  .cards { display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:1rem; }
  .stat-card { background:#0F0F11; border:1px solid #1e1e1e; border-radius:12px; padding:1.25rem; display:flex; flex-direction:column; gap:.35rem; transition: all 0.2s; }
  .stat-card:hover { border-color: #333; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.3); }
  .num { font-size:2rem; font-weight:900; color:#fff; line-height:1; }
  .num.yellow { color:#E5C100; } .num.green { color:#22C55E; } .num.blue { color:#60a5fa; } .num.red { color:#EF4444; }
  .desc { color:#666; font-size:.75rem; font-weight: 600; }
  .card-bar { height: 3px; background: #1e1e1e; border-radius: 2px; overflow: hidden; margin-top: 8px; }
  .bar-fill { height: 100%; border-radius: 2px; transition: width 1s ease; }

  .empty { text-align: center; padding: 3rem; background: #141414; border: 1px solid #252525; border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
  .empty-icon { font-size: 2.5rem; } .empty h3 { color: #fff; margin: 0; }
  .btn-link { color: #E5C100; text-decoration: none; font-weight: 700; }

  .coming { background: linear-gradient(145deg, #111, #0A0A0A); border: 1px solid #252525; border-radius: 16px; padding: 1.5rem; }
  .coming-head { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
  .lock-icon { filter: grayscale(1) opacity(0.6); }
  .coming-head h3 { color: #888; font-size: 0.85rem; margin: 0; text-transform: uppercase; letter-spacing: 1px; }

  @media(max-width:640px) { .cards { grid-template-columns:1fr 1fr; } }
  @media(max-width:400px) { .cards { grid-template-columns:1fr; } }
</style>