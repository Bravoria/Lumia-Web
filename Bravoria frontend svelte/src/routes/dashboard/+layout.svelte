<script>
  import { fade } from 'svelte/transition';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase.js';

  $: path = $page.url.pathname;

  let mobileMenuOpen = false;

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
    <div class="brand">
      <img src="/logo.png" alt="LumiaOS" class="main-logo" />
    </div>

    <nav class="nav-stack" on:click={() => mobileMenuOpen = false}>
      <div class="nav-group">
        <p class="nav-label">Comando</p>
        <a href="/dashboard" class:active={path === '/dashboard'}>📊 Dashboard</a>
        <a href="/dashboard/health" class:active={path === '/dashboard/health'}>🛡️ Health Center</a>
        <a href="/dashboard/ceo" class:active={path === '/dashboard/ceo'}>🧠 CEO Virtual</a>
      </div>

      <div class="nav-group">
        <p class="nav-label">Operações</p>
        <a href="/dashboard/agenda" class:active={path === '/dashboard/agenda'}>📅 Agenda</a>
        <a href="/dashboard/faq" class:active={path.startsWith('/dashboard/faq')}>🎓 Treinamento IA</a>
        <a href="/dashboard/whatsapp" class:active={path === '/dashboard/whatsapp'}>📱 WhatsApp IA</a>
      </div>

      <div class="nav-group">
        <p class="nav-label">Crescimento</p>
        <a href="/dashboard/pipeline" class:active={path === '/dashboard/pipeline'}>🎯 Pipeline</a>
        <a href="/dashboard/conteudo" class:active={path === '/dashboard/conteudo'}>✍️ Conteúdo IA</a>
      </div>

      <div class="nav-group">
        <p class="nav-label">Financeiro</p>
        <a href="/dashboard/receita" class:active={path === '/dashboard/receita'}>💰 Receita</a>
        <a href="/dashboard/relatorios" class:active={path === '/dashboard/relatorios'}>📈 Performance</a>
      </div>

      <div class="nav-group bottom-group">
        <p class="nav-label">Sistema</p>
        <a href="/dashboard/configuracoes" class:active={path === '/dashboard/configuracoes'}>⚙️ Configurações</a>
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
        <a href="/dashboard/health" class="btn-os-action">Ver Health Score</a>
      </div>
    </header>

    <div class="os-content">
      <slot />
    </div>
  </main>
</div>

<!-- Overlay mobile -->
{#if mobileMenuOpen}
  <div class="mobile-overlay" on:click={() => mobileMenuOpen = false}></div>
{/if}

<style>
  :global(body) { background: #0F0F11; margin: 0; color: #fff; font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
  .os-container { display: flex; height: 100vh; width: 100vw; overflow: hidden; }

  /* Sidebar */
  .sidebar-os { width: 240px; border-right: 1px solid #1A1A1E; background: #0F0F11; padding: 1.5rem 1rem; flex-shrink: 0; display: flex; flex-direction: column; overflow-y: auto; }
  .brand { display: flex; align-items: center; margin-bottom: 2rem; justify-content: flex-start; }
  .main-logo { height: auto; width: 140px; object-fit: contain; }

  .nav-group { margin-bottom: 1.25rem; }
  .nav-label { font-size: 0.6rem; color: #3A3A3E; text-transform: uppercase; letter-spacing: 0.15em; font-weight: 800; margin: 0 0 0.5rem 0.8rem; }
  .nav-stack a { display: flex; align-items: center; gap: 10px; padding: 0.6rem 0.8rem; color: #555; text-decoration: none; font-size: 0.85rem; font-weight: 600; border-radius: 8px; transition: 0.2s; }
  .nav-stack a:hover { color: #eee; background: rgba(255,255,255,0.02); }
  .nav-stack a.active { color: #fff; background: #16161A; border: 1px solid #222; }

  .bottom-group { margin-top: auto; padding-top: 1rem; border-top: 1px solid #1A1A1E; }
  .logout-btn { display: flex; align-items: center; gap: 10px; padding: 0.6rem 0.8rem; color: #555; background: none; border: none; font-size: 0.85rem; font-weight: 600; border-radius: 8px; cursor: pointer; width: 100%; text-align: left; transition: 0.2s; font-family: inherit; }
  .logout-btn:hover { color: #EF4444; background: rgba(239,68,68,0.05); }

  /* Status Bar */
  .main-viewport { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .system-status-bar { height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 2rem; border-bottom: 1px solid #1A1A1E; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.05em; }
  .status-green { background: rgba(34, 197, 94, 0.03); color: #22C55E; }
  .status-info { display: flex; align-items: center; gap: 10px; }
  .pulse { width: 6px; height: 6px; background: #22C55E; border-radius: 50%; box-shadow: 0 0 10px #22C55E; }
  .quick-stats { display: flex; gap: 20px; align-items: center; color: #555; }

  .btn-os-action { background: #fff; color: #000; border: none; padding: 4px 12px; border-radius: 4px; font-weight: 900; font-size: 0.65rem; cursor: pointer; text-decoration: none; }
  .btn-os-action:hover { background: #E5C100; }
  .os-content { flex: 1; overflow-y: auto; padding: 2rem; }

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
</style>
