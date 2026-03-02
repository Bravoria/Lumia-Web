<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase.js';
  import { fly, fade } from 'svelte/transition'; // Animações premium

  let isLoadingSession = true;
  let isSaving = false;
  let errorMsg = '';
  let step = 1;

  let clinicName = '';
  let specialty = '';
  let city = '';
  let whatsapp = '';

  const dayKeys = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
  const dayLabels = { seg: 'Segunda', ter: 'Terça', qua: 'Quarta', qui: 'Quinta', sex: 'Sexta', sab: 'Sábado', dom: 'Domingo' };
  let days = { seg: true, ter: true, qua: true, qui: true, sex: true, sab: false, dom: false };
  let startTime = '09:00';
  let endTime = '18:00';

  let userName = '';
  let userId = null;

  onMount(async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      goto('/login');
      return;
    }

    userId = session.user.id;
    userName = session.user.user_metadata?.full_name || session.user.email;

    const { data: member } = await supabase
      .from('clinic_members')
      .select('clinic_id')
      .eq('user_id', session.user.id)
      .limit(1)
      .maybeSingle();

    if (member?.clinic_id) {
      goto('/dashboard');
      return;
    }

    isLoadingSession = false;
  });

  function nextStep() {
    errorMsg = '';
    if (!specialty.trim() || !city.trim()) {
      errorMsg = 'Preencha Especialidade e Cidade para continuar.';
      return;
    }
    step = 2;
  }

  function prevStep() {
    errorMsg = '';
    step = 1;
  }

  async function createClinic() {
    errorMsg = '';
    if (!specialty.trim() || !city.trim()) {
      errorMsg = 'Preencha pelo menos Especialidade e Cidade.';
      return;
    }

    isSaving = true;

    try {
      const { data: clinic, error: clinicErr } = await supabase
        .from('clinics')
        .insert({
          name: clinicName.trim() || `Clínica de ${specialty.trim()}`,
          whatsapp: whatsapp.trim() || null,
          timezone: 'America/Sao_Paulo'
        })
        .select('id')
        .single();

      if (clinicErr) throw clinicErr;

      const { error: memberErr } = await supabase
        .from('clinic_members')
        .insert({ clinic_id: clinic.id, user_id: userId, role: 'owner' });

      if (memberErr) throw memberErr;

      const selectedDays = dayKeys.filter(k => days[k]);
      const { error: settingsErr } = await supabase
        .from('clinic_settings')
        .upsert({
          user_id: userId,
          clinic_name: clinicName.trim() || null,
          specialty: specialty.trim(),
          city: city.trim(),
          whatsapp: whatsapp.trim() || null,
          tone: 'Profissional',
          days: selectedDays,
          start_time: startTime,
          end_time: endTime,
          services: [],
          rules: []
        }, { onConflict: 'user_id' });

      if (settingsErr) throw settingsErr;

      goto('/dashboard');
    } catch (e) {
      errorMsg = e?.message ?? 'Erro ao criar clínica.';
    } finally {
      isSaving = false;
    }
  }
</script>

<svelte:head><title>Setup • Lumia</title></svelte:head>

{#if isLoadingSession}
  <main class="loading" out:fade>
    <div class="loading-inner">
      <div class="spinner"></div>
      <p class="loading-text">Preparando seu ambiente...</p>
    </div>
  </main>
{:else}
  <main class="page">
    <div class="bg-glow"></div>
    
    <div class="setup-container" in:fly={{ y: 20, duration: 400, delay: 100 }}>
      <div class="header">
        <div class="brand">
          <img src="/logo.png" alt="Lumia" class="logo-sm" />
          <span class="brand-text">Lumia<span class="dot">.ia</span></span>
        </div>
        
        <div class="progress-indicator">
          <div class="step-dot" class:active={step >= 1}></div>
          <div class="step-line" class:active={step >= 2}></div>
          <div class="step-dot" class:active={step >= 2}></div>
        </div>
      </div>

      <div class="card glow-card">
        <div class="welcome">
          <p class="greet">Olá, {userName.split(' ')[0]} 👋</p>
          <h2>{step === 1 ? 'Configure sua clínica' : 'Horários de atendimento'}</h2>
          <p class="sub">
            {step === 1 
              ? 'Vamos preparar a inteligência artificial para o seu negócio.' 
              : 'Defina quando sua IA e sua equipe estarão disponíveis para agendamentos.'}
          </p>
        </div>

        {#if errorMsg}
          <div class="alert" transition:fade>{errorMsg}</div>
        {/if}

        {#if step === 1}
          <div class="fields" in:fly={{ x: 20, duration: 300, delay: 100 }} out:fade={{ duration: 150 }}>
            <div class="field">
              <label>Nome da clínica <span class="opt">(opcional)</span></label>
              <input bind:value={clinicName} placeholder="Ex: Clínica NovaVida" />
            </div>
            
            <div class="row2">
              <div class="field">
                <label>Especialidade *</label>
                <input bind:value={specialty} placeholder="Ex: Cardiologia, Odonto..." />
              </div>
              <div class="field">
                <label>Cidade *</label>
                <input bind:value={city} placeholder="Ex: São Paulo" />
              </div>
            </div>

            <div class="field">
              <label>WhatsApp da Clínica <span class="opt">(opcional)</span></label>
              <input bind:value={whatsapp} placeholder="Ex: 11 99999-9999" />
              <p class="field-hint">Usaremos este número para conectar a IA depois.</p>
            </div>
            
            <button class="btn-primary mt-4" on:click={nextStep}>
              Continuar configuração <span class="arrow">→</span>
            </button>
          </div>
        {/if}

        {#if step === 2}
          <div class="fields" in:fly={{ x: 20, duration: 300, delay: 100 }} out:fade={{ duration: 150 }}>
            <div class="field">
              <label>Dias de funcionamento</label>
              <div class="days-grid">
                {#each dayKeys as k}
                  <label class="day-card" class:selected={days[k]}>
                    <input type="checkbox" bind:checked={days[k]} />
                    <span class="check-icon">{days[k] ? '✓' : ''}</span>
                    <span class="day-name">{dayLabels[k]}</span>
                  </label>
                {/each}
              </div>
            </div>

            <div class="row2 mt-2">
              <div class="field">
                <label>Abre às</label>
                <input type="time" bind:value={startTime} />
              </div>
              <div class="field">
                <label>Fecha às</label>
                <input type="time" bind:value={endTime} />
              </div>
            </div>

            <div class="btn-row mt-4">
              <button class="btn-back" on:click={prevStep}>Voltar</button>
              <button class="btn-primary" on:click={createClinic} disabled={isSaving}>
                {isSaving ? 'Gerando espaço...' : 'Finalizar Setup ✨'}
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </main>
{/if}

<style>
  /* Loading */
  .loading { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0A0A0A; }
  .loading-inner { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .spinner { width: 40px; height: 40px; border: 3px solid rgba(229, 193, 0, 0.2); border-top-color: #E5C100; border-radius: 50%; animation: spin 1s linear infinite; }
  .loading-text { color: #888; font-size: 0.85rem; letter-spacing: 1px; text-transform: uppercase; font-weight: 600; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* Layout Base */
  .page { min-height: 100vh; background: #0A0A0A; display: flex; align-items: center; justify-content: center; padding: 2rem; position: relative; overflow: hidden; }
  
  /* Background Premium Glow */
  .bg-glow {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 800px; height: 800px; background: radial-gradient(circle, rgba(229,193,0,0.03) 0%, rgba(10,10,10,0) 70%);
    pointer-events: none; z-index: 0;
  }

  .setup-container { width: 100%; max-width: 540px; z-index: 10; display: flex; flex-direction: column; gap: 1.5rem; }

  /* Header & Progress */
  .header { display: flex; justify-content: space-between; align-items: center; padding: 0 0.5rem; }
  .brand { display: flex; align-items: center; gap: .5rem; }
  .logo-sm { height: auto; width: 140px; object-fit: contain; }
  .brand-text { display: none; }
  .dot { color: #E5C100; }

  .progress-indicator { display: flex; align-items: center; gap: 4px; }
  .step-dot { width: 8px; height: 8px; border-radius: 50%; background: #333; transition: all 0.3s ease; }
  .step-dot.active { background: #E5C100; box-shadow: 0 0 8px rgba(229,193,0,0.4); }
  .step-line { width: 24px; height: 2px; background: #333; transition: all 0.3s ease; }
  .step-line.active { background: #E5C100; }

  /* Card e Textos */
  .card { background: #141414; border: 1px solid #252525; border-radius: 24px; padding: 2.5rem; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
  
  .glow-card { position: relative; }
  .glow-card::before { content: ''; position: absolute; top: 0; left: 50%; transform: translateX(-50%); width: 40%; height: 1px; background: linear-gradient(90deg, transparent, rgba(229,193,0,0.5), transparent); }

  .welcome { margin-bottom: 2rem; }
  .greet { color: #E5C100; font-size: .85rem; margin: 0 0 .5rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
  h2 { color: #fff; font-size: 1.7rem; margin: 0 0 .5rem; letter-spacing: -.5px; }
  .sub { color: #888; font-size: .95rem; margin: 0; line-height: 1.5; }

  .alert { background: rgba(255, 107, 107, 0.1); border: 1px solid rgba(255, 107, 107, 0.2); color: #ff6b6b; border-radius: 12px; padding: 1rem; font-size: .9rem; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 8px; }
  .alert::before { content: '⚠️'; }

  /* Formulário */
  .fields { display: flex; flex-direction: column; gap: 1.25rem; }
  .field { display: flex; flex-direction: column; gap: .5rem; }
  label { color: #aaa; font-size: .75rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
  .opt { color: #666; text-transform: none; letter-spacing: 0; font-weight: 400; font-size: .75rem; }
  .field-hint { color: #666; font-size: 0.8rem; margin: 0; }
  
  input {
    background: #0A0A0A; border: 1px solid #2a2a2a; border-radius: 12px;
    padding: 1rem 1.2rem; color: #fff; font-size: 1rem; outline: none;
    transition: all .2s; width: 100%; box-sizing: border-box;
  }
  input:focus { border-color: #E5C100; box-shadow: 0 0 0 3px rgba(229,193,0,0.1); }

  .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
  .mt-2 { margin-top: 0.5rem; }
  .mt-4 { margin-top: 1.5rem; }

  /* Grid de Dias (Premium Checkboxes) */
  .days-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 0.75rem; }
  .day-card {
    background: #0A0A0A; border: 1px solid #2a2a2a; border-radius: 12px; padding: 0.8rem;
    display: flex; align-items: center; gap: 0.5rem; cursor: pointer; transition: all 0.2s;
  }
  .day-card input { display: none; }
  .day-card .check-icon {
    width: 18px; height: 18px; border-radius: 4px; border: 1px solid #444;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; color: transparent; transition: all 0.2s;
  }
  .day-card.selected { background: rgba(229,193,0,0.05); border-color: rgba(229,193,0,0.3); }
  .day-card.selected .check-icon { background: #E5C100; border-color: #E5C100; color: #000; font-weight: bold; }
  .day-card .day-name { color: #888; font-size: 0.9rem; font-weight: 500; transition: color 0.2s; }
  .day-card.selected .day-name { color: #fff; }

  /* Botões */
  .btn-primary {
    width: 100%; padding: 1rem; background: #fff; color: #0A0A0A; border: none;
    border-radius: 12px; font-size: 1rem; font-weight: 700; cursor: pointer;
    transition: all .2s; display: flex; justify-content: center; align-items: center; gap: 8px;
  }
  .btn-primary:hover { background: #E5C100; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(229,193,0,0.2); }
  .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none; background: #E5C100; }
  .arrow { font-size: 1.2rem; transition: transform 0.2s; }
  .btn-primary:hover .arrow { transform: translateX(4px); }

  .btn-row { display: flex; gap: 1rem; }
  .btn-back {
    flex: 0 0 auto; padding: 1rem 1.5rem; background: transparent; color: #888;
    border: 1px solid #333; border-radius: 12px; font-size: 0.95rem; font-weight: 600;
    cursor: pointer; transition: all .2s;
  }
  .btn-back:hover { border-color: #666; color: #fff; }

  @media (max-width: 600px) {
    .page { padding: 1rem; }
    .card { padding: 1.5rem; border-radius: 20px; }
    .row2 { grid-template-columns: 1fr; gap: 1rem; }
    .days-grid { grid-template-columns: 1fr 1fr; }
  }
</style>