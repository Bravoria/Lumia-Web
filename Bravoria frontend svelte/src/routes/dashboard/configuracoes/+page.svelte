<!-- src/routes/dashboard/configuracoes/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase.js';

  let isLoading = true;
  let isSaving = false;
  let savedOk = '';
  let errorMsg = '';

  // Campos (lado esquerdo)
  let clinicName = '';
  let specialty = '';
  let city = '';
  let whatsapp = '';
  let tone = 'Profissional';
  let clinicSlug = '';
  let myClinicId = null;

  // Horários / dias (lado direito)
  const dayKeys = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
  const dayLabels = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sab: 'Sáb', dom: 'Dom' };
  let days = { seg: true, ter: true, qua: true, qui: true, sex: true, sab: false, dom: false };

  let startTime = '09:00';
  let endTime = '18:00';

  // Serviços e regras
  let servicesRaw = '';
  let rulesRaw = '';

  function toServicesArray(text) {
    return (text || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  function toRulesArray(text) {
    return (text || '')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
  }

  function fromArrayToComma(arr) {
    return Array.isArray(arr) ? arr.join(', ') : '';
  }

  function fromArrayToLines(arr) {
    return Array.isArray(arr) ? arr.join('\n') : '';
  }

  async function requireSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      goto('/login');
      return null;
    }
    return session;
  }

  async function loadSettings() {
    const session = await requireSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('clinic_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (error) {
      errorMsg = 'Erro ao carregar configurações: ' + error.message;
      isLoading = false;
      return;
    }

    if (data) {
      clinicName = data.clinic_name || '';
      specialty = data.specialty || '';
      city = data.city || '';
      whatsapp = data.whatsapp || '';
      tone = data.tone || 'Profissional';

      // days vem como array jsonb ["seg","ter"...]
      const selected = Array.isArray(data.days) ? data.days : [];
      days = { seg:false, ter:false, qua:false, qui:false, sex:false, sab:false, dom:false };
      for (const k of selected) if (k in days) days[k] = true;

      startTime = (data.start_time || '09:00').slice(0,5);
      endTime = (data.end_time || '18:00').slice(0,5);

      servicesRaw = fromArrayToComma(data.services);
      rulesRaw = fromArrayToLines(data.rules);
    }

    isLoading = false;
  }

  // Carregar slug da tabela clinics
  async function loadSlug(session) {
    const { data: member } = await supabase
      .from('clinic_members')
      .select('clinic_id')
      .eq('user_id', session.user.id)
      .limit(1).maybeSingle();
    if (member?.clinic_id) {
      myClinicId = member.clinic_id;
      const { data: clinic } = await supabase
        .from('clinics')
        .select('slug')
        .eq('id', myClinicId)
        .maybeSingle();
      clinicSlug = clinic?.slug || '';
    }
  }

  async function saveSettings() {
    errorMsg = '';
    savedOk = '';

    const session = await requireSession();
    if (!session) return;

    if (!specialty.trim() || !city.trim()) {
      errorMsg = 'Preencha pelo menos: Especialidade e Cidade.';
      return;
    }

    isSaving = true;

    const selectedDays = dayKeys.filter(k => days[k]);

    const payload = {
      user_id: session.user.id,
      clinic_name: clinicName || null,
      specialty: specialty.trim(),
      city: city.trim(),
      whatsapp: whatsapp || null,
      tone,
      days: selectedDays,
      start_time: startTime,
      end_time: endTime,
      services: toServicesArray(servicesRaw),
      rules: toRulesArray(rulesRaw)
    };

    const { error } = await supabase
      .from('clinic_settings')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      errorMsg = 'Erro ao salvar: ' + error.message;
    } else {
      savedOk = 'Configurações salvas com sucesso ✅';
      // Salvar slug na tabela clinics
      if (myClinicId && clinicSlug.trim()) {
        await supabase.from('clinics').update({ slug: clinicSlug.trim() }).eq('id', myClinicId);
      }
      setTimeout(() => (savedOk = ''), 2500);
    }

    isSaving = false;
  }

  onMount(async () => {
    await loadSettings();
    const session = await requireSession();
    if (session) await loadSlug(session);
  });
</script>

{#if isLoading}
  <main class="wrap">
    <p class="muted">Carregando configurações...</p>
  </main>
{:else}
  <main class="wrap">
    <div class="top">
      <div>
        <p class="label">CONFIGURAÇÕES</p>
        <h1>Configure sua clínica</h1>
        <p class="muted">Isso define o “cérebro” do seu atendente e o padrão do seu conteúdo.</p>
      </div>

      <button class="btn-save" on:click={saveSettings} disabled={isSaving}>
        {isSaving ? '⏳ Salvando...' : '💾 Salvar Configurações'}
      </button>
    </div>

    {#if errorMsg}
      <div class="alert error">{errorMsg}</div>
    {/if}
    {#if savedOk}
      <div class="alert ok">{savedOk}</div>
    {/if}

    <div class="grid">
      <section class="card">
        <h2>Informações básicas</h2>

        <div class="field">
          <label>Nome da clínica (opcional)</label>
          <input placeholder="Ex: Clínica NovaVida" bind:value={clinicName} />
        </div>

        <div class="field">
          <label>Especialidade *</label>
          <input placeholder="Ex: Cardiologia, Odonto, Estética..." bind:value={specialty} />
        </div>

        <div class="field">
          <label>Cidade *</label>
          <input placeholder="Ex: São Paulo" bind:value={city} />
        </div>

        <div class="field">
          <label>WhatsApp (opcional)</label>
          <input placeholder="Ex: 11 99999-9999" bind:value={whatsapp} />
        </div>

        <div class="field">
          <label>Link de Agendamento Online</label>
          <div class="slug-row">
            <span class="slug-prefix">lumia-web.vercel.app/agendar/</span>
            <input placeholder="minha-clinica" bind:value={clinicSlug} class="slug-input" />
          </div>
          {#if clinicSlug}
            <p class="slug-preview">📎 Compartilhe: <a href="https://lumia-web.vercel.app/agendar/{clinicSlug}" target="_blank">lumia-web.vercel.app/agendar/{clinicSlug}</a></p>
          {/if}
        </div>

        <div class="field">
          <label>Tom de voz</label>
          <select bind:value={tone}>
            <option>Profissional</option>
            <option>Humanizado</option>
            <option>Direto</option>
            <option>Premium</option>
          </select>
        </div>
      </section>

      <section class="card">
        <h2>Horário de atendimento</h2>

        <div class="days">
          {#each dayKeys as k}
            <label class="day">
              <input type="checkbox" bind:checked={days[k]} />
              <span>{dayLabels[k]}</span>
            </label>
          {/each}
        </div>

        <div class="row">
          <div class="field">
            <label>Início</label>
            <input type="time" bind:value={startTime} />
          </div>
          <div class="field">
            <label>Fim</label>
            <input type="time" bind:value={endTime} />
          </div>
        </div>

        <div class="field">
          <label>Serviços (separe por vírgula)</label>
          <textarea rows="3" placeholder="Consulta, Retorno, Avaliação, Procedimento..." bind:value={servicesRaw}></textarea>
        </div>
      </section>
    </div>

    <section class="card big">
      <h2>Regras do atendente (Agente PhD)</h2>
      <p class="muted small">
        Uma regra por linha. Ex.: “Não diagnosticar por chat”, “Sempre oferecer agendamento”, “Evitar falar preço sem avaliar”.
      </p>
      <textarea
        rows="7"
        placeholder="Digite as regras aqui, uma por linha..."
        bind:value={rulesRaw}
      ></textarea>
    </section>
  </main>
{/if}

<style>
  .wrap{ max-width:1100px; margin:0 auto; padding:2.5rem; }
  .label{ font-size:.72rem; text-transform:uppercase; letter-spacing:2px; color:#555; margin-bottom:.5rem; font-weight:700; }
  h1{ color:#fff; font-size:2rem; font-weight:900; margin:0 0 .35rem; letter-spacing:-.8px; }
  .muted{ color:#666; margin:0; }
  .small{ font-size:.85rem; margin-top:.5rem; }

  .top{ display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; margin-bottom:1.25rem; }
  .btn-save{
    padding:.8rem 1.5rem; border-radius:12px;
    border:none; background:#E5C100; color:#000;
    font-weight:800; cursor:pointer; font-size: .9rem;
    transition: all 0.2s;
  }
  .btn-save:hover{ background:#fce141; transform: translateY(-1px); }
  .btn-save:disabled{ opacity:.5; cursor:not-allowed; transform: none; }

  .alert{ border-radius:12px; padding:.85rem 1rem; margin-bottom:1rem; border:1px solid #2a2a2a; font-size: .9rem; font-weight: 600; }
  .error{ background: rgba(220,38,38,.08); color:#ff6b6b; border-color: rgba(220,38,38,.25); }
  .ok{ background: rgba(229,193,0,.07); color:#E5C100; border-color: rgba(229,193,0,.25); }

  .grid{ display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-top:1rem; }
  .card{
    background:#141414; border:1px solid #252525; border-radius:16px;
    padding:1.5rem; transition: border-color 0.2s;
  }
  .card:hover { border-color: #333; }
  .big{ margin-top:1rem; }

  h2{ color:#fff; font-size:1.05rem; margin:0 0 1.25rem; font-weight:900; letter-spacing:-.3px; }

  .field{ margin-bottom:1.15rem; }
  label{ display:block; color:#888; font-size:.72rem; text-transform:uppercase; letter-spacing:.8px; margin-bottom:.45rem; font-weight:700; }
  input, select, textarea{
    width:100%;
    background:#0A0A0A;
    border:1px solid #2a2a2a;
    border-radius:10px;
    padding:.85rem 1rem;
    color:#fff;
    font-size:.95rem;
    outline:none;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }
  textarea{ resize: vertical; font-family: 'Inter', sans-serif; }
  input:focus, select:focus, textarea:focus{ border-color:#E5C100; }

  .days{ display:flex; flex-wrap:wrap; gap:.75rem; margin-bottom:1rem; }
  .day{ display:flex; align-items:center; gap:.4rem; color:#ccc; font-size:.9rem; cursor: pointer; }
  .day span{ color:#bbb; font-size:.9rem; }
  .day input[type="checkbox"] { accent-color: #E5C100; }
  .slug-row { display: flex; align-items: center; background: #0A0A0A; border: 1px solid #2a2a2a; border-radius: 10px; overflow: hidden; }
  .slug-prefix { color: #555; font-size: 0.75rem; padding: 0 0 0 0.75rem; white-space: nowrap; font-weight: 600; }
  .slug-input { border: none !important; border-radius: 0 !important; padding-left: 0.4rem !important; font-size: 0.85rem !important; }
  .slug-preview { color: #888; font-size: 0.75rem; margin-top: 0.4rem; }
  .slug-preview a { color: #E5C100; text-decoration: none; }
  .slug-preview a:hover { text-decoration: underline; }
  .row{ display:grid; grid-template-columns:1fr 1fr; gap:1rem; }

  @media (max-width:900px){
    .wrap{ padding:1.5rem; }
    .grid{ grid-template-columns:1fr; }
    .top{ flex-direction:column; }
    .btn-save{ width:100%; }
  }
</style>