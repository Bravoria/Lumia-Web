<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import { fade, fly } from 'svelte/transition';
  import { getClinicPlan, checkLimit } from '$lib/planGuard.js';
  import UpgradeModal from '$lib/components/UpgradeModal.svelte';

  let loading = true;
  let clinicId = null;
  let appointments = [];
  let patients = [];

  // Filtros
  let filterStatus = 'todos';
  let filterDate = new Date().toISOString().slice(0, 10);

  // Modal de novo agendamento
  let showModal = false;
  let saving = false;
  let newAppt = { patient_name: '', date: '', time: '', type: 'Consulta', notes: '' };
  let saveMsg = '';
  let saveErr = '';

  // Plan limits
  let planInfo = null;
  let showUpgrade = false;

  const statusLabels = {
    agendado: { label: 'Agendado', color: '#3b82f6' },
    confirmado: { label: 'Confirmado', color: '#22C55E' },
    concluido: { label: 'Concluído', color: '#22C55E' },
    cancelado: { label: 'Cancelado', color: '#666' },
    'no-show': { label: 'No-Show', color: '#EF4444' }
  };

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

      await loadAppointments();
      planInfo = await getClinicPlan(clinicId);
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  });

  async function loadAppointments() {
    if (!clinicId) return;
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    appointments = data ?? [];
  }

  $: filteredAppointments = appointments.filter(a => {
    if (filterStatus !== 'todos' && a.status !== filterStatus) return false;
    if (filterDate && a.date !== filterDate) return false;
    return true;
  });

  $: todayCount = appointments.filter(a => a.date === new Date().toISOString().slice(0, 10)).length;
  $: pendingCount = appointments.filter(a => a.status === 'agendado').length;
  $: noShowCount = appointments.filter(a => a.status === 'no-show').length;

  // Appointments this month for limit check
  $: currentMonth = new Date().toISOString().slice(0, 7);
  $: monthlyCount = appointments.filter(a => a.date && a.date.startsWith(currentMonth)).length;
  $: apptLimit = planInfo ? checkLimit(planInfo.limits, 'max_appointments_month', monthlyCount) : { allowed: true, max: -1 };

  function openNewAppt() {
    if (apptLimit.max !== -1 && !apptLimit.allowed) {
      showUpgrade = true;
      return;
    }
    showModal = true; saveErr = ''; saveMsg = '';
  }

  function changeDate(offset) {
    const d = new Date(filterDate);
    d.setDate(d.getDate() + offset);
    filterDate = d.toISOString().slice(0, 10);
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  async function updateStatus(id, newStatus) {
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id);
    if (!error) await loadAppointments();
  }

  async function saveAppointment() {
    saveMsg = ''; saveErr = '';
    if (!newAppt.patient_name || !newAppt.date || !newAppt.time) {
      saveErr = 'Preencha nome, data e horário.';
      return;
    }
    saving = true;
    // Double-check limit
    if (apptLimit.max !== -1 && !apptLimit.allowed) {
      saveErr = `Limite de ${apptLimit.max} agendamentos/mês atingido. Faça upgrade.`;
      saving = false;
      return;
    }
    const { error } = await supabase.from('appointments').insert({
      clinic_id: clinicId,
      patient_name: newAppt.patient_name,
      date: newAppt.date,
      time: newAppt.time,
      type: newAppt.type,
      notes: newAppt.notes || null,
      status: 'agendado'
    });
    if (error) {
      saveErr = 'Erro: ' + error.message;
    } else {
      saveMsg = 'Agendamento criado!';
      newAppt = { patient_name: '', date: '', time: '', type: 'Consulta', notes: '' };
      await loadAppointments();
      setTimeout(() => { showModal = false; saveMsg = ''; }, 1000);
    }
    saving = false;
  }
</script>

<svelte:head><title>Agenda • LumiaOS</title></svelte:head>

<div class="wrap">
  <div class="header">
    <div>
      <p class="label">AGENDA</p>
      <h1>Gestão de Agendamentos</h1>
      <p class="sub">Controle consultas, confirmações e no-shows em um só lugar.</p>
    </div>
    <button class="btn-new" on:click={openNewAppt}>+ Novo Agendamento{apptLimit.max !== -1 ? ` (${apptLimit.remaining} restantes)` : ''}</button>
  </div>

  {#if apptLimit.max !== -1 && !apptLimit.allowed}
    <div class="limit-banner" in:fly={{ y: -10, duration: 300 }}>
      ⚠️ Limite de {apptLimit.max} agendamentos/mês atingido no plano {planInfo?.planName}.
      <button class="banner-btn" on:click={() => showUpgrade = true}>Fazer upgrade</button>
    </div>
  {/if}

  <UpgradeModal clinicId={clinicId} bind:show={showUpgrade} feature="max_appointments_month" currentPlan={planInfo?.planName ?? 'Starter'} requiredPlan="Pro" />

  {#if loading}
    <p class="muted">Carregando agenda...</p>
  {:else if !clinicId}
    <div class="empty-card">
      <span>📅</span>
      <h3>Configure sua clínica</h3>
      <p class="muted">Finalize o setup para gerenciar agendamentos.</p>
      <a href="/setup" class="btn-link">Ir para Setup</a>
    </div>
  {:else}
    <!-- KPIs rápidos -->
    <div class="kpi-row" in:fade>
      <div class="kpi"><span class="kpi-val">{todayCount}</span><span class="kpi-label">Hoje</span></div>
      <div class="kpi"><span class="kpi-val blue">{pendingCount}</span><span class="kpi-label">Pendentes</span></div>
      <div class="kpi"><span class="kpi-val">{appointments.length}</span><span class="kpi-label">Total</span></div>
      <div class="kpi"><span class="kpi-val {noShowCount > 0 ? 'red' : ''}">{noShowCount}</span><span class="kpi-label">No-Shows</span></div>
    </div>

    <!-- Controles de data e filtro -->
    <div class="controls" in:fade>
      <div class="date-nav">
        <button class="nav-btn" on:click={() => changeDate(-1)}>←</button>
        <input type="date" bind:value={filterDate} />
        <button class="nav-btn" on:click={() => changeDate(1)}>→</button>
        <button class="nav-btn today-btn" on:click={() => filterDate = new Date().toISOString().slice(0,10)}>Hoje</button>
      </div>
      <div class="status-filter">
        {#each ['todos', 'agendado', 'confirmado', 'concluido', 'no-show', 'cancelado'] as s}
          <button class="filter-btn" class:active={filterStatus === s} on:click={() => filterStatus = s}>
            {s === 'todos' ? 'Todos' : (statusLabels[s]?.label ?? s)}
          </button>
        {/each}
      </div>
    </div>

    <!-- Lista de agendamentos -->
    <div class="appt-list">
      {#if filteredAppointments.length === 0}
        <div class="empty-slot">
          <p>Nenhum agendamento para {formatDate(filterDate)}{filterStatus !== 'todos' ? ` com status "${statusLabels[filterStatus]?.label ?? filterStatus}"` : ''}.</p>
        </div>
      {:else}
        {#each filteredAppointments as appt, i}
          <div class="appt-row" in:fly={{ y: 10, duration: 300, delay: i * 50 }}>
            <div class="appt-time">{appt.time?.slice(0,5) ?? '--:--'}</div>
            <div class="appt-dot" style="background: {statusLabels[appt.status]?.color ?? '#555'}"></div>
            <div class="appt-info">
              <strong>{appt.patient_name || 'Paciente'}</strong>
              <span class="appt-type">{appt.type || 'Consulta'}</span>
              {#if appt.notes}<p class="appt-notes">{appt.notes}</p>{/if}
            </div>
            <div class="appt-status" style="color: {statusLabels[appt.status]?.color ?? '#555'}">
              {statusLabels[appt.status]?.label ?? appt.status}
            </div>
            <div class="appt-actions">
              {#if appt.status === 'agendado'}
                <button class="act-btn green" on:click={() => updateStatus(appt.id, 'confirmado')}>Confirmar</button>
                <button class="act-btn red" on:click={() => updateStatus(appt.id, 'no-show')}>No-Show</button>
              {/if}
              {#if appt.status === 'confirmado'}
                <button class="act-btn green" on:click={() => updateStatus(appt.id, 'concluido')}>Concluir</button>
                <button class="act-btn" on:click={() => updateStatus(appt.id, 'cancelado')}>Cancelar</button>
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}

  <!-- Modal -->
  {#if showModal}
    <div class="modal-overlay" on:click|self={() => showModal = false} transition:fade={{ duration: 150 }}>
      <div class="modal" in:fly={{ y: 20, duration: 300 }}>
        <div class="modal-head">
          <h3>Novo Agendamento</h3>
          <button class="close-btn" on:click={() => showModal = false}>✕</button>
        </div>
        <div class="modal-body">
          <div class="field"><label>Nome do paciente *</label><input bind:value={newAppt.patient_name} placeholder="Nome completo" /></div>
          <div class="row2">
            <div class="field"><label>Data *</label><input type="date" bind:value={newAppt.date} /></div>
            <div class="field"><label>Horário *</label><input type="time" bind:value={newAppt.time} /></div>
          </div>
          <div class="field"><label>Tipo</label>
            <select bind:value={newAppt.type}>
              <option>Consulta</option><option>Retorno</option><option>Avaliação</option><option>Procedimento</option><option>Emergência</option>
            </select>
          </div>
          <div class="field"><label>Observações</label><textarea bind:value={newAppt.notes} placeholder="Notas opcionais..." rows="2"></textarea></div>
          {#if saveErr}<p class="msg err">{saveErr}</p>{/if}
          {#if saveMsg}<p class="msg ok">{saveMsg}</p>{/if}
          <button class="btn-save" on:click={saveAppointment} disabled={saving}>{saving ? 'Salvando...' : 'Criar Agendamento'}</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .wrap { max-width: 1100px; margin: 0 auto; padding-bottom: 3rem; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap; }
  .label { color: #555; letter-spacing: 3px; font-size: .72rem; text-transform: uppercase; margin: 0 0 .3rem; font-weight: 700; }
  h1 { color: #fff; font-size: 2rem; margin: 0 0 .35rem; letter-spacing: -.5px; }
  .sub { color: #777; margin: 0; font-size: .9rem; }
  .muted { color: #666; font-size: .9rem; }

  .btn-new { background: #fff; color: #000; border: none; padding: .7rem 1.2rem; border-radius: 8px; font-weight: 800; font-size: .8rem; cursor: pointer; white-space: nowrap; }
  .btn-new:hover { background: #E5C100; }

  /* KPI */
  .kpi-row { display: flex; gap: 1rem; margin-bottom: 1.25rem; }
  .kpi { background: #16161A; border: 1px solid #1A1A1E; border-radius: 12px; padding: 1rem 1.5rem; flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .kpi-val { font-size: 1.8rem; font-weight: 900; color: #fff; }
  .kpi-val.blue { color: #3b82f6; } .kpi-val.red { color: #EF4444; }
  .kpi-label { font-size: 0.6rem; color: #555; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }

  /* Controls */
  .controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; gap: 1rem; flex-wrap: wrap; }
  .date-nav { display: flex; align-items: center; gap: 6px; }
  .nav-btn { background: #16161A; border: 1px solid #1A1A1E; color: #888; width: 36px; height: 36px; border-radius: 8px; cursor: pointer; font-weight: 800; display: flex; align-items: center; justify-content: center; }
  .nav-btn:hover { border-color: #333; color: #fff; }
  .today-btn { width: auto; padding: 0 12px; font-size: 0.75rem; }
  .date-nav input { background: #16161A; border: 1px solid #1A1A1E; color: #fff; padding: 8px 12px; border-radius: 8px; font-size: 0.85rem; }
  .status-filter { display: flex; gap: 4px; flex-wrap: wrap; }
  .filter-btn { background: transparent; border: 1px solid #1A1A1E; color: #555; padding: 6px 12px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; cursor: pointer; transition: 0.2s; }
  .filter-btn.active { background: #1A1A1E; color: #fff; border-color: #333; }

  /* Appointments List */
  .appt-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .appt-row { display: flex; align-items: center; gap: 1rem; background: #16161A; border: 1px solid #1A1A1E; border-radius: 12px; padding: 1rem 1.25rem; transition: 0.2s; }
  .appt-row:hover { border-color: #2A2A2E; }
  .appt-time { font-size: 1rem; font-weight: 900; color: #fff; min-width: 50px; letter-spacing: -0.03em; }
  .appt-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .appt-info { flex: 1; }
  .appt-info strong { color: #fff; font-size: 0.9rem; display: block; }
  .appt-type { color: #555; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .appt-notes { color: #444; font-size: 0.75rem; margin: 4px 0 0; }
  .appt-status { font-size: 0.7rem; font-weight: 800; min-width: 80px; text-align: center; }
  .appt-actions { display: flex; gap: 6px; }
  .act-btn { background: #0F0F11; border: 1px solid #222; color: #888; padding: 5px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; cursor: pointer; transition: 0.2s; }
  .act-btn.green:hover { border-color: #22C55E; color: #22C55E; background: rgba(34,197,94,0.05); }
  .act-btn.red:hover { border-color: #EF4444; color: #EF4444; background: rgba(239,68,68,0.05); }
  .act-btn:hover { border-color: #555; color: #ccc; }

  .empty-slot { background: #16161A; border: 1px dashed #222; border-radius: 12px; padding: 2rem; text-align: center; }
  .empty-slot p { color: #555; font-size: 0.85rem; margin: 0; }
  .empty-card { text-align: center; padding: 3rem; background: #16161A; border: 1px solid #1A1A1E; border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
  .empty-card span { font-size: 2.5rem; }
  .empty-card h3 { color: #fff; margin: 0; }
  .btn-link { color: #E5C100; text-decoration: none; font-weight: 700; }

  /* Modal */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
  .modal { background: #141414; border: 1px solid #252525; border-radius: 20px; width: 100%; max-width: 480px; overflow: hidden; }
  .modal-head { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid #1E1E1E; }
  .modal-head h3 { color: #fff; font-size: 1.1rem; margin: 0; }
  .close-btn { background: none; border: none; color: #666; font-size: 1.2rem; cursor: pointer; }
  .modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
  .field { display: flex; flex-direction: column; gap: .4rem; }
  .field label { color: #888; font-size: .7rem; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700; }
  .field input, .field select, .field textarea { background: #0A0A0A; border: 1px solid #2a2a2a; border-radius: 10px; padding: .8rem 1rem; color: #fff; font-size: .9rem; outline: none; width: 100%; box-sizing: border-box; }
  .field input:focus, .field select:focus, .field textarea:focus { border-color: #E5C100; }
  .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .msg { font-size: .85rem; margin: 0; } .msg.err { color: #ff6b6b; } .msg.ok { color: #22C55E; }
  .btn-save { background: #fff; color: #000; border: none; padding: .85rem; border-radius: 10px; font-weight: 700; cursor: pointer; transition: 0.2s; }
  .btn-save:hover { background: #E5C100; }
  .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Limit Banner */
  .limit-banner { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); color: #F59E0B; padding: .8rem 1.25rem; border-radius: 10px; font-size: .85rem; font-weight: 600; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .banner-btn { background: #E5C100; color: #000; border: none; padding: .5rem 1rem; border-radius: 8px; font-weight: 700; font-size: .8rem; cursor: pointer; white-space: nowrap; transition: 0.2s; }
  .banner-btn:hover { background: #fce141; }

  @media (max-width: 768px) {
    .appt-row { flex-wrap: wrap; gap: 0.5rem; }
    .appt-actions { width: 100%; justify-content: flex-end; }
    .kpi-row { flex-wrap: wrap; }
    .kpi { min-width: calc(50% - 0.5rem); }
    .limit-banner { flex-direction: column; text-align: center; }
  }
</style>
