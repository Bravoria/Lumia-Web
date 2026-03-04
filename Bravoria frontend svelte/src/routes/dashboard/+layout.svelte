<script>
  import { fade } from 'svelte/transition';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase.js';

  $: path = $page.url.pathname;

  let mobileMenuOpen = false;
  let notifications = [];
  let showNotifPanel = false;
  let unreadCount = 0;

  import { onMount } from 'svelte';

  let myRole = 'receptionist';

  onMount(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: member } = await supabase.from('clinic_members').select('clinic_id, role').eq('user_id', user.id).limit(1).maybeSingle();
      if (!member?.clinic_id) return;
      
      myRole = member.role;
      const cid = member.clinic_id;

      // Proteção de Rota (Guardrails simples)
      const isRestrictedRoute = path === '/dashboard/receita' || 
                                path === '/dashboard/relatorios' || 
                                path === '/dashboard/ceo' || 
                                path === '/dashboard/configuracoes' ||
                                path === '/dashboard/equipe';

      if (isRestrictedRoute && (myRole === 'receptionist' || myRole === 'doctor')) {
        // Se bater direto na URL proibida, joga pro dashboard principal
        goto('/dashboard');
        return;
      }

      const today = new Date().toISOString().slice(0, 10);

      // Agendamentos de hoje
      const { data: todayAppts } = await supabase.from('appointments').select('patient_name, time, status').eq('clinic_id', cid).eq('date', today).order('time');
      if (todayAppts?.length > 0) {
        const pending = todayAppts.filter(a => a.status === 'agendado');
        if (pending.length > 0) {
          notifications.push({ icon: '📅', title: `${pending.length} consulta(s) hoje`, desc: pending.map(a => `${a.patient_name} às ${a.time?.slice(0,5)}`).slice(0, 3).join(', '), time: 'Hoje', type: 'info' });
        }
        const noConfirm = todayAppts.filter(a => a.status === 'agendado');
        if (noConfirm.length > 0) {
          notifications.push({ icon: '⚠️', title: `${noConfirm.length} sem confirmação`, desc: 'Considere confirmar os agendamentos do dia.', time: 'Hoje', type: 'warning' });
        }
      }

      // Novos leads (pacientes criados nos últimos 7 dias)
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: newLeads } = await supabase.from('patients').select('name').eq('clinic_id', cid).gte('created_at', weekAgo).order('created_at', { ascending: false }).limit(5);
      if (newLeads?.length > 0) {
        notifications.push({ icon: '🌟', title: `${newLeads.length} novo(s) lead(s)`, desc: newLeads.map(l => l.name).slice(0, 3).join(', '), time: 'Última semana', type: 'success' });
      }

      if (notifications.length === 0) {
        notifications.push({ icon: '✅', title: 'Tudo em dia!', desc: 'Nenhuma pendência no momento.', time: 'Agora', type: 'success' });
      }

      unreadCount = notifications.filter(n => n.type === 'warning' || n.type === 'info').length;
    } catch (e) { console.error(e); }
  });

  async function handleLogout() {
    await supabase.auth.signOut();
    goto('/login');
  }
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
</svelte:head>

<div class="os-container">
  <!-- Mobile hamburger -->
  <button class="mobile-toggle" on:click={() => mobileMenuOpen = !mobileMenuOpen}>
    {mobileMenuOpen ? '✕' : '☰'}
  </button>

  <aside class="sidebar-os" class:open={mobileMenuOpen}>
    <a href="/dashboard" class="brand">
      <img src="/logo.png" alt="LumiaOS" class="main-logo" />
    </a>

    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <nav class="nav-stack" on:click={() => mobileMenuOpen = false}>
      <div class="nav-group">
        <p class="nav-label">Comando</p>
        <a href="/dashboard" class:active={path === '/dashboard'}>📊 Dashboard</a>
        <a href="/dashboard/health" class:active={path === '/dashboard/health'}>🛡️ Health Center</a>
        {#if myRole === 'owner' || myRole === 'admin'}
          <a href="/dashboard/ceo" class:active={path === '/dashboard/ceo'}>🧠 CEO Virtual</a>
        {/if}
      </div>

      <div class="nav-group">
        <p class="nav-label">Operações</p>
        <a href="/dashboard/agenda" class:active={path === '/dashboard/agenda'}>📅 Agenda</a>
        {#if myRole !== 'receptionist'}
          <a href="/dashboard/faq" class:active={path.startsWith('/dashboard/faq')}>🎓 Treinamento IA</a>
          <a href="/dashboard/whatsapp" class:active={path === '/dashboard/whatsapp'}>📱 WhatsApp IA</a>
        {/if}
      </div>

      <div class="nav-group">
        <p class="nav-label">Crescimento</p>
        <a href="/dashboard/pipeline" class:active={path === '/dashboard/pipeline'}>🎯 Pipeline</a>
        <a href="/dashboard/conteudo" class:active={path === '/dashboard/conteudo'}>✍️ Conteúdo IA</a>
      </div>

      {#if myRole === 'owner' || myRole === 'admin'}
        <div class="nav-group">
          <p class="nav-label">Métricas</p>
          <a href="/dashboard/relatorios" class:active={path === '/dashboard/relatorios'}>📈 Relatórios</a>
          <a href="/dashboard/receita" class:active={path === '/dashboard/receita'}>📊 Desempenho</a>
        </div>
      {/if}

      <div class="nav-group bottom-group">
        <p class="nav-label">Sistema</p>
        {#if myRole === 'owner' || myRole === 'admin'}
          <a href="/dashboard/equipe" class:active={path === '/dashboard/equipe'}>👥 Equipe</a>
          <a href="/dashboard/configuracoes" class:active={path === '/dashboard/configuracoes'}>⚙️ Configurações</a>
        {/if}
        <a href="/dashboard/conta" class:active={path === '/dashboard/conta'}>👤 Minha Conta</a>
        <button class="logout-btn" on:click={handleLogout}>🚪 Sair</button>
      </div>
    </nav>
  </aside>

  <main class="main-viewport">
    <header class="system-status-bar status-green">
      <div class="status-info">
        <div class="pulse"></div>
        <span>SISTEMA OPERACIONAL: OPERAÇÃO NOMINAL</span>
      </div>
      <div class="quick-stats">
        <button class="notif-bell" on:click={() => showNotifPanel = !showNotifPanel}>
          🔔
          {#if unreadCount > 0}<span class="notif-badge">{unreadCount}</span>{/if}
        </button>
        <a href="/dashboard/health" class="btn-os-action">Ver Health Score</a>
      </div>

      {#if showNotifPanel}
        <div class="notif-dropdown">
          <div class="notif-header">
            <strong>Notificações</strong>
            <button class="notif-close" on:click={() => { showNotifPanel = false; unreadCount = 0; }}>✕</button>
          </div>
          {#each notifications as n}
            <div class="notif-item {n.type}">
              <span class="notif-icon">{n.icon}</span>
              <div>
                <strong>{n.title}</strong>
                <p>{n.desc}</p>
                <span class="notif-time">{n.time}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </header>

    <div class="os-content">
      <div class="page-transition">
        <slot />
      </div>
    </div>
  </main>
</div>

<!-- Overlay mobile -->
{#if mobileMenuOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="mobile-overlay" on:click={() => mobileMenuOpen = false}></div>
{/if}

<style>
  :global(body) { background: #0F0F11; margin: 0; color: #fff; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }

  /* Custom Scrollbar */
  :global(::-webkit-scrollbar) { width: 6px; height: 6px; }
  :global(::-webkit-scrollbar-track) { background: transparent; }
  :global(::-webkit-scrollbar-thumb) { background: #2a2a2a; border-radius: 3px; }
  :global(::-webkit-scrollbar-thumb:hover) { background: #444; }
  :global(*) { scrollbar-width: thin; scrollbar-color: #2a2a2a transparent; }
  .os-container { display: flex; height: 100vh; width: 100vw; overflow: hidden; }

  /* Sidebar */
  .sidebar-os { width: 240px; border-right: 1px solid #1A1A1E; background: #0F0F11; padding: 1.5rem 1rem; flex-shrink: 0; display: flex; flex-direction: column; overflow-y: auto; }
  .brand { display: flex; align-items: center; margin-bottom: 2rem; justify-content: flex-start; text-decoration: none; }
  .main-logo { height: auto; width: 140px; object-fit: contain; }

  .nav-group { margin-bottom: 1.25rem; }
  .nav-label { font-size: 0.6rem; color: #3A3A3E; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 800; margin: 0 0 0.5rem 0.8rem; }
  .nav-stack a { display: flex; align-items: center; gap: 10px; padding: 0.6rem 0.8rem; color: #555; text-decoration: none; font-size: 0.85rem; font-weight: 600; border-radius: 8px; transition: all 0.25s ease; border-left: 2px solid transparent; }
  .nav-stack a:hover { color: #eee; background: rgba(255,255,255,0.04); transform: translateX(2px); }
  .nav-stack a.active { color: #fff; background: #16161A; border: 1px solid #222; border-left: 2px solid #fff; }

  .bottom-group { margin-top: auto; padding-top: 1rem; border-top: 1px solid #1A1A1E; }
  .logout-btn { display: flex; align-items: center; gap: 10px; padding: 0.6rem 0.8rem; color: #555; background: none; border: none; font-size: 0.85rem; font-weight: 600; border-radius: 8px; cursor: pointer; width: 100%; text-align: left; transition: 0.2s; font-family: inherit; }
  .logout-btn:hover { color: #EF4444; background: rgba(239,68,68,0.05); }

  /* Status Bar */
  .main-viewport { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .system-status-bar { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 2rem; border-bottom: 1px solid #1A1A1E; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.05em; }
  .status-green { background: rgba(34, 197, 94, 0.03); color: #22C55E; }
  .status-info { display: flex; align-items: center; gap: 10px; }
  .pulse { width: 6px; height: 6px; background: #22C55E; border-radius: 50%; box-shadow: 0 0 10px #22C55E; animation: pulseGlow 2s ease-in-out infinite; }
  @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 6px #22C55E; } 50% { box-shadow: 0 0 16px #22C55E, 0 0 30px rgba(34,197,94,0.3); } }
  .quick-stats { display: flex; gap: 20px; align-items: center; color: #555; }

  .btn-os-action { background: #fff; color: #000; border: none; padding: 4px 12px; border-radius: 6px; font-weight: 700; font-size: 0.65rem; cursor: pointer; text-decoration: none; font-family: 'Inter', sans-serif; letter-spacing: 0.02em; transition: all 0.2s ease; }
  .btn-os-action:hover { background: #e0e0e0; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(255,255,255,0.1); }
  .os-content { flex: 1; overflow-y: auto; padding: 2rem; }

  .page-transition { animation: pageIn 0.35s ease both; }
  @keyframes pageIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

  /* Mobile */
  .mobile-toggle { display: none; position: fixed; top: 12px; left: 12px; z-index: 200; background: #16161A; border: 1px solid #222; color: #fff; width: 40px; height: 40px; border-radius: 8px; font-size: 1.2rem; cursor: pointer; }
  .mobile-overlay { display: none; }

  @media (max-width: 768px) {
    .mobile-toggle { display: flex; align-items: center; justify-content: center; }
    .mobile-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 90; }
    .sidebar-os { position: fixed; left: -260px; top: 0; bottom: 0; z-index: 100; transition: left 0.3s ease; }
    .sidebar-os.open { left: 0; }
    .os-content { padding: 1.5rem 1rem; padding-top: 3.5rem; }
    .system-status-bar { padding-left: 4rem; }
  }

  /* Notifications */
  .notif-bell { background: none; border: 1px solid #222; color: #888; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; font-size: 0.85rem; position: relative; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
  .notif-bell:hover { border-color: #E5C100; color: #E5C100; }
  .notif-badge { position: absolute; top: -4px; right: -4px; background: #EF4444; color: #fff; font-size: 0.55rem; font-weight: 900; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .notif-dropdown { position: fixed; top: 50px; right: 1rem; width: 340px; max-height: 400px; overflow-y: auto; background: #141414; border: 1px solid #222; border-radius: 14px; z-index: 500; box-shadow: 0 12px 40px rgba(0,0,0,0.5); }
  .notif-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid #1a1a1a; }
  .notif-header strong { color: #fff; font-size: 0.9rem; }
  .notif-close { background: none; border: none; color: #666; cursor: pointer; font-size: 0.85rem; }
  .notif-item { display: flex; gap: 0.75rem; padding: 0.85rem 1rem; border-bottom: 1px solid #111; transition: background 0.2s; }
  .notif-item:hover { background: #1a1a1a; }
  .notif-item:last-child { border-bottom: none; }
  .notif-icon { font-size: 1.1rem; flex-shrink: 0; margin-top: 2px; }
  .notif-item strong { color: #fff; font-size: 0.8rem; display: block; }
  .notif-item p { color: #888; font-size: 0.75rem; margin: 2px 0 0; line-height: 1.4; }
  .notif-time { color: #444; font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
</style>
