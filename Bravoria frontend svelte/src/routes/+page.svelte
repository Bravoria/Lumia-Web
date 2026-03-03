<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase.js';

  let annual = true;
  let visibleSections = {};
  let scrollY = 0;
  let heroRef;
  let mounted = false;

  const features = [
    { icon: '📱', title: 'Agente WhatsApp com IA', desc: 'Atende, agenda e tria pacientes automaticamente no seu número. 24h por dia, 7 dias por semana.' },
    { icon: '🧠', title: 'CEO Virtual', desc: 'Insights proativos sobre onde você perde pacientes, horários ociosos e oportunidades de crescimento.' },
    { icon: '✍️', title: 'Estrategista de Conteúdo', desc: 'Posts prontos para Instagram e WhatsApp. A IA entende sua especialidade e cria conteúdo que converte.' },
    { icon: '📅', title: 'Agenda Inteligente', desc: 'Controle consultas, confirme presença e reduza no-shows com lembretes automáticos integrados.' },
    { icon: '🎯', title: 'Pipeline de Pacientes', desc: 'Visualize cada lead do primeiro contato até virar paciente ativo. Nunca mais perca um orçamento.' },
    { icon: '📊', title: 'Métricas e Relatórios', desc: 'Visão completa do desempenho da clínica. Tome decisões com dados, não com achismo.' },
  ];

  const plans = [
    {
      name: 'Starter', price: 0, priceAnnual: 0, desc: 'Para conhecer a plataforma', highlight: false, cta: 'Começar grátis',
      features: ['1 usuário', 'Dashboard + Relatórios', 'CRM até 50 pacientes', '30 agendamentos/mês', 'Geração de conteúdo com IA', 'FAQ até 5 perguntas'],
      limitations: ['Sem CEO Virtual', 'Sem agendamento online', 'Sem WhatsApp IA']
    },
    {
      name: 'Pro', price: 197, priceAnnual: 164, desc: 'Para clínicas que querem crescer', highlight: true, badge: 'Mais popular', cta: 'Testar 7 dias grátis',
      features: ['Até 5 usuários', 'Pacientes ilimitados', 'Agendamentos ilimitados', 'CEO Virtual com IA', 'Agendamento online (link)', 'FAQ ilimitado', 'Relatórios avançados', 'Geração de conteúdo com IA', 'Suporte por chat'],
      limitations: ['Sem WhatsApp IA']
    },
    {
      name: 'Business', price: 497, priceAnnual: 414, desc: 'Para clínicas de alto volume', highlight: false, cta: 'Falar com consultor',
      features: ['Usuários ilimitados', 'Tudo do Pro incluído', 'WhatsApp com agente IA 24h', 'Pipeline com automações', 'Relatórios com exportação', 'Suporte prioritário', 'Onboarding dedicado'],
      limitations: []
    }
  ];

  const testimonials = [
    { name: 'Dra. Camila Ferreira', role: 'Ortodontista — SP', text: 'Reduzi 60% do tempo que a recepção gastava respondendo WhatsApp. Agora foco no que importa: atender pacientes.', avatar: 'CF' },
    { name: 'Dr. Rafael Mendes', role: 'Dermatologista — RJ', text: 'O CEO Virtual me mostrou que eu perdia 23% dos leads por demora na resposta. Corrigi e o resultado veio no mês seguinte.', avatar: 'RM' },
    { name: 'Dra. Juliana Costa', role: 'Clínica de Estética — MG', text: 'O gerador de conteúdo sozinho já valeu a assinatura. Posto 4x por semana sem pensar. Meus seguidores triplicaram.', avatar: 'JC' },
  ];

  let faqs = [
    { q: 'Preciso de conhecimento técnico para usar?', a: 'Não. O setup leva menos de 5 minutos. Basta preencher sua especialidade, horários e a IA faz o resto.', open: false },
    { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Sem multa, sem burocracia. Cancele direto no painel e sua cobrança para imediatamente.', open: false },
    { q: 'A IA responde com informações médicas?', a: 'Não. A IA é treinada para triagem, agendamento e dúvidas operacionais. Nunca dá diagnóstico.', open: false },
    { q: 'Funciona com qualquer especialidade?', a: 'Sim. Odontologia, dermatologia, estética, cardiologia, psicologia, fisioterapia — qualquer área da saúde.', open: false },
    { q: 'Meus dados estão seguros?', a: 'Utilizamos criptografia em trânsito e em repouso, além de Row Level Security que garante isolamento total dos dados.', open: false },
    { q: 'Como funciona o trial de 7 dias?', a: 'Acesse todas as funcionalidades do plano Pro por 7 dias sem pagar nada. Sem precisar colocar cartão de crédito.', open: false },
  ];

  function toggleFaq(index) {
    faqs[index].open = !faqs[index].open;
    faqs = faqs;
  }

  // Scroll-linked 3D transform for mockup
  $: heroProgress = Math.min(Math.max(scrollY / 800, 0), 1);
  $: mockupRotate = 20 - (heroProgress * 20);
  $: mockupScale = 0.85 + (heroProgress * 0.15);
  $: titleTranslate = -(heroProgress * 50);

  onMount(async () => {
    mounted = true;
    const { data: { session } } = await supabase.auth.getSession();
    if (session) goto('/dashboard');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          visibleSections[entry.target.id] = true;
          visibleSections = visibleSections;
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  });
</script>

<svelte:window bind:scrollY={scrollY} />

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <title>Lumia — O cérebro da operação</title>
  <meta name="description" content="Automatize atendimento, agendamentos e conteúdo da sua clínica com inteligência artificial." />
</svelte:head>

<main class="page">
  <!-- NAV -->
  <header class="nav">
    <div class="nav-inner">
      <a href="/" class="brand">
        <img src="/logo.png" alt="Lumia" class="nav-logo" />
      </a>
      <div class="nav-links">
        <a href="#features">Funcionalidades</a>
        <a href="#pricing">Planos</a>
        <a href="#faq">FAQ</a>
      </div>
      <div class="nav-actions">
        <a href="/login" class="link-login">Entrar</a>
        <a href="/cadastro" class="btn-nav">Começar grátis</a>
      </div>
    </div>
  </header>

  <!-- HERO with floating shapes -->
  <section class="hero" bind:this={heroRef}>
    <!-- Floating geometric shapes -->
    <div class="shapes-container" class:mounted>
      <div class="shape shape-1"></div>
      <div class="shape shape-2"></div>
      <div class="shape shape-3"></div>
      <div class="shape shape-4"></div>
      <div class="shape shape-5"></div>
    </div>

    <!-- Ambient gradient -->
    <div class="hero-ambient"></div>
    <div class="hero-vignette"></div>

    <div class="hero-content" class:mounted style="transform: translateY({titleTranslate}px)">
      <div class="hero-pill">
        <span class="pill-dot"></span>
        Para clínicas e profissionais de saúde
      </div>

      <h1>
        <span class="title-line line-1">O cérebro da</span>
        <span class="title-line line-2">sua operação.</span>
      </h1>

      <p class="hero-sub">
        Atendimento automático no WhatsApp, agenda inteligente, conteúdo com IA 
        e insights estratégicos — tudo num único painel.
      </p>

      <div class="hero-cta">
        <a href="/cadastro" class="btn-primary-lg">
          Começar agora
          <span class="btn-arrow">→</span>
        </a>
        <span class="hero-note">Sem cartão de crédito • Setup em 5 min</span>
      </div>

      <div class="hero-proof">
        <div class="proof-avatars">
          <div class="proof-av">CF</div>
          <div class="proof-av">RM</div>
          <div class="proof-av">JC</div>
          <div class="proof-av">+</div>
        </div>
        <div class="proof-text">
          <strong>+120 clínicas</strong> já automatizaram com a Lumia
        </div>
      </div>
    </div>

    <!-- 3D Scroll-linked Dashboard Mockup -->
    <div class="hero-mockup" class:mounted style="transform: perspective(1200px) rotateX({mockupRotate}deg) scale({mockupScale});">
      <div class="mockup-window">
        <div class="mockup-bar">
          <div class="bar-dots"><span></span><span></span><span></span></div>
          <span class="bar-url">lumia-web.vercel.app/dashboard</span>
        </div>
        <div class="mockup-screen">
          <div class="mock-sidebar">
            <div class="ms-brand"><img src="/logo-icon.png" alt="Lumia" class="ms-logo-img" /></div>
            <div class="ms-nav">
              <div class="ms-item active"></div>
              <div class="ms-item"></div>
              <div class="ms-item"></div>
              <div class="ms-item"></div>
            </div>
          </div>
          <div class="mock-main">
            <div class="mock-topbar"></div>
            <div class="mock-grid">
              <div class="mock-card"><div class="mc-label"></div><div class="mc-val"></div></div>
              <div class="mock-card"><div class="mc-label"></div><div class="mc-val"></div></div>
              <div class="mock-card mc-white"><div class="mc-label dark"></div><div class="mc-val dark"></div></div>
              <div class="mock-card"><div class="mc-label"></div><div class="mc-val"></div></div>
            </div>
            <div class="mock-chart">
              <svg viewBox="0 0 600 80">
                <path d="M0,60 Q80,40 160,55 T320,20 T480,35 T600,5" fill="none" stroke="#fff" stroke-width="2" opacity="0.12"/>
                <path d="M0,60 Q80,40 160,55 T320,20 T480,35 T600,5 V80 H0 Z" fill="url(#cg)" opacity="0.04"/>
                <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff"/><stop offset="100%" stop-color="transparent"/></linearGradient></defs>
              </svg>
            </div>
          </div>
        </div>
      </div>
      <!-- Glow under mockup -->
      <div class="mockup-glow"></div>
    </div>
  </section>

  <!-- SPECIALTIES -->
  <section class="logos-bar">
    <p>Feito para profissionais de</p>
    <div class="logos-scroll">
      <span>🦷 Odontologia</span>
      <span>💉 Dermatologia</span>
      <span>✨ Estética</span>
      <span>❤️ Cardiologia</span>
      <span>🧠 Psicologia</span>
      <span>💪 Fisioterapia</span>
      <span>👁️ Oftalmologia</span>
      <span>🩺 Clínica Geral</span>
    </div>
  </section>

  <!-- FEATURES -->
  <section class="features" id="features" data-animate>
    <div class="section-header">
      <p class="section-tag">FUNCIONALIDADES</p>
      <h2>Tudo que sua clínica precisa.<br/><span class="accent">Num só lugar.</span></h2>
      <p class="section-sub">Cada módulo foi pensado para resolver um problema real de clínicas de saúde.</p>
    </div>
    <div class="features-grid" class:visible={visibleSections['features']}>
      {#each features as f, i}
        <div class="feature-card" style="animation-delay: {i * 80}ms">
          <span class="fc-icon">{f.icon}</span>
          <h3>{f.title}</h3>
          <p>{f.desc}</p>
        </div>
      {/each}
    </div>
  </section>

  <!-- HOW IT WORKS -->
  <section class="how" id="how" data-animate>
    <div class="section-header">
      <p class="section-tag">COMO FUNCIONA</p>
      <h2>Do cadastro ao primeiro atendimento<br/><span class="accent">em menos de 5 minutos.</span></h2>
    </div>
    <div class="steps" class:visible={visibleSections['how']}>
      <div class="step">
        <div class="step-num">01</div>
        <h3>Crie sua conta</h3>
        <p>Nome, email e senha. Sem burocracias.</p>
      </div>
      <div class="step-line"></div>
      <div class="step">
        <div class="step-num">02</div>
        <h3>Configure a clínica</h3>
        <p>Especialidade, horários e serviços.</p>
      </div>
      <div class="step-line"></div>
      <div class="step">
        <div class="step-num">03</div>
        <h3>Ative o sistema</h3>
        <p>Dashboard, agenda e IA. Tudo pronto.</p>
      </div>
    </div>
  </section>

  <!-- TESTIMONIALS -->
  <section class="testimonials" id="testimonials" data-animate>
    <div class="section-header">
      <p class="section-tag">DEPOIMENTOS</p>
      <h2>Quem usa, <span class="accent">recomenda.</span></h2>
    </div>
    <div class="test-grid" class:visible={visibleSections['testimonials']}>
      {#each testimonials as t, i}
        <div class="test-card" style="animation-delay: {i * 100}ms">
          <div class="test-stars">★★★★★</div>
          <p class="test-text">"{t.text}"</p>
          <div class="test-author">
            <div class="test-av">{t.avatar}</div>
            <div>
              <strong>{t.name}</strong>
              <span>{t.role}</span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- PRICING -->
  <section class="pricing" id="pricing" data-animate>
    <div class="section-header">
      <p class="section-tag">PLANOS</p>
      <h2>Escolha o plano ideal<br/><span class="accent">para sua clínica.</span></h2>
      <p class="section-sub">Todos os planos incluem 7 dias de teste grátis.</p>
      <div class="billing-toggle">
        <button class:active={!annual} on:click={() => annual = false}>Mensal</button>
        <button class:active={annual} on:click={() => annual = true}>Anual <span class="save-badge">-17%</span></button>
      </div>
    </div>
    <div class="plans-grid" class:visible={visibleSections['pricing']}>
      {#each plans as plan, i}
        <div class="plan-card" class:featured={plan.highlight} style="animation-delay: {i * 100}ms">
          {#if plan.badge}<div class="plan-badge">{plan.badge}</div>{/if}
          <div class="plan-header">
            <h3>{plan.name}</h3>
            <p class="plan-desc">{plan.desc}</p>
          </div>
          <div class="plan-price">
            {#if plan.price === 0}
              <span class="price-big">R$ 0</span><span class="price-period">para sempre</span>
            {:else}
              <span class="price-big">R$ {annual ? plan.priceAnnual : plan.price}</span><span class="price-period">/mês</span>
              {#if annual}<span class="price-original">R$ {plan.price}/mês</span>{/if}
            {/if}
          </div>
          <a href="/cadastro" class="plan-cta" class:plan-cta-featured={plan.highlight}>{plan.cta}</a>
          <div class="plan-features">
            {#each plan.features as f}<div class="pf-item"><span class="pf-check">✓</span> {f}</div>{/each}
            {#each plan.limitations as l}<div class="pf-item disabled"><span class="pf-x">✕</span> {l}</div>{/each}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- FAQ -->
  <section class="faq-section" id="faq" data-animate>
    <div class="section-header">
      <p class="section-tag">FAQ</p>
      <h2>Perguntas <span class="accent">frequentes.</span></h2>
    </div>
    <div class="faq-list" class:visible={visibleSections['faq']}>
      {#each faqs as faq, i}
        <button class="faq-item" class:open={faq.open} on:click={() => toggleFaq(i)} style="animation-delay: {i * 60}ms">
          <div class="faq-q">
            <span>{faq.q}</span>
            <span class="faq-arrow">{faq.open ? '−' : '+'}</span>
          </div>
          {#if faq.open}<p class="faq-a">{faq.a}</p>{/if}
        </button>
      {/each}
    </div>
  </section>

  <!-- FINAL CTA -->
  <section class="final-cta">
    <div class="cta-shapes">
      <div class="cta-shape cta-shape-1"></div>
      <div class="cta-shape cta-shape-2"></div>
    </div>
    <div class="cta-content">
      <h2>Sua clínica merece operar<br/>no <span class="accent">piloto automático.</span></h2>
      <p>Comece grátis. Sem cartão. Sem compromisso.</p>
      <a href="/cadastro" class="btn-primary-lg">
        Criar conta agora
        <span class="btn-arrow">→</span>
      </a>
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <a href="/" class="brand"><img src="/logo.png" alt="Lumia" class="nav-logo" /></a>
        <p>O cérebro da operação.</p>
      </div>
      <div class="footer-links">
        <div class="footer-col">
          <h4>Produto</h4>
          <a href="#features">Funcionalidades</a>
          <a href="#pricing">Planos</a>
          <a href="#faq">FAQ</a>
        </div>
        <div class="footer-col">
          <h4>Legal</h4>
          <a href="/termos">Termos de Uso</a>
          <a href="/privacidade">Privacidade</a>
        </div>
        <div class="footer-col">
          <h4>Conta</h4>
          <a href="/login">Entrar</a>
          <a href="/cadastro">Criar conta</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© {new Date().getFullYear()} Lumia — Todos os direitos reservados.</span>
    </div>
  </footer>
</main>

<style>
  /* ===== BASE ===== */
  :global(body) { margin: 0; background: #050505; color: #fff; }
  .page { font-family: 'Inter', -apple-system, sans-serif; overflow-x: hidden; -webkit-font-smoothing: antialiased; }
  .accent { color: #aaa; }

  /* ===== NAV ===== */
  .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; backdrop-filter: blur(24px); background: rgba(5,5,5,0.8); border-bottom: 1px solid rgba(255,255,255,0.04); }
  .nav-inner { max-width: 1200px; margin: 0 auto; padding: 0.85rem 2rem; display: flex; align-items: center; justify-content: space-between; }
  .brand { display: flex; align-items: center; text-decoration: none; }
  .nav-logo { height: auto; width: 110px; object-fit: contain; }
  .nav-links { display: flex; gap: 2.5rem; }
  .nav-links a { color: #555; text-decoration: none; font-size: 0.82rem; font-weight: 500; transition: color 0.2s; }
  .nav-links a:hover { color: #fff; }
  .nav-actions { display: flex; align-items: center; gap: 1.25rem; }
  .link-login { color: #777; text-decoration: none; font-size: 0.82rem; font-weight: 500; }
  .link-login:hover { color: #fff; }
  .btn-nav { background: #fff; color: #000; border: none; padding: 0.5rem 1.1rem; border-radius: 8px; font-weight: 700; font-size: 0.8rem; cursor: pointer; font-family: inherit; transition: all 0.2s; text-decoration: none; }
  .btn-nav:hover { background: #e0e0e0; }

  /* ===== FLOATING SHAPES ===== */
  .shapes-container { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 1; }
  .shape {
    position: absolute;
    border-radius: 50%;
    border: 1.5px solid rgba(255,255,255,0.06);
    background: linear-gradient(135deg, rgba(255,255,255,0.03), transparent);
    backdrop-filter: blur(1px);
    opacity: 0;
    transform: translateY(-120px) rotate(-15deg);
    transition: none;
  }
  .shapes-container.mounted .shape {
    animation: shapeIn 2s cubic-bezier(0.23, 0.86, 0.39, 0.96) forwards;
  }
  .shape-1 { width: 500px; height: 120px; left: -8%; top: 18%; animation-delay: 0.2s !important; }
  .shape-2 { width: 400px; height: 100px; right: -3%; top: 72%; animation-delay: 0.4s !important; }
  .shape-3 { width: 250px; height: 65px; left: 8%; bottom: 8%; animation-delay: 0.5s !important; }
  .shape-4 { width: 180px; height: 50px; right: 18%; top: 12%; animation-delay: 0.6s !important; }
  .shape-5 { width: 130px; height: 35px; left: 22%; top: 6%; animation-delay: 0.7s !important; }

  .shapes-container.mounted .shape-1 { animation: shapeIn 2s 0.2s cubic-bezier(0.23, 0.86, 0.39, 0.96) forwards, shapeFloat 14s 2.2s ease-in-out infinite; }
  .shapes-container.mounted .shape-2 { animation: shapeIn 2s 0.4s cubic-bezier(0.23, 0.86, 0.39, 0.96) forwards, shapeFloat 12s 2.4s ease-in-out infinite; }
  .shapes-container.mounted .shape-3 { animation: shapeIn 2s 0.5s cubic-bezier(0.23, 0.86, 0.39, 0.96) forwards, shapeFloat 16s 2.5s ease-in-out infinite; }
  .shapes-container.mounted .shape-4 { animation: shapeIn 2s 0.6s cubic-bezier(0.23, 0.86, 0.39, 0.96) forwards, shapeFloat 10s 2.6s ease-in-out infinite; }
  .shapes-container.mounted .shape-5 { animation: shapeIn 2s 0.7s cubic-bezier(0.23, 0.86, 0.39, 0.96) forwards, shapeFloat 13s 2.7s ease-in-out infinite; }

  @keyframes shapeIn {
    from { opacity: 0; transform: translateY(-120px) rotate(-15deg); }
    to { opacity: 1; transform: translateY(0) rotate(0deg); }
  }
  @keyframes shapeFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(18px); }
  }

  .shape-1 { transform: rotate(12deg); }
  .shape-2 { transform: rotate(-15deg); }
  .shape-3 { transform: rotate(-8deg); }
  .shape-4 { transform: rotate(20deg); }
  .shape-5 { transform: rotate(-22deg); }

  /* ===== HERO ===== */
  .hero { position: relative; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 7rem 2rem 4rem; text-align: center; overflow: hidden; }
  .hero-ambient { position: absolute; inset: 0; background: radial-gradient(ellipse 80% 50% at 50% 30%, rgba(255,255,255,0.02), transparent); pointer-events: none; z-index: 0; }
  .hero-vignette { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(5,5,5,0.3) 0%, transparent 30%, transparent 70%, rgba(5,5,5,0.9) 100%); pointer-events: none; z-index: 2; }

  .hero-content { position: relative; z-index: 3; max-width: 750px; opacity: 0; transform: translateY(30px); }
  .hero-content.mounted { animation: fadeUp 1s 0.3s ease forwards; }

  @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }

  .hero-pill { display: inline-flex; align-items: center; gap: 8px; padding: 0.4rem 1rem; border: 1px solid rgba(255,255,255,0.06); color: #888; border-radius: 999px; font-size: 0.76rem; font-weight: 500; margin-bottom: 2rem; background: rgba(255,255,255,0.02); }
  .pill-dot { width: 5px; height: 5px; background: #fff; border-radius: 50%; animation: pulseDot 2.5s infinite; }
  @keyframes pulseDot { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }

  h1 { font-size: 4.5rem; font-weight: 900; line-height: 1; letter-spacing: -3.5px; margin: 0 0 1.5rem; }
  .title-line { display: block; }
  .line-1 { opacity: 0; animation: titleIn 1s 0.6s ease forwards; }
  .line-2 { opacity: 0; animation: titleIn 1s 0.8s ease forwards; background: linear-gradient(180deg, #fff 30%, #666); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  @keyframes titleIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

  .hero-sub { color: #555; font-size: 1.05rem; line-height: 1.7; max-width: 520px; margin: 0 auto 2.5rem; letter-spacing: -0.2px; opacity: 0; animation: fadeUp 1s 1s ease forwards; }

  .hero-cta { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; margin-bottom: 3rem; opacity: 0; animation: fadeUp 1s 1.2s ease forwards; }
  .btn-primary-lg { display: inline-flex; align-items: center; gap: 10px; background: #fff; color: #000; border: none; padding: 0.85rem 1.8rem; border-radius: 10px; font-size: 0.92rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; text-decoration: none; }
  .btn-primary-lg:hover { background: #e0e0e0; transform: translateY(-1px); }
  .btn-arrow { transition: transform 0.2s; }
  .btn-primary-lg:hover .btn-arrow { transform: translateX(3px); }
  .hero-note { color: #333; font-size: 0.75rem; font-weight: 500; }

  .hero-proof { display: flex; align-items: center; gap: 12px; justify-content: center; opacity: 0; animation: fadeUp 1s 1.4s ease forwards; }
  .proof-avatars { display: flex; }
  .proof-av { width: 28px; height: 28px; border-radius: 50%; background: #151515; border: 2px solid #050505; color: #666; font-size: 0.5rem; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-left: -5px; }
  .proof-av:first-child { margin-left: 0; }
  .proof-text { color: #444; font-size: 0.78rem; }
  .proof-text strong { color: #888; }

  /* ===== MOCKUP 3D ===== */
  .hero-mockup {
    position: relative; z-index: 3; max-width: 850px; width: 100%; margin: 2rem auto 0;
    opacity: 0; transition: transform 0.05s linear;
    will-change: transform;
  }
  .hero-mockup.mounted { animation: mockupIn 1.5s 1s ease forwards; }
  @keyframes mockupIn { from { opacity: 0; } to { opacity: 1; } }

  .mockup-window { background: #111; border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; overflow: hidden; box-shadow: 0 60px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03); }
  .mockup-glow { position: absolute; bottom: -40px; left: 10%; right: 10%; height: 80px; background: radial-gradient(ellipse, rgba(255,255,255,0.03), transparent); filter: blur(30px); pointer-events: none; }
  .mockup-bar { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #0d0d0d; border-bottom: 1px solid rgba(255,255,255,0.04); }
  .bar-dots { display: flex; gap: 5px; }
  .bar-dots span { width: 8px; height: 8px; border-radius: 50%; background: #1a1a1a; }
  .bar-url { color: #2a2a2a; font-size: 0.62rem; font-weight: 500; margin-left: auto; }
  .mockup-screen { display: flex; height: 280px; }
  .mock-sidebar { width: 44px; background: #0d0d0d; border-right: 1px solid rgba(255,255,255,0.04); padding: 10px 0; display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .ms-brand { margin-bottom: 10px; } .ms-logo-img { width: 18px; height: 18px; object-fit: contain; border-radius: 3px; }
  .ms-item { width: 22px; height: 22px; border-radius: 5px; background: #141414; } .ms-item.active { background: #1a1a1a; border: 1px solid #222; }
  .mock-main { flex: 1; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
  .mock-topbar { height: 5px; width: 100%; background: rgba(255,255,255,0.02); border-radius: 3px; }
  .mock-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .mock-card { background: #141414; border: 1px solid #1a1a1a; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
  .mc-label { height: 4px; width: 40%; background: #1e1e1e; border-radius: 2px; } .mc-val { height: 12px; width: 60%; background: #222; border-radius: 3px; }
  .mc-white { background: #fff; border: none; } .mc-label.dark { background: #ccc; } .mc-val.dark { background: #aaa; }
  .mock-chart { flex: 1; padding: 8px; } .mock-chart svg { width: 100%; height: 100%; }

  /* ===== LOGOS BAR ===== */
  .logos-bar { padding: 2.5rem 2rem; border-top: 1px solid rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.03); text-align: center; }
  .logos-bar p { color: #2a2a2a; font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 1rem; }
  .logos-scroll { display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap; }
  .logos-scroll span { color: #3a3a3a; font-size: 0.82rem; font-weight: 500; white-space: nowrap; }

  /* ===== SECTIONS SHARED ===== */
  .section-header { text-align: center; margin-bottom: 3rem; }
  .section-tag { color: #444; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 4px; margin: 0 0 0.75rem; }
  .section-header h2 { font-size: 2.4rem; font-weight: 900; line-height: 1.08; letter-spacing: -1.5px; margin: 0 0 1rem; }
  .section-sub { color: #555; font-size: 0.95rem; margin: 0 auto; max-width: 480px; line-height: 1.6; }
  .features-grid, .steps, .test-grid, .plans-grid, .faq-list { opacity: 0; transform: translateY(25px); transition: opacity 0.7s ease, transform 0.7s ease; }
  .visible { opacity: 1; transform: translateY(0); }

  /* ===== FEATURES ===== */
  .features { padding: 6rem 2rem; max-width: 1100px; margin: 0 auto; }
  .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: rgba(255,255,255,0.03); border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.03); }
  .feature-card { background: #0a0a0a; padding: 2.25rem; transition: background 0.3s; }
  .feature-card:hover { background: #0f0f0f; }
  .fc-icon { font-size: 1.3rem; display: block; margin-bottom: 1.25rem; }
  .feature-card h3 { font-size: 1rem; font-weight: 800; margin: 0 0 0.5rem; letter-spacing: -0.3px; }
  .feature-card p { color: #4a4a4a; font-size: 0.85rem; line-height: 1.6; margin: 0; }

  /* ===== HOW ===== */
  .how { padding: 6rem 2rem; max-width: 900px; margin: 0 auto; }
  .steps { display: flex; align-items: flex-start; gap: 0; justify-content: center; }
  .step { display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1; padding: 0 1.5rem; }
  .step-num { font-size: 2.5rem; font-weight: 900; color: #1a1a1a; margin-bottom: 1rem; }
  .step h3 { font-size: 1rem; font-weight: 800; margin: 0 0 0.4rem; letter-spacing: -0.3px; }
  .step p { color: #4a4a4a; font-size: 0.85rem; line-height: 1.5; margin: 0; }
  .step-line { width: 50px; height: 1px; background: #1a1a1a; margin-top: 2.5rem; flex-shrink: 0; }

  /* ===== TESTIMONIALS ===== */
  .testimonials { padding: 6rem 2rem; max-width: 1100px; margin: 0 auto; }
  .test-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
  .test-card { background: #0a0a0a; border: 1px solid #131313; border-radius: 14px; padding: 2rem; transition: border-color 0.3s; }
  .test-card:hover { border-color: #1e1e1e; }
  .test-stars { color: #fff; font-size: 0.7rem; margin-bottom: 1rem; letter-spacing: 2px; opacity: 0.2; }
  .test-text { color: #777; font-size: 0.9rem; line-height: 1.65; margin: 0 0 1.5rem; }
  .test-author { display: flex; align-items: center; gap: 10px; }
  .test-av { width: 32px; height: 32px; background: #131313; border: 1px solid #1a1a1a; color: #555; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 700; flex-shrink: 0; }
  .test-author strong { display: block; color: #bbb; font-size: 0.8rem; }
  .test-author span { color: #3a3a3a; font-size: 0.7rem; }

  /* ===== PRICING ===== */
  .pricing { padding: 6rem 2rem; max-width: 1100px; margin: 0 auto; }
  .billing-toggle { display: inline-flex; background: #0a0a0a; border: 1px solid #151515; border-radius: 10px; padding: 3px; margin-top: 1.5rem; }
  .billing-toggle button { background: transparent; border: none; color: #444; padding: 0.5rem 1.4rem; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; }
  .billing-toggle button.active { background: #151515; color: #fff; }
  .save-badge { background: #fff; color: #000; font-size: 0.58rem; font-weight: 800; padding: 2px 5px; border-radius: 4px; }

  .plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; align-items: start; }
  .plan-card { background: #0a0a0a; border: 1px solid #131313; border-radius: 16px; padding: 2rem; position: relative; transition: border-color 0.3s; }
  .plan-card:hover { border-color: #1e1e1e; }
  .plan-card.featured { background: #0d0d0d; border-color: #2a2a2a; }
  .plan-badge { position: absolute; top: -11px; left: 50%; transform: translateX(-50%); background: #fff; color: #000; font-size: 0.62rem; font-weight: 800; padding: 4px 12px; border-radius: 20px; white-space: nowrap; }

  .plan-header { margin-bottom: 1.5rem; }
  .plan-header h3 { font-size: 1.25rem; font-weight: 800; margin: 0 0 0.25rem; letter-spacing: -0.5px; }
  .plan-desc { color: #444; font-size: 0.8rem; margin: 0; }
  .plan-price { margin-bottom: 1.5rem; display: flex; align-items: baseline; gap: 4px; flex-wrap: wrap; }
  .price-big { font-size: 2.6rem; font-weight: 900; letter-spacing: -2px; }
  .price-period { color: #3a3a3a; font-size: 0.82rem; font-weight: 500; }
  .price-original { color: #2a2a2a; font-size: 0.75rem; text-decoration: line-through; margin-left: 8px; }
  .plan-cta { display: block; width: 100%; padding: 0.75rem; background: #131313; border: 1px solid #1a1a1a; color: #aaa; border-radius: 10px; font-size: 0.88rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; margin-bottom: 1.5rem; text-decoration: none; text-align: center; box-sizing: border-box; }
  .plan-cta:hover { border-color: #2a2a2a; color: #fff; }
  .plan-cta-featured { background: #fff; color: #000; border-color: #fff; }
  .plan-cta-featured:hover { background: #e0e0e0; border-color: #e0e0e0; }
  .plan-features { display: flex; flex-direction: column; gap: 0.5rem; }
  .pf-item { font-size: 0.8rem; color: #777; display: flex; align-items: center; gap: 8px; }
  .pf-item.disabled { color: #2a2a2a; }
  .pf-check { color: #fff; font-weight: 700; font-size: 0.72rem; opacity: 0.4; }
  .pf-x { color: #222; font-weight: 700; font-size: 0.72rem; }

  /* ===== FAQ ===== */
  .faq-section { padding: 6rem 2rem; max-width: 700px; margin: 0 auto; }
  .faq-list { display: flex; flex-direction: column; gap: 0.35rem; }
  .faq-item { background: #0a0a0a; border: 1px solid #131313; border-radius: 12px; padding: 1.1rem 1.3rem; width: 100%; text-align: left; cursor: pointer; font-family: inherit; color: inherit; transition: border-color 0.2s; }
  .faq-item:hover { border-color: #1e1e1e; }
  .faq-item.open { border-color: #222; }
  .faq-q { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
  .faq-q span:first-child { font-size: 0.9rem; font-weight: 600; color: #bbb; }
  .faq-arrow { font-size: 1rem; color: #444; font-weight: 300; flex-shrink: 0; }
  .faq-a { color: #555; font-size: 0.85rem; line-height: 1.6; margin: 0.75rem 0 0; padding-top: 0.75rem; border-top: 1px solid #131313; }

  /* ===== FINAL CTA ===== */
  .final-cta { padding: 8rem 2rem; text-align: center; position: relative; overflow: hidden; }
  .cta-shapes { position: absolute; inset: 0; pointer-events: none; }
  .cta-shape { position: absolute; border-radius: 50%; border: 1px solid rgba(255,255,255,0.04); background: linear-gradient(135deg, rgba(255,255,255,0.02), transparent); }
  .cta-shape-1 { width: 350px; height: 90px; left: -5%; top: 30%; transform: rotate(10deg); animation: shapeFloat 15s ease-in-out infinite; }
  .cta-shape-2 { width: 250px; height: 60px; right: -3%; bottom: 20%; transform: rotate(-12deg); animation: shapeFloat 12s 1s ease-in-out infinite; }
  .cta-content { position: relative; z-index: 2; }
  .cta-content h2 { font-size: 2.6rem; font-weight: 900; letter-spacing: -1.5px; margin: 0 0 1rem; line-height: 1.08; }
  .cta-content p { color: #444; font-size: 0.95rem; margin: 0 0 2rem; }

  /* ===== FOOTER ===== */
  .footer { border-top: 1px solid rgba(255,255,255,0.03); padding: 3rem 2rem 1.5rem; }
  .footer-inner { max-width: 1100px; margin: 0 auto; display: flex; justify-content: space-between; gap: 3rem; margin-bottom: 2.5rem; }
  .footer-brand p { color: #2a2a2a; font-size: 0.8rem; margin: 0.75rem 0 0; }
  .footer-links { display: flex; gap: 4rem; }
  .footer-col { display: flex; flex-direction: column; gap: 0.45rem; }
  .footer-col h4 { color: #333; font-size: 0.62rem; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; margin: 0 0 0.4rem; }
  .footer-col a { color: #444; text-decoration: none; font-size: 0.8rem; transition: color 0.2s; }
  .footer-col a:hover { color: #fff; }
  .footer-bottom { max-width: 1100px; margin: 0 auto; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.03); }
  .footer-bottom span { color: #222; font-size: 0.72rem; }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 900px) {
    h1 { font-size: 2.8rem; letter-spacing: -2px; }
    .section-header h2 { font-size: 1.85rem; }
    .features-grid, .test-grid, .plans-grid { grid-template-columns: 1fr; max-width: 500px; margin: 0 auto; }
    .features-grid { border-radius: 14px; }
    .steps { flex-direction: column; align-items: center; }
    .step-line { width: 1px; height: 30px; }
    .nav-links { display: none; }
    .hero-mockup { display: none; }
    .footer-inner { flex-direction: column; gap: 2rem; }
    .footer-links { gap: 2rem; }
    .cta-content h2 { font-size: 2rem; }
    .logos-scroll { gap: 1rem; }
    .shapes-container { display: none; }
  }
</style>
