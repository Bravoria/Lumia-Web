<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase.js';

  let annual = true;
  let visibleSections = {};

  const features = [
    { icon: '📱', title: 'Agente WhatsApp com IA', desc: 'Atende, agenda e tria pacientes automaticamente no seu número. 24 horas por dia, 7 dias por semana.', tag: 'Business' },
    { icon: '🧠', title: 'CEO Virtual', desc: 'Insights proativos sobre onde você perde pacientes, horários ociosos e oportunidades de crescimento.', tag: 'Pro' },
    { icon: '✍️', title: 'Estrategista de Conteúdo', desc: 'Posts prontos para Instagram e WhatsApp. A IA entende sua especialidade e cria conteúdo que converte.', tag: 'Todos' },
    { icon: '📅', title: 'Agenda Inteligente', desc: 'Controle consultas, confirme presença e reduza no-shows com lembretes automáticos integrados.', tag: 'Pro' },
    { icon: '🎯', title: 'Pipeline de Pacientes', desc: 'Visualize cada lead do primeiro contato até virar paciente ativo. Nunca mais perca um orçamento.', tag: 'Todos' },
    { icon: '💰', title: 'Painel Financeiro', desc: 'Receita real, taxa de conversão por serviço e projeções. Tome decisões com dados, não com achismo.', tag: 'Pro' },
  ];

  const plans = [
    {
      name: 'Starter',
      price: 0,
      priceAnnual: 0,
      desc: 'Para conhecer a plataforma',
      highlight: false,
      cta: 'Começar grátis',
      features: [
        '1 usuário',
        'Dashboard + Relatórios',
        'CRM até 50 pacientes',
        '30 agendamentos/mês',
        'Geração de conteúdo com IA',
        'FAQ até 5 perguntas',
      ],
      limitations: [
        'Sem CEO Virtual',
        'Sem agendamento online',
        'Sem WhatsApp IA'
      ]
    },
    {
      name: 'Pro',
      price: 197,
      priceAnnual: 164,
      desc: 'Para clínicas que querem crescer',
      highlight: true,
      badge: 'Mais popular',
      cta: 'Testar 7 dias grátis',
      features: [
        'Até 5 usuários',
        'Pacientes ilimitados',
        'Agendamentos ilimitados',
        'CEO Virtual com IA',
        'Agendamento online (link)',
        'FAQ ilimitado',
        'Relatórios avançados',
        'Geração de conteúdo com IA',
        'Suporte por chat',
      ],
      limitations: [
        'Sem WhatsApp IA'
      ]
    },
    {
      name: 'Business',
      price: 497,
      priceAnnual: 414,
      desc: 'Para clínicas de alto volume',
      highlight: false,
      cta: 'Falar com consultor',
      features: [
        'Usuários ilimitados',
        'Tudo do Pro incluído',
        'WhatsApp com agente IA 24h',
        'Pipeline com automações',
        'Relatórios com exportação',
        'Suporte prioritário',
        'Onboarding dedicado',
      ],
      limitations: []
    }
  ];

  const testimonials = [
    { name: 'Dra. Camila Ferreira', role: 'Ortodontista — SP', text: 'Reduzi 60% do tempo que a recepção gastava respondendo WhatsApp. Agora foco no que importa: atender pacientes.', avatar: 'CF' },
    { name: 'Dr. Rafael Mendes', role: 'Dermatologista — RJ', text: 'O CEO Virtual me mostrou que eu perdia 23% dos leads por demora na resposta. Corrigi e faturei R$18k a mais no mês seguinte.', avatar: 'RM' },
    { name: 'Dra. Juliana Costa', role: 'Clínica de Estética — MG', text: 'O gerador de conteúdo sozinho já valeu a assinatura. Posto 4x por semana sem pensar. Meus seguidores triplicaram.', avatar: 'JC' },
  ];

  let faqs = [
    { q: 'Preciso de conhecimento técnico para usar?', a: 'Não. O setup leva menos de 5 minutos. Basta preencher sua especialidade, horários e a IA faz o resto.', open: false },
    { q: 'Posso cancelar a qualquer momento?', a: 'Sim. Sem multa, sem burocracia. Cancele direto no painel e sua cobrança para imediatamente.', open: false },
    { q: 'A IA responde com informações médicas?', a: 'Não. A IA é treinada para triagem, agendamento e dúvidas operacionais (horários, convênios, preparo de exames). Nunca dá diagnóstico.', open: false },
    { q: 'Funciona com qualquer especialidade?', a: 'Sim. Odontologia, dermatologia, estética, cardiologia, psicologia, fisioterapia — qualquer área da saúde.', open: false },
    { q: 'Meus dados estão seguros?', a: 'Utilizamos Supabase com criptografia em trânsito e em repouso, além de RLS (Row Level Security) que garante que cada clínica só acessa seus próprios dados.', open: false },
    { q: 'Como funciona o trial de 7 dias?', a: 'Você acessa todas as funcionalidades do plano Pro por 7 dias sem pagar nada. Sem precisar colocar cartão de crédito.', open: false },
  ];

  function toggleFaq(index) {
    faqs[index].open = !faqs[index].open;
    faqs = faqs;
  }

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) goto('/dashboard');

    // Intersection Observer for scroll animations
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

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <title>Lumia — IA que opera sua clínica</title>
  <meta name="description" content="Automatize atendimento, agendamentos e conteúdo da sua clínica com inteligência artificial. Para clínicas, estéticas e profissionais de saúde." />
</svelte:head>

<main class="page">
  <!-- ==================== NAV ==================== -->
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
        <a href="/cadastro" class="btn-nav" style="text-decoration:none">Começar grátis</a>
      </div>
    </div>
  </header>

  <!-- ==================== HERO ==================== -->
  <section class="hero">
    <div class="hero-bg">
      <div class="grid-overlay"></div>
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
    </div>

    <div class="hero-content">
      <div class="hero-pill">
        <span class="pill-dot"></span>
        Para clínicas, estéticas e profissionais de saúde
      </div>

      <h1>
        A IA que <span class="hero-accent">opera</span> sua clínica<br/>
        enquanto você cuida de pacientes.
      </h1>

      <p class="hero-sub">
        Atendimento no WhatsApp, agendamentos, conteúdo e insights financeiros — 
        tudo automatizado em um painel que parece um sistema operacional.
      </p>

      <div class="hero-cta">
        <a href="/cadastro" class="btn-primary-lg" style="text-decoration:none; display:inline-block;">
          Testar 7 dias grátis
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
          <strong>+120 clínicas</strong> já automatizaram o atendimento
        </div>
      </div>
    </div>

    <!-- Dashboard preview mockup -->
    <div class="hero-mockup">
      <div class="mockup-window">
        <div class="mockup-bar">
          <div class="bar-dots"><span></span><span></span><span></span></div>
          <span class="bar-url">app.Lumia/dashboard</span>
        </div>
        <div class="mockup-screen">
          <div class="mock-sidebar">
            <div class="ms-brand"><img src="/logo-icon.png" alt="Lumia" class="ms-logo-img" /></div>
            <div class="ms-nav">
              <div class="ms-item active"></div>
              <div class="ms-item"></div>
              <div class="ms-item"></div>
              <div class="ms-item"></div>
              <div class="ms-item"></div>
            </div>
          </div>
          <div class="mock-main">
            <div class="mock-topbar"></div>
            <div class="mock-grid">
              <div class="mock-card mc-1"><div class="mc-label"></div><div class="mc-val"></div></div>
              <div class="mock-card mc-2"><div class="mc-label"></div><div class="mc-val"></div></div>
              <div class="mock-card mc-3 mc-white"><div class="mc-label dark"></div><div class="mc-val dark"></div></div>
              <div class="mock-card mc-4"><div class="mc-label"></div><div class="mc-val"></div></div>
            </div>
            <div class="mock-chart">
              <svg viewBox="0 0 600 80">
                <path d="M0,60 Q80,40 160,55 T320,20 T480,35 T600,5" fill="none" stroke="#E5C100" stroke-width="2" opacity="0.6"/>
                <path d="M0,60 Q80,40 160,55 T320,20 T480,35 T600,5 V80 H0 Z" fill="url(#chartGrad)" opacity="0.15"/>
                <defs><linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#E5C100"/><stop offset="100%" stop-color="transparent"/></linearGradient></defs>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ==================== LOGOS / SOCIAL PROOF BAR ==================== -->
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

  <!-- ==================== FEATURES ==================== -->
  <section class="features" id="features" data-animate>
    <div class="section-header">
      <p class="section-tag">FUNCIONALIDADES</p>
      <h2>Tudo que sua clínica precisa.<br/><span class="gold">Num só lugar.</span></h2>
      <p class="section-sub">Cada módulo foi pensado para resolver um problema real de clínicas de saúde.</p>
    </div>

    <div class="features-grid" class:visible={visibleSections['features']}>
      {#each features as f, i}
        <div class="feature-card" style="animation-delay: {i * 80}ms">
          <div class="fc-top">
            <span class="fc-icon">{f.icon}</span>
            {#if f.tag !== 'Todos'}
              <span class="fc-tag">{f.tag}</span>
            {/if}
          </div>
          <h3>{f.title}</h3>
          <p>{f.desc}</p>
        </div>
      {/each}
    </div>
  </section>

  <!-- ==================== HOW IT WORKS ==================== -->
  <section class="how" id="how" data-animate>
    <div class="section-header">
      <p class="section-tag">COMO FUNCIONA</p>
      <h2>Do cadastro ao primeiro atendimento<br/><span class="gold">em menos de 5 minutos.</span></h2>
    </div>

    <div class="steps" class:visible={visibleSections['how']}>
      <div class="step">
        <div class="step-num">01</div>
        <div class="step-content">
          <h3>Crie sua conta</h3>
          <p>Nome, email e senha. Sem burocracias, sem cartão de crédito.</p>
        </div>
      </div>
      <div class="step-line"></div>
      <div class="step">
        <div class="step-num">02</div>
        <div class="step-content">
          <h3>Configure a clínica</h3>
          <p>Especialidade, horários e serviços. A IA aprende sobre o seu negócio.</p>
        </div>
      </div>
      <div class="step-line"></div>
      <div class="step">
        <div class="step-num">03</div>
        <div class="step-content">
          <h3>Ative o sistema</h3>
          <p>Dashboard, agenda, pipeline e conteúdo. Tudo pronto para operar.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- ==================== TESTIMONIALS ==================== -->
  <section class="testimonials" id="testimonials" data-animate>
    <div class="section-header">
      <p class="section-tag">DEPOIMENTOS</p>
      <h2>Quem usa, <span class="gold">recomenda.</span></h2>
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

  <!-- ==================== PRICING ==================== -->
  <section class="pricing" id="pricing" data-animate>
    <div class="section-header">
      <p class="section-tag">PLANOS E PREÇOS</p>
      <h2>Escolha o plano ideal<br/><span class="gold">para sua clínica.</span></h2>
      <p class="section-sub">Todos os planos incluem 7 dias de teste grátis. Cancele quando quiser.</p>

      <div class="billing-toggle">
        <button class:active={!annual} on:click={() => annual = false}>Mensal</button>
        <button class:active={annual} on:click={() => annual = true}>
          Anual
          <span class="save-badge">-17%</span>
        </button>
      </div>
    </div>

    <div class="plans-grid" class:visible={visibleSections['pricing']}>
      {#each plans as plan, i}
        <div class="plan-card" class:featured={plan.highlight} style="animation-delay: {i * 100}ms">
          {#if plan.badge}
            <div class="plan-badge">{plan.badge}</div>
          {/if}

          <div class="plan-header">
            <h3>{plan.name}</h3>
            <p class="plan-desc">{plan.desc}</p>
          </div>

          <div class="plan-price">
            {#if plan.price === 0}
              <span class="price-big">R$ 0</span>
              <span class="price-period">para sempre</span>
            {:else}
              <span class="price-big">R$ {annual ? plan.priceAnnual : plan.price}</span>
              <span class="price-period">/mês</span>
              {#if annual}
                <span class="price-original">R$ {plan.price}/mês</span>
              {/if}
            {/if}
          </div>

          <a href="/cadastro" class="plan-cta" class:plan-cta-featured={plan.highlight} style="text-decoration:none; display:block; text-align:center;">
            {plan.cta}
          </a>

          <div class="plan-features">
            {#each plan.features as f}
              <div class="pf-item"><span class="pf-check">✓</span> {f}</div>
            {/each}
            {#each plan.limitations as l}
              <div class="pf-item disabled"><span class="pf-x">✕</span> {l}</div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </section>

  <!-- ==================== FAQ ==================== -->
  <section class="faq-section" id="faq" data-animate>
    <div class="section-header">
      <p class="section-tag">DÚVIDAS FREQUENTES</p>
      <h2>Perguntas <span class="gold">comuns.</span></h2>
    </div>

    <div class="faq-list" class:visible={visibleSections['faq']}>
      {#each faqs as faq, i}
        <button class="faq-item" class:open={faq.open} on:click={() => toggleFaq(i)} style="animation-delay: {i * 60}ms">
          <div class="faq-q">
            <span>{faq.q}</span>
            <span class="faq-arrow">{faq.open ? '−' : '+'}</span>
          </div>
          {#if faq.open}
            <p class="faq-a">{faq.a}</p>
          {/if}
        </button>
      {/each}
    </div>
  </section>

  <!-- ==================== FINAL CTA ==================== -->
  <section class="final-cta">
    <div class="cta-glow"></div>
    <div class="cta-content">
      <h2>Sua clínica merece operar<br/>no <span class="gold">piloto automático.</span></h2>
      <p>Comece grátis. Sem cartão. Sem compromisso.</p>
      <a href="/cadastro" class="btn-primary-lg" style="text-decoration:none; display:inline-block;">
        Criar conta agora
        <span class="btn-arrow">→</span>
      </a>
    </div>
  </section>

  <!-- ==================== FOOTER ==================== -->
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <div class="brand">
          <img src="/logo.png" alt="Lumia" class="nav-logo" />
        </div>
        <p>IA que opera sua clínica.</p>
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
  /* ===== RESET & BASE ===== */
  :global(body) { margin: 0; background: #0A0A0C; color: #fff; }
  .page { font-family: 'Inter', -apple-system, sans-serif; overflow-x: hidden; -webkit-font-smoothing: antialiased; }
  h1, h2, h3 { font-family: 'Inter', sans-serif; }
  .gold { color: #E5C100; }

  /* ===== NAV ===== */
  .nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; backdrop-filter: blur(20px); background: rgba(5,5,7,0.8); border-bottom: 1px solid rgba(255,255,255,0.04); }
  .nav-inner { max-width: 1200px; margin: 0 auto; padding: 0.9rem 2rem; display: flex; align-items: center; justify-content: space-between; }
  .brand { display: flex; align-items: center; text-decoration: none; } .nav-logo { height: auto; width: 140px; object-fit: contain; }
  
  
  .nav-links { display: flex; gap: 2rem; }
  .nav-links a { color: #777; text-decoration: none; font-size: 0.9rem; font-weight: 500; transition: color 0.2s; }
  .nav-links a:hover { color: #fff; }
  .nav-actions { display: flex; align-items: center; gap: 1rem; }
  .link-login { color: #999; text-decoration: none; font-size: 0.9rem; font-weight: 500; }
  .link-login:hover { color: #fff; }
  .btn-nav { background: #E5C100; color: #000; border: none; padding: 0.6rem 1.2rem; border-radius: 10px; font-weight: 700; font-size: 0.85rem; cursor: pointer; font-family: inherit; transition: all 0.2s; }
  .btn-nav:hover { background: #fce141; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(229,193,0,0.15); }

  /* ===== HERO ===== */
  .hero { position: relative; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8rem 2rem 4rem; text-align: center; overflow: hidden; }
  .hero-bg { position: absolute; inset: 0; pointer-events: none; }
  .grid-overlay { position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 60px 60px; mask-image: radial-gradient(ellipse 70% 50% at 50% 40%, black 30%, transparent 80%); }
  .glow-orb { position: absolute; border-radius: 50%; filter: blur(100px); }
  .orb-1 { width: 500px; height: 500px; top: -10%; left: 50%; transform: translateX(-50%); background: rgba(229,193,0,0.06); }
  .orb-2 { width: 300px; height: 300px; bottom: 10%; right: -5%; background: rgba(229,193,0,0.03); }

  .hero-content { position: relative; z-index: 2; max-width: 800px; }
  .hero-pill { display: inline-flex; align-items: center; gap: 8px; padding: 0.4rem 1rem; border: 1px solid rgba(229,193,0,0.2); color: #E5C100; border-radius: 999px; font-size: 0.8rem; font-weight: 500; margin-bottom: 1.5rem; background: rgba(229,193,0,0.04); letter-spacing: 0.3px; }
  .pill-dot { width: 6px; height: 6px; background: #E5C100; border-radius: 50%; animation: pulse-dot 2s infinite; }
  @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

  h1 { font-size: 3.8rem; font-weight: 900; line-height: 1.05; letter-spacing: -2px; margin: 0 0 1.25rem; }
  .hero-accent { background: linear-gradient(135deg, #E5C100, #FFE066); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .hero-sub { color: #888; font-size: 1.15rem; line-height: 1.7; max-width: 600px; margin: 0 auto 2rem; }

  .hero-cta { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; margin-bottom: 2.5rem; }
  .btn-primary-lg { display: inline-flex; align-items: center; gap: 10px; background: #E5C100; color: #000; border: none; padding: 1rem 2rem; border-radius: 12px; font-size: 1.05rem; font-weight: 800; cursor: pointer; font-family: 'Inter', sans-serif; transition: all 0.25s; letter-spacing: -0.3px; }
  .btn-primary-lg:hover { background: #fce141; transform: translateY(-2px); box-shadow: 0 12px 30px rgba(229,193,0,0.2); }
  .btn-arrow { font-size: 1.2rem; transition: transform 0.2s; }
  .btn-primary-lg:hover .btn-arrow { transform: translateX(4px); }
  .hero-note { color: #555; font-size: 0.8rem; font-weight: 500; }

  .hero-proof { display: flex; align-items: center; gap: 12px; justify-content: center; }
  .proof-avatars { display: flex; }
  .proof-av { width: 32px; height: 32px; border-radius: 50%; background: #1A1A1E; border: 2px solid #050507; color: #E5C100; font-size: 0.6rem; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-left: -8px; }
  .proof-av:first-child { margin-left: 0; }
  .proof-text { color: #666; font-size: 0.85rem; }
  .proof-text strong { color: #ccc; }

  /* Hero Mockup */
  .hero-mockup { position: relative; z-index: 2; max-width: 900px; width: 100%; margin: 3rem auto 0; perspective: 1200px; }
  .mockup-window { background: #0F0F11; border: 1px solid #1A1A1E; border-radius: 16px; overflow: hidden; transform: rotateX(4deg); box-shadow: 0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03); }
  .mockup-bar { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #0A0A0C; border-bottom: 1px solid #1A1A1E; }
  .bar-dots { display: flex; gap: 6px; }
  .bar-dots span { width: 10px; height: 10px; border-radius: 50%; background: #1A1A1E; }
  .bar-url { color: #444; font-size: 0.7rem; font-weight: 600; margin-left: auto; }
  .mockup-screen { display: flex; height: 300px; }
  .mock-sidebar { width: 50px; background: #0A0A0C; border-right: 1px solid #1A1A1E; padding: 12px 0; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .ms-brand { margin-bottom: 12px; }
  .ms-logo-img { width: 24px; height: 24px; object-fit: contain; border-radius: 4px; }
  .ms-item { width: 28px; height: 28px; border-radius: 6px; background: #16161A; }
  .ms-item.active { background: #1A1A1E; border: 1px solid #222; }
  .mock-main { flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 12px; }
  .mock-topbar { height: 8px; width: 100%; background: rgba(34,197,94,0.08); border-radius: 4px; border: 1px solid rgba(34,197,94,0.1); }
  .mock-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .mock-card { background: #16161A; border: 1px solid #1A1A1E; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 8px; }
  .mc-label { height: 6px; width: 50%; background: #222; border-radius: 3px; }
  .mc-val { height: 16px; width: 70%; background: #2A2A2E; border-radius: 4px; }
  .mc-white { background: #fff; border: none; }
  .mc-label.dark { background: #ddd; } .mc-val.dark { background: #bbb; }
  .mock-chart { flex: 1; padding: 10px; }
  .mock-chart svg { width: 100%; height: 100%; }

  /* ===== LOGOS BAR ===== */
  .logos-bar { padding: 2.5rem 2rem; border-top: 1px solid rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.04); text-align: center; }
  .logos-bar p { color: #444; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 1rem; }
  .logos-scroll { display: flex; justify-content: center; gap: 2rem; flex-wrap: wrap; }
  .logos-scroll span { color: #555; font-size: 0.9rem; font-weight: 500; white-space: nowrap; }

  /* ===== SECTIONS SHARED ===== */
  .section-header { text-align: center; margin-bottom: 3rem; }
  .section-tag { color: #E5C100; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 0.75rem; }
  .section-header h2 { font-size: 2.6rem; font-weight: 900; line-height: 1.1; letter-spacing: -1.5px; margin: 0 0 1rem; }
  .section-sub { color: #777; font-size: 1.05rem; margin: 0; max-width: 550px; margin: 0 auto; line-height: 1.6; }

  /* Scroll animation base */
  .features-grid, .steps, .test-grid, .plans-grid, .faq-list { opacity: 0; transform: translateY(30px); transition: opacity 0.6s ease, transform 0.6s ease; }
  .visible { opacity: 1; transform: translateY(0); }

  /* ===== FEATURES ===== */
  .features { padding: 6rem 2rem; max-width: 1200px; margin: 0 auto; }
  .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }
  .feature-card { background: #0C0C0E; border: 1px solid #16161A; border-radius: 16px; padding: 2rem; transition: all 0.3s ease; position: relative; overflow: hidden; }
  .feature-card:hover { border-color: #222; transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
  .feature-card::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(229,193,0,0.15), transparent); opacity: 0; transition: opacity 0.3s; }
  .feature-card:hover::after { opacity: 1; }
  .fc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
  .fc-icon { font-size: 1.6rem; }
  .fc-tag { font-size: 0.6rem; font-weight: 800; color: #E5C100; background: rgba(229,193,0,0.08); border: 1px solid rgba(229,193,0,0.15); padding: 3px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .feature-card h3 { font-size: 1.15rem; font-weight: 800; margin: 0 0 0.5rem; letter-spacing: -0.3px; }
  .feature-card p { color: #666; font-size: 0.9rem; line-height: 1.6; margin: 0; }

  /* ===== HOW IT WORKS ===== */
  .how { padding: 6rem 2rem; max-width: 900px; margin: 0 auto; }
  .steps { display: flex; align-items: flex-start; gap: 0; justify-content: center; }
  .step { display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1; padding: 0 1.5rem; }
  .step-num { font-family: 'Inter', sans-serif; font-size: 2.5rem; font-weight: 900; color: #E5C100; opacity: 0.3; margin-bottom: 1rem; }
  .step-content h3 { font-size: 1.1rem; font-weight: 800; margin: 0 0 0.5rem; }
  .step-content p { color: #666; font-size: 0.9rem; line-height: 1.5; margin: 0; }
  .step-line { width: 60px; height: 1px; background: #222; margin-top: 2.5rem; flex-shrink: 0; }

  /* ===== TESTIMONIALS ===== */
  .testimonials { padding: 6rem 2rem; max-width: 1200px; margin: 0 auto; }
  .test-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }
  .test-card { background: #0C0C0E; border: 1px solid #16161A; border-radius: 16px; padding: 2rem; transition: all 0.3s; }
  .test-card:hover { border-color: #222; }
  .test-stars { color: #E5C100; font-size: 0.85rem; margin-bottom: 1rem; letter-spacing: 2px; }
  .test-text { color: #aaa; font-size: 0.95rem; line-height: 1.6; margin: 0 0 1.5rem; font-style: italic; }
  .test-author { display: flex; align-items: center; gap: 10px; }
  .test-av { width: 36px; height: 36px; background: #16161A; border: 1px solid #222; color: #E5C100; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; flex-shrink: 0; }
  .test-author strong { display: block; color: #fff; font-size: 0.85rem; }
  .test-author span { color: #555; font-size: 0.75rem; }

  /* ===== PRICING ===== */
  .pricing { padding: 6rem 2rem; max-width: 1200px; margin: 0 auto; }
  .billing-toggle { display: inline-flex; background: #0C0C0E; border: 1px solid #1A1A1E; border-radius: 10px; padding: 4px; margin-top: 1.5rem; }
  .billing-toggle button { background: transparent; border: none; color: #666; padding: 0.6rem 1.5rem; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; }
  .billing-toggle button.active { background: #16161A; color: #fff; }
  .save-badge { background: #E5C100; color: #000; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; }

  .plans-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; align-items: start; }
  .plan-card { background: #0C0C0E; border: 1px solid #16161A; border-radius: 20px; padding: 2rem; position: relative; transition: all 0.3s; }
  .plan-card:hover { border-color: #222; }
  .plan-card.featured { background: #0F0F12; border-color: #E5C100; box-shadow: 0 0 60px rgba(229,193,0,0.06); }
  .plan-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #E5C100; color: #000; font-size: 0.7rem; font-weight: 800; padding: 4px 14px; border-radius: 20px; white-space: nowrap; }

  .plan-header { margin-bottom: 1.5rem; }
  .plan-header h3 { font-size: 1.4rem; font-weight: 800; margin: 0 0 0.3rem; }
  .plan-desc { color: #666; font-size: 0.85rem; margin: 0; }

  .plan-price { margin-bottom: 1.5rem; display: flex; align-items: baseline; gap: 4px; flex-wrap: wrap; }
  .price-big { font-family: 'Inter', sans-serif; font-size: 2.8rem; font-weight: 900; letter-spacing: -2px; }
  .price-period { color: #555; font-size: 0.9rem; font-weight: 500; }
  .price-original { color: #444; font-size: 0.8rem; text-decoration: line-through; margin-left: 8px; }

  .plan-cta { width: 100%; padding: 0.85rem; background: #16161A; border: 1px solid #222; color: #fff; border-radius: 10px; font-size: 0.95rem; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; margin-bottom: 1.5rem; }
  .plan-cta:hover { border-color: #444; background: #1A1A1E; }
  .plan-cta-featured { background: #E5C100; color: #000; border-color: #E5C100; }
  .plan-cta-featured:hover { background: #fce141; border-color: #fce141; }

  .plan-features { display: flex; flex-direction: column; gap: 0.6rem; }
  .pf-item { font-size: 0.85rem; color: #aaa; display: flex; align-items: center; gap: 8px; }
  .pf-item.disabled { color: #444; }
  .pf-check { color: #E5C100; font-weight: 800; font-size: 0.8rem; }
  .pf-x { color: #333; font-weight: 800; font-size: 0.8rem; }

  /* ===== FAQ ===== */
  .faq-section { padding: 6rem 2rem; max-width: 750px; margin: 0 auto; }
  .faq-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .faq-item { background: #0C0C0E; border: 1px solid #16161A; border-radius: 12px; padding: 1.25rem 1.5rem; width: 100%; text-align: left; cursor: pointer; font-family: inherit; color: inherit; transition: all 0.2s; }
  .faq-item:hover { border-color: #222; }
  .faq-item.open { border-color: rgba(229,193,0,0.2); }
  .faq-q { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
  .faq-q span:first-child { font-size: 0.95rem; font-weight: 600; color: #ddd; }
  .faq-arrow { font-size: 1.2rem; color: #E5C100; font-weight: 300; flex-shrink: 0; }
  .faq-a { color: #777; font-size: 0.9rem; line-height: 1.6; margin: 1rem 0 0; padding-top: 1rem; border-top: 1px solid #16161A; }

  /* ===== FINAL CTA ===== */
  .final-cta { padding: 8rem 2rem; text-align: center; position: relative; overflow: hidden; }
  .cta-glow { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 600px; height: 600px; background: radial-gradient(circle, rgba(229,193,0,0.06) 0%, transparent 70%); pointer-events: none; }
  .cta-content { position: relative; z-index: 2; }
  .cta-content h2 { font-size: 2.8rem; font-weight: 900; letter-spacing: -1.5px; margin: 0 0 1rem; line-height: 1.1; }
  .cta-content p { color: #777; font-size: 1.1rem; margin: 0 0 2rem; }

  /* ===== FOOTER ===== */
  .footer { border-top: 1px solid rgba(255,255,255,0.04); padding: 4rem 2rem 2rem; }
  .footer-inner { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; gap: 3rem; margin-bottom: 3rem; }
  .footer-brand p { color: #444; font-size: 0.85rem; margin: 0.75rem 0 0; }
  .footer-links { display: flex; gap: 4rem; }
  .footer-col { display: flex; flex-direction: column; gap: 0.6rem; }
  .footer-col h4 { color: #555; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin: 0 0 0.5rem; }
  .footer-col a { color: #666; text-decoration: none; font-size: 0.85rem; transition: color 0.2s; }
  .footer-col a:hover { color: #fff; }
  .footer-bottom { max-width: 1200px; margin: 0 auto; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.04); }
  .footer-bottom span { color: #333; font-size: 0.8rem; }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 900px) {
    h1 { font-size: 2.5rem; letter-spacing: -1px; }
    .section-header h2 { font-size: 2rem; }
    .features-grid, .test-grid, .plans-grid { grid-template-columns: 1fr; max-width: 500px; margin: 0 auto; }
    .steps { flex-direction: column; align-items: center; }
    .step-line { width: 1px; height: 30px; }
    .nav-links { display: none; }
    .hero-mockup { display: none; }
    .footer-inner { flex-direction: column; gap: 2rem; }
    .footer-links { gap: 2rem; }
    .cta-content h2 { font-size: 2rem; }
    .logos-scroll { gap: 1rem; }
  }
</style>
