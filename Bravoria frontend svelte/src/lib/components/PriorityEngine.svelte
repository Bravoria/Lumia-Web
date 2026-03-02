<script>
  import { fly } from 'svelte/transition';

  // Props: dados reais vindos do dashboard pai
  export let patients = [];
  export let appointments = [];

  // Gerar prioridades dinâmicas baseadas nos dados reais
  $: priorities = generatePriorities(patients, appointments);

  function generatePriorities(pts, appts) {
    const items = [];
    const now = new Date();

    // 1. Leads antigos sem resposta (criados há mais de 2 dias)
    const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    const staleLeads = pts.filter(p => p.status === 'lead' && p.created_at < twoDaysAgo);
    if (staleLeads.length > 0) {
      items.push({
        id: 1,
        type: 'URGENTE',
        category: 'Atendimento',
        title: `${staleLeads.length} lead${staleLeads.length > 1 ? 's' : ''} aguardando resposta há +2 dias`,
        impact: `Risco de perder ${staleLeads.length} potenciais pacientes`,
        severity: 'high',
        action: 'Ver leads',
        href: '/dashboard/pipeline'
      });
    }

    // 2. Pacientes inativos que podem ser recuperados
    const inactive = pts.filter(p => p.status === 'inativo');
    if (inactive.length > 0) {
      items.push({
        id: 2,
        type: 'CRESCIMENTO',
        category: 'Retenção',
        title: `${inactive.length} paciente${inactive.length > 1 ? 's' : ''} inativo${inactive.length > 1 ? 's' : ''} detectado${inactive.length > 1 ? 's' : ''}`,
        impact: `Potencial de recuperação de ${inactive.length} paciente${inactive.length > 1 ? 's' : ''}`,
        severity: 'medium',
        action: 'Reativar',
        href: '/dashboard/pipeline'
      });
    }

    // 3. Taxa de no-show alta
    const noShows = appts.filter(a => a.status === 'no-show').length;
    const noShowPct = appts.length > 0 ? Math.round((noShows / appts.length) * 100) : 0;
    if (noShowPct > 15 && appts.length >= 3) {
      items.push({
        id: 3,
        type: 'ESTRATÉGICO',
        category: 'Agenda',
        title: `Taxa de no-show está em ${noShowPct}% — acima do ideal`,
        impact: `${noShows} agendamento${noShows > 1 ? 's' : ''} perdido${noShows > 1 ? 's' : ''}`,
        severity: noShowPct > 30 ? 'high' : 'medium',
        action: 'Ver agenda',
        href: '/dashboard/agenda'
      });
    }

    // 4. Leads recentes sem agendamento
    const newLeads = pts.filter(p => p.status === 'lead').length;
    const inContact = pts.filter(p => p.status === 'contato').length;
    if (newLeads > 5 && inContact === 0) {
      items.push({
        id: 4,
        type: 'CRESCIMENTO',
        category: 'Conversão',
        title: `${newLeads} leads sem nenhum em contato ativo`,
        impact: 'Funil de conversão parado — iniciar contato',
        severity: 'medium',
        action: 'Converter',
        href: '/dashboard/pipeline'
      });
    }

    // 5. Agendamentos de hoje não confirmados
    const today = now.toISOString().slice(0, 10);
    const todayPending = appts.filter(a => a.date === today && a.status === 'agendado');
    if (todayPending.length > 0) {
      items.push({
        id: 5,
        type: 'URGENTE',
        category: 'Agenda',
        title: `${todayPending.length} agendamento${todayPending.length > 1 ? 's' : ''} de hoje não confirmado${todayPending.length > 1 ? 's' : ''}`,
        impact: 'Confirmar para reduzir no-shows',
        severity: 'high',
        action: 'Confirmar',
        href: '/dashboard/agenda'
      });
    }

    // Se não há problemas, mostrar status positivo
    if (items.length === 0) {
      items.push({
        id: 0,
        type: 'SISTEMA',
        category: 'Status',
        title: 'Tudo certo! Nenhuma ação urgente detectada.',
        impact: 'Operação funcionando normalmente',
        severity: 'low',
        action: '',
        href: ''
      });
    }

    return items.slice(0, 4); // máx 4 prioridades
  }
</script>

<div class="priority-engine-card">
  <div class="engine-header">
    <div class="title-group">
      <span class="ai-badge">Lumia AI</span>
      <h3>Prioridades Estratégicas</h3>
    </div>
    <div class="engine-meta">
      {priorities.length} {priorities[0]?.id === 0 ? 'status' : 'ações recomendadas'}
    </div>
  </div>

  <div class="priority-stack">
    {#each priorities as item, i}
      <div class="priority-item" in:fly={{ y: 20, duration: 300, delay: i * 100 }}>
        <div class="indicator {item.severity}"></div>

        <div class="item-content">
          <div class="item-top">
            <span class="item-label">{item.category} • {item.type}</span>
            <span class="impact-tag">{item.impact}</span>
          </div>
          <h4>{item.title}</h4>
        </div>

        <div class="item-actions">
          {#if item.action && item.href}
            <a href={item.href} class="btn-primary">{item.action}</a>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .priority-engine-card {
    background: #16161A;
    border: 1px solid #1A1A1E;
    border-radius: 16px;
    padding: 2rem;
    width: 100%;
  }

  .engine-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .ai-badge {
    font-size: 0.6rem;
    font-weight: 900;
    background: #fff;
    color: #000;
    padding: 2px 6px;
    border-radius: 4px;
    letter-spacing: 0.05em;
  }

  h3 {
    font-size: 1.1rem;
    font-weight: 800;
    margin: 8px 0 0 0;
    letter-spacing: -0.02em;
  }

  .engine-meta {
    font-size: 0.75rem;
    color: #444;
    font-weight: 600;
  }

  .priority-stack {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .priority-item {
    display: grid;
    grid-template-columns: 4px 1fr auto;
    gap: 20px;
    align-items: center;
    background: #0F0F11;
    border: 1px solid #1A1A1E;
    padding: 1.25rem;
    border-radius: 12px;
    transition: 0.2s;
  }

  .priority-item:hover {
    border-color: #2A2A2E;
    background: #121214;
  }

  .indicator { width: 4px; height: 40px; border-radius: 2px; }
  .indicator.high { background: #EF4444; box-shadow: 0 0 10px rgba(239, 68, 68, 0.3); }
  .indicator.medium { background: #F59E0B; }
  .indicator.low { background: #22C55E; }

  .item-top { display: flex; gap: 12px; align-items: center; margin-bottom: 4px; flex-wrap: wrap; }
  .item-label { font-size: 0.65rem; font-weight: 800; color: #444; text-transform: uppercase; }
  .impact-tag { font-size: 0.7rem; font-weight: 700; color: #22C55E; background: rgba(34, 197, 94, 0.05); padding: 2px 8px; border-radius: 4px; }

  h4 { font-size: 0.95rem; font-weight: 700; margin: 0; color: #fff; }

  .item-actions { display: flex; gap: 8px; }

  .btn-primary {
    background: #fff;
    color: #000;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 800;
    cursor: pointer;
    text-decoration: none;
    transition: 0.2s;
  }
  .btn-primary:hover { background: #E5C100; }
</style>