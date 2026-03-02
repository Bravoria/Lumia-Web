<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import { fade, fly } from 'svelte/transition';
  import { getClinicPlan, checkLimit } from '$lib/planGuard.js';
  import UpgradeModal from '$lib/components/UpgradeModal.svelte';

  let loading = true;
  let clinicId = null;
  let patients = [];

  // Modal de novo paciente
  let showModal = false;
  let saving = false;
  let newPatient = { name: '', phone: '', email: '', status: 'lead', source: '', notes: '' };
  let saveMsg = '';
  let saveErr = '';

  // Plan limits
  let planInfo = null;
  let showUpgrade = false;

  const stages = [
    { key: 'lead', label: 'Lead / Novo Contato', icon: '🎯', color: '#3b82f6' },
    { key: 'contato', label: 'Em Contato', icon: '💬', color: '#F59E0B' },
    { key: 'agendado', label: 'Avaliação Agendada', icon: '📅', color: '#8B5CF6' },
    { key: 'ativo', label: 'Paciente Ativo', icon: '✅', color: '#22C55E' },
    { key: 'inativo', label: 'Inativo / Perdido', icon: '💤', color: '#555' }
  ];

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

      planInfo = await getClinicPlan(clinicId);
      await loadPatients();
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  });

  async function loadPatients() {
    if (!clinicId) return;
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });
    patients = data ?? [];
  }

  function getByStage(stageKey) {
    return patients.filter(p => p.status === stageKey);
  }

  async function movePatient(id, newStatus) {
    const { error } = await supabase
      .from('patients')
      .update({ status: newStatus })
      .eq('id', id);
    if (!error) await loadPatients();
  }

  // Check patient limit
  $: patientLimit = planInfo ? checkLimit(planInfo.limits, 'max_patients', patients.length) : { allowed: true, max: -1 };

  function openNewPatient() {
    if (patientLimit.max !== -1 && !patientLimit.allowed) {
      showUpgrade = true;
      return;
    }
    showModal = true; saveErr = ''; saveMsg = '';
  }

  async function savePatient() {
    saveMsg = ''; saveErr = '';
    if (!newPatient.name) {
      saveErr = 'Nome é obrigatório.';
      return;
    }
    // Double-check limit
    if (patientLimit.max !== -1 && !patientLimit.allowed) {
      saveErr = `Limite de ${patientLimit.max} pacientes atingido. Faça upgrade do plano.`;
      return;
    }
    saving = true;
    const { error } = await supabase.from('patients').insert({
      clinic_id: clinicId,
      name: newPatient.name,
      phone: newPatient.phone || null,
      email: newPatient.email || null,
      status: newPatient.status,
      source: newPatient.source || null,
      notes: newPatient.notes || null
    });
    if (error) {
      saveErr = 'Erro: ' + error.message;
    } else {
      saveMsg = 'Paciente adicionado!';
      newPatient = { name: '', phone: '', email: '', status: 'lead', source: '', notes: '' };
      await loadPatients();
      setTimeout(() => { showModal = false; saveMsg = ''; }, 1000);
    }
    saving = false;
  }

  $: totalValue = patients.length; // Placeholder - num futuro, somar valor de orçamento
  $: conversionRate = patients.length > 0 
    ? Math.round((patients.filter(p => p.status === 'ativo').length / patients.length) * 100) 
    : 0;
</script>

<svelte:head><title>Pipeline • LumiaOS</title></svelte:head>

<div class="wrap">
  <div class="header">
    <div>
      <p class="label">PIPELINE</p>
      <h1>Pipeline de Pacientes</h1>
      <p class="sub">Visualize e gerencie cada etapa da jornada do paciente.</p>
    </div>
    <div class="header-right">
      <div class="header-stats">
        <div class="h-stat"><span class="h-num">{patients.length}</span><span class="h-label">Total</span></div>
        <div class="h-stat"><span class="h-num green">{conversionRate}%</span><span class="h-label">Conversão</span></div>
      </div>
      <button class="btn-new" on:click={openNewPatient}>+ Novo Paciente{patientLimit.max !== -1 ? ` (${patientLimit.remaining} restantes)` : ''}</button>
    </div>
  </div>

  {#if patientLimit.max !== -1 && !patientLimit.allowed}
    <div class="limit-banner" in:fly={{ y: -10, duration: 300 }}>
      ⚠️ Limite de {patientLimit.max} pacientes atingido no plano {planInfo?.planName}.
      <button class="banner-btn" on:click={() => showUpgrade = true}>Fazer upgrade</button>
    </div>
  {/if}

  <UpgradeModal clinicId={clinicId} bind:show={showUpgrade} feature="max_patients" currentPlan={planInfo?.planName ?? 'Starter'} requiredPlan="Pro" />

  {#if loading}
    <p class="muted">Carregando pipeline...</p>
  {:else if !clinicId}
    <div class="empty-card">
      <span>🎯</span>
      <h3>Configure sua clínica</h3>
      <p class="muted">Finalize o setup para gerenciar pacientes.</p>
      <a href="/setup" class="btn-link">Ir para Setup</a>
    </div>
  {:else}
    <div class="pipeline" in:fade>
      {#each stages as stage, si}
        <div class="stage" in:fly={{ y: 20, duration: 400, delay: si * 80 }}>
          <div class="stage-head">
            <div class="stage-title">
              <span class="stage-icon">{stage.icon}</span>
              <h3>{stage.label}</h3>
            </div>
            <span class="stage-count" style="background: {stage.color}22; color: {stage.color}">{getByStage(stage.key).length}</span>
          </div>

          <div class="stage-list">
            {#each getByStage(stage.key) as patient (patient.id)}
              <div class="patient-card" in:fly={{ y: 10, duration: 200 }}>
                <div class="pc-top">
                  <div class="pc-avatar">{patient.name?.[0] ?? '?'}</div>
                  <div class="pc-info">
                    <strong>{patient.name}</strong>
                    {#if patient.phone}<span class="pc-phone">{patient.phone}</span>{/if}
                  </div>
                </div>
                {#if patient.source}<span class="pc-source">via {patient.source}</span>{/if}
                {#if patient.notes}<p class="pc-notes">{patient.notes}</p>{/if}

                <div class="pc-actions">
                  {#each stages as s}
                    {#if s.key !== stage.key}
                      <button class="move-btn" on:click={() => movePatient(patient.id, s.key)} title="Mover para {s.label}">
                        {s.icon}
                      </button>
                    {/if}
                  {/each}
                </div>
              </div>
            {:else}
              <div class="empty-stage">
                <p>Nenhum paciente</p>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Modal -->
  {#if showModal}
    <div class="modal-overlay" on:click|self={() => showModal = false} transition:fade={{ duration: 150 }}>
      <div class="modal" in:fly={{ y: 20, duration: 300 }}>
        <div class="modal-head">
          <h3>Novo Paciente</h3>
          <button class="close-btn" on:click={() => showModal = false}>✕</button>
        </div>
        <div class="modal-body">
          <div class="field"><label>Nome *</label><input bind:value={newPatient.name} placeholder="Nome completo" /></div>
          <div class="row2">
            <div class="field"><label>Telefone</label><input bind:value={newPatient.phone} placeholder="11 99999-9999" /></div>
            <div class="field"><label>Email</label><input bind:value={newPatient.email} placeholder="email@exemplo.com" /></div>
          </div>
          <div class="row2">
            <div class="field"><label>Etapa</label>
              <select bind:value={newPatient.status}>
                {#each stages as s}<option value={s.key}>{s.label}</option>{/each}
              </select>
            </div>
            <div class="field"><label>Origem</label>
              <select bind:value={newPatient.source}>
                <option value="">Não informada</option>
                <option>WhatsApp</option><option>Instagram</option><option>Google</option><option>Indicação</option><option>Telefone</option>
              </select>
            </div>
          </div>
          <div class="field"><label>Observações</label><textarea bind:value={newPatient.notes} placeholder="Notas sobre o paciente..." rows="2"></textarea></div>
          {#if saveErr}<p class="msg err">{saveErr}</p>{/if}
          {#if saveMsg}<p class="msg ok">{saveMsg}</p>{/if}
          <button class="btn-save" on:click={savePatient} disabled={saving}>{saving ? 'Salvando...' : 'Adicionar Paciente'}</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .wrap { max-width: 100%; margin: 0 auto; padding-bottom: 3rem; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap; }
  .header-right { display: flex; align-items: center; gap: 1.5rem; }
  .header-stats { display: flex; gap: 1.5rem; }
  .h-stat { display: flex; flex-direction: column; align-items: center; }
  .h-num { font-size: 1.3rem; font-weight: 900; color: #fff; } .h-num.green { color: #22C55E; }
  .h-label { font-size: 0.6rem; color: #555; font-weight: 700; text-transform: uppercase; }
  .label { color: #555; letter-spacing: 3px; font-size: .72rem; text-transform: uppercase; margin: 0 0 .3rem; font-weight: 700; }
  h1 { color: #fff; font-size: 2rem; margin: 0 0 .35rem; letter-spacing: -.5px; }
  .sub { color: #777; margin: 0; font-size: .9rem; }
  .muted { color: #666; font-size: .9rem; }

  .btn-new { background: #fff; color: #000; border: none; padding: .7rem 1.2rem; border-radius: 8px; font-weight: 800; font-size: .8rem; cursor: pointer; white-space: nowrap; }
  .btn-new:hover { background: #E5C100; }

  /* Pipeline */
  .pipeline { display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 1rem; }
  .stage { min-width: 280px; flex: 1; display: flex; flex-direction: column; }
  .stage-head { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid #1A1A1E; margin-bottom: 0.75rem; }
  .stage-title { display: flex; align-items: center; gap: 8px; }
  .stage-icon { font-size: 1rem; }
  .stage-head h3 { font-size: 0.75rem; font-weight: 800; color: #888; text-transform: uppercase; margin: 0; letter-spacing: 0.03em; }
  .stage-count { font-size: 0.7rem; font-weight: 900; padding: 2px 8px; border-radius: 10px; }

  .stage-list { display: flex; flex-direction: column; gap: 0.5rem; flex: 1; }
  .patient-card { background: #16161A; border: 1px solid #1A1A1E; border-radius: 12px; padding: 1rem; transition: 0.2s; }
  .patient-card:hover { border-color: #2A2A2E; }
  .pc-top { display: flex; gap: 10px; align-items: center; margin-bottom: 6px; }
  .pc-avatar { width: 30px; height: 30px; background: #222; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 900; flex-shrink: 0; }
  .pc-info strong { display: block; color: #fff; font-size: 0.85rem; }
  .pc-phone { color: #555; font-size: 0.7rem; font-weight: 600; }
  .pc-source { display: inline-block; font-size: 0.6rem; color: #666; background: #0F0F11; padding: 2px 6px; border-radius: 4px; font-weight: 600; margin-bottom: 4px; }
  .pc-notes { color: #444; font-size: 0.75rem; margin: 4px 0 0; line-height: 1.4; }
  .pc-actions { display: flex; gap: 4px; margin-top: 8px; border-top: 1px solid #1A1A1E; padding-top: 8px; }
  .move-btn { background: #0F0F11; border: 1px solid #1A1A1E; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
  .move-btn:hover { border-color: #444; background: #1A1A1E; }

  .empty-stage { border: 1px dashed #1A1A1E; border-radius: 10px; padding: 1.5rem; text-align: center; }
  .empty-stage p { color: #333; font-size: 0.75rem; margin: 0; font-weight: 600; }

  .empty-card { text-align: center; padding: 3rem; background: #16161A; border: 1px solid #1A1A1E; border-radius: 16px; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
  .empty-card span { font-size: 2.5rem; } .empty-card h3 { color: #fff; margin: 0; }
  .btn-link { color: #E5C100; text-decoration: none; font-weight: 700; }

  /* Modal */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem; }
  .modal { background: #141414; border: 1px solid #252525; border-radius: 20px; width: 100%; max-width: 500px; overflow: hidden; }
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
    .pipeline { flex-direction: column; }
    .stage { min-width: 100%; }
    .limit-banner { flex-direction: column; text-align: center; }
  }
</style>
