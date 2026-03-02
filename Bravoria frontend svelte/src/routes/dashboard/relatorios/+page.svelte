<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase.js';

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

      const { data: member } = await supabase
        .from('clinic_members')
        .select('clinic_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      clinicId = member?.clinic_id ?? null;
      if (!clinicId) return;

      // Buscando dados de posts, faqs, pacientes e agendamentos paralelamente
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

      // Cálculo de taxa de no-show (faltas / total de agendamentos)
      const noShows = appointments.filter(a => a.status === 'no-show').length;
      const noShowRateCalc = appointments.length > 0 ? Math.round((noShows / appointments.length) * 100) : 0;

      stats = {
        // Conteúdo
        totalPosts: posts.length,
        draftPosts: posts.filter(p => p.status === 'draft').length,
        approvedPosts: posts.filter(p => p.status === 'approved').length,
        publishedPosts: posts.filter(p => p.status === 'published').length,
        
        // FAQ
        totalFaq: faq.length,
        publishedFaq: faq.filter(f => f.is_published).length,

        // Pacientes (Ajuste as strings de status de acordo com seu banco)
        totalPatients: patients.length,
        activePatients: patients.filter(p => p.status === 'ativo').length,
        leadPatients: patients.filter(p => p.status === 'lead').length,

        // Agendamentos (Ajuste as strings de status de acordo com seu banco)
        totalAppointments: appointments.length,
        scheduledAppointments: appointments.filter(a => a.status === 'agendado').length,
        completedAppointments: appointments.filter(a => a.status === 'concluido').length,
        noShowAppointments: noShows,
        noShowRate: noShowRateCalc
      };
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head><title>Relatórios • Lumia</title></svelte:head>

<div class="wrap">
  <div class="head">
    <div>
      <p class="label">RELATÓRIOS</p>
      <h1>Painel de performance</h1>
      <p class="sub">Visão geral do uso da plataforma, conteúdo e gestão da sua clínica.</p>
    </div>
  </div>

  {#if loading}
    <p class="muted">Carregando métricas...</p>
  {:else if !clinicId}
    <div class="empty">
      <p>Configure sua clínica primeiro para ver os relatórios.</p>
    </div>
  {:else}
    
    <div class="section">
      <h2>Pacientes (CRM)</h2>
      <div class="cards">
        <div class="stat-card">
          <span class="num">{stats.totalPatients}</span>
          <span class="desc">Total de contatos</span>
        </div>
        <div class="stat-card">
          <span class="num blue">{stats.leadPatients}</span>
          <span class="desc">Leads / Potenciais</span>
        </div>
        <div class="stat-card">
          <span class="num green">{stats.activePatients}</span>
          <span class="desc">Pacientes Ativos</span>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Agendamentos</h2>
      <div class="cards">
        <div class="stat-card">
          <span class="num">{stats.totalAppointments}</span>
          <span class="desc">Total de consultas</span>
        </div>
        <div class="stat-card">
          <span class="num blue">{stats.scheduledAppointments}</span>
          <span class="desc">Agendadas</span>
        </div>
        <div class="stat-card">
          <span class="num green">{stats.completedAppointments}</span>
          <span class="desc">Concluídas</span>
        </div>
        <div class="stat-card">
          <span class="num yellow">{stats.noShowRate}%</span>
          <span class="desc">Taxa de No-Show ({stats.noShowAppointments} faltas)</span>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>Conteúdo e IA</h2>
      <div class="cards">
        <div class="stat-card">
          <span class="num">{stats.totalPosts}</span>
          <span class="desc">Posts criados</span>
        </div>
        <div class="stat-card">
          <span class="num yellow">{stats.draftPosts}</span>
          <span class="desc">Em rascunho</span>
        </div>
        <div class="stat-card">
          <span class="num blue">{stats.approvedPosts}</span>
          <span class="desc">Aprovados</span>
        </div>
        <div class="stat-card">
          <span class="num green">{stats.publishedPosts}</span>
          <span class="desc">Publicados</span>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>FAQ / Atendimento</h2>
      <div class="cards">
        <div class="stat-card">
          <span class="num">{stats.totalFaq}</span>
          <span class="desc">Perguntas cadastradas</span>
        </div>
        <div class="stat-card">
          <span class="num green">{stats.publishedFaq}</span>
          <span class="desc">Publicadas (ativas)</span>
        </div>
        <div class="stat-card">
          <span class="num yellow">{stats.totalFaq - stats.publishedFaq}</span>
          <span class="desc">Em rascunho</span>
        </div>
      </div>
    </div>

    <div class="coming">
      <p class="label-sm">EM BREVE</p>
      <p class="muted">Integração completa de relatórios com Evolution API e insights do CEO Virtual.</p>
    </div>
  {/if}
</div>

<style>
  .wrap { max-width:1100px; margin:0 auto; padding-bottom: 2rem; }
  .head { margin-bottom:1.5rem; }
  .label { color:#555; letter-spacing:3px; font-size:.72rem; text-transform:uppercase; margin:0 0 .3rem; font-weight:700; }
  h1 { color:#fff; font-size:2rem; margin:0 0 .35rem; letter-spacing:-.5px; }
  h2 { color:#fff; font-size:1.05rem; margin:0 0 1rem; border-bottom: 1px solid #1e1e1e; padding-bottom: 0.5rem; }
  .sub { color:#777; margin:0; font-size:.9rem; }
  .muted { color:#666; font-size:.9rem; }

  .section { margin-bottom:2rem; }

  .cards { display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:1rem; }

  .stat-card {
    background:#141414; border:1px solid #252525; border-radius:14px;
    padding:1.25rem; display:flex; flex-direction:column; gap:.35rem;
    transition: border-color 0.2s;
  }
  .stat-card:hover { border-color: #333; }
  
  .num { font-size:2.2rem; font-weight:900; color:#fff; line-height:1; }
  .num.yellow { color:#E5C100; }
  .num.green { color:#4ade80; }
  .num.blue { color:#60a5fa; }
  .desc { color:#666; font-size:.8rem; }

  .empty { background:#141414; border:1px solid #252525; border-radius:14px; padding:1.5rem; color:#666; }

  .coming {
    background:#141414; border:1px solid #252525; border-radius:14px;
    padding:1.25rem; margin-top:2rem;
  }
  .label-sm { color:#444; letter-spacing:2px; font-size:.7rem; text-transform:uppercase; margin:0 0 .4rem; font-weight:700; }

  @media(max-width:640px) { .cards { grid-template-columns:1fr 1fr; } }
</style>