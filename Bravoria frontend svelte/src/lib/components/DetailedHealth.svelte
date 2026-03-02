<script>
  import { fade } from 'svelte/transition';

  // Props: dados reais vindos do dashboard pai
  export let totalPatients = 0;
  export let activePatients = 0;
  export let totalAppointments = 0;
  export let noShowRate = 0;
  export let totalFaq = 0;
  export let totalPosts = 0;
  export let hasSettings = false;
  export let healthScore = 0;

  // Métricas derivadas para as barras
  $: configScore = hasSettings ? 100 : 0;
  $: faqScore = Math.min(100, totalFaq * 10);
  $: crmScore = totalPatients > 0
    ? Math.min(100, Math.round((activePatients / totalPatients) * 100 * 1.2))
    : 0;
  $: agendaScore = totalAppointments > 0
    ? Math.max(0, 100 - noShowRate * 3)
    : 0;

  // Cor baseada no score real
  $: statusColor = healthScore >= 75 ? '#22C55E' : healthScore >= 50 ? '#F59E0B' : '#EF4444';

  // Identificar o ponto mais fraco para a análise da IA
  $: weakestArea = (() => {
    const areas = [
      { name: 'configuração da clínica', score: configScore },
      { name: 'base de conhecimento (FAQ)', score: faqScore },
      { name: 'CRM de pacientes', score: crmScore },
      { name: 'saúde da agenda', score: agendaScore }
    ];
    return areas.sort((a, b) => a.score - b.score)[0];
  })();
</script>

<div class="health-matrix-card" in:fade>
  <div class="matrix-header">
    <div class="score-display">
      <label>Health Score do Sistema</label>
      <div class="score-value" style="color: {statusColor}">
        {healthScore}<small>/100</small>
      </div>
    </div>
    <div class="status-tag" style="border-color: {statusColor}44; color: {statusColor}">
      {healthScore >= 75 ? 'SAUDÁVEL' : healthScore >= 50 ? 'ATENÇÃO' : 'CRÍTICO'}
    </div>
  </div>

  <div class="metrics-grid">
    <div class="m-row">
      <div class="m-info">
        <span>Configuração</span>
        <strong>{configScore}%</strong>
      </div>
      <div class="m-track">
        <div class="m-bar" style="width: {configScore}%; background: {configScore >= 80 ? '#fff' : '#F59E0B'};"></div>
      </div>
    </div>

    <div class="m-row">
      <div class="m-info">
        <span>Base de Conhecimento</span>
        <strong>{faqScore}%</strong>
      </div>
      <div class="m-track">
        <div class="m-bar" style="width: {faqScore}%; background: #fff; opacity: 0.6;"></div>
      </div>
    </div>

    <div class="m-row">
      <div class="m-info">
        <span>CRM de Pacientes</span>
        <strong>{crmScore}%</strong>
      </div>
      <div class="m-track">
        <div class="m-bar" style="width: {crmScore}%; background: #fff; opacity: 0.4;"></div>
      </div>
    </div>

    <div class="m-row">
      <div class="m-info">
        <span>Saúde da Agenda</span>
        <strong>{totalAppointments > 0 ? (100 - noShowRate) : 0}%</strong>
      </div>
      <div class="m-track">
        <div class="m-bar" style="width: {agendaScore}%; background: {noShowRate > 15 ? '#F59E0B' : '#fff'}; opacity: 0.3;"></div>
      </div>
    </div>
  </div>

  <div class="ai-footer">
    <div class="ai-icon">🧠</div>
    <p>
      <strong>Análise da IA:</strong>
      {#if healthScore >= 75}
        A saúde do sistema está excelente. {totalPatients > 0 ? `${activePatients} pacientes ativos e` : ''} {totalAppointments > 0 ? `${noShowRate}% de no-show` : 'sem agendamentos ainda'}. Continue assim!
      {:else if healthScore >= 50}
        Sistema em alerta. Foco recomendado: {weakestArea.name} ({weakestArea.score}%). Uma melhoria nessa área pode aumentar seu score em até 20 pontos.
      {:else}
        Sistema em estado crítico. Priorize {weakestArea.name} para melhorar rapidamente. {!hasSettings ? 'Configure sua clínica primeiro.' : `Foque em melhorar ${weakestArea.name}.`}
      {/if}
    </p>
  </div>
</div>

<style>
  .health-matrix-card {
    background: #16161A;
    border: 1px solid #1A1A1E;
    border-radius: 16px;
    padding: 2rem;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .matrix-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2.5rem;
  }

  label {
    font-size: 0.6rem;
    font-weight: 800;
    color: #444;
    text-transform: uppercase;
    letter-spacing: 0.15em;
  }

  .score-value {
    font-size: 3.5rem;
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1;
    margin-top: 8px;
  }

  .score-value small {
    font-size: 1.2rem;
    opacity: 0.2;
    margin-left: 4px;
  }

  .status-tag {
    font-size: 0.6rem;
    font-weight: 900;
    padding: 4px 10px;
    border: 1px solid;
    border-radius: 6px;
    letter-spacing: 0.05em;
  }

  .metrics-grid {
    display: flex;
    flex-direction: column;
    gap: 24px;
    flex: 1;
  }

  .m-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
    margin-bottom: 8px;
    font-weight: 700;
    color: #555;
  }

  .m-info strong {
    color: #fff;
    font-size: 0.85rem;
  }

  .m-track {
    height: 3px;
    background: #0F0F11;
    width: 100%;
    border-radius: 2px;
    overflow: hidden;
  }

  .m-bar {
    height: 100%;
    transition: width 1.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .ai-footer {
    margin-top: 2rem;
    padding: 1.25rem;
    background: #0F0F11;
    border: 1px solid #1A1A1E;
    border-radius: 12px;
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .ai-icon {
    font-size: 1rem;
    filter: grayscale(1);
  }

  .ai-footer p {
    margin: 0;
    font-size: 0.75rem;
    line-height: 1.6;
    color: #666;
  }

  .ai-footer strong {
    color: #eee;
    display: block;
    margin-bottom: 2px;
  }
</style>