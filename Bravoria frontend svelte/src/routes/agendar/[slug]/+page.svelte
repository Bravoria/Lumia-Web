<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { supabase } from '$lib/supabase.js';

  let slug = '';
  let clinic = null;
  let settings = null;
  let loading = true;
  let notFound = false;

  // Booking state
  let step = 1; // 1=info, 2=date, 3=confirm
  let selectedDate = '';
  let selectedTime = '';
  let patientName = '';
  let patientPhone = '';
  let patientEmail = '';
  let notes = '';
  let saving = false;
  let booked = false;
  let errorMsg = '';

  // Available slots
  let availableSlots = [];
  let bookedSlots = [];

  $: slug = $page.params.slug;

  onMount(async () => {
    if (!slug) { notFound = true; loading = false; return; }

    // Find clinic by slug
    const { data: clinicData } = await supabase
      .from('clinics')
      .select('id, name, slug')
      .eq('slug', slug)
      .maybeSingle();

    if (!clinicData) { notFound = true; loading = false; return; }
    clinic = clinicData;

    // Load settings
    const { data: settingsData } = await supabase
      .from('clinic_settings')
      .select('*')
      .eq('clinic_id', clinic.id)
      .maybeSingle();

    // Fallback: try user_id based lookup
    if (!settingsData) {
      const { data: memberData } = await supabase
        .from('clinic_members')
        .select('user_id')
        .eq('clinic_id', clinic.id)
        .limit(1)
        .maybeSingle();
      if (memberData) {
        const { data: alt } = await supabase
          .from('clinic_settings')
          .select('*')
          .eq('user_id', memberData.user_id)
          .maybeSingle();
        settings = alt;
      }
    } else {
      settings = settingsData;
    }

    // Set default date to today
    selectedDate = new Date().toISOString().slice(0, 10);
    await generateSlots();
    loading = false;
  });

  async function generateSlots() {
    if (!settings || !selectedDate) return;

    const start = settings.start_time?.slice(0, 5) || '09:00';
    const end = settings.end_time?.slice(0, 5) || '18:00';
    const activeDays = Array.isArray(settings.days) ? settings.days : ['seg','ter','qua','qui','sex'];

    const dayMap = { 0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab' };
    const dateObj = new Date(selectedDate + 'T12:00:00');
    const dayKey = dayMap[dateObj.getDay()];

    if (!activeDays.includes(dayKey)) {
      availableSlots = [];
      return;
    }

    // Generate 30-min slots
    const slots = [];
    let [startH, startM] = start.split(':').map(Number);
    let [endH, endM] = end.split(':').map(Number);
    let current = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    while (current < endMin) {
      const h = Math.floor(current / 60).toString().padStart(2, '0');
      const m = (current % 60).toString().padStart(2, '0');
      slots.push(`${h}:${m}`);
      current += 30;
    }

    // Check already booked slots
    const { data: existing } = await supabase
      .from('appointments')
      .select('time')
      .eq('clinic_id', clinic.id)
      .eq('date', selectedDate)
      .in('status', ['agendado', 'confirmado']);

    bookedSlots = (existing || []).map(a => a.time?.slice(0, 5));
    availableSlots = slots.filter(s => !bookedSlots.includes(s));
  }

  function selectSlot(time) {
    selectedTime = time;
    step = 2;
  }

  function goToConfirm() {
    errorMsg = '';
    if (!patientName.trim()) { errorMsg = 'Preencha seu nome.'; return; }
    if (!patientPhone.trim()) { errorMsg = 'Preencha seu telefone.'; return; }
    step = 3;
  }

  async function confirmBooking() {
    saving = true;
    errorMsg = '';

    const { error } = await supabase.from('appointments').insert({
      clinic_id: clinic.id,
      patient_name: patientName.trim(),
      date: selectedDate,
      time: selectedTime,
      type: 'Consulta',
      notes: notes || null,
      status: 'agendado',
      source: 'online'
    });

    if (error) {
      errorMsg = 'Erro ao agendar: ' + error.message;
      saving = false;
      return;
    }

    // Try to add as lead patient
    const { data: existingPatient } = await supabase
      .from('patients')
      .select('id')
      .eq('clinic_id', clinic.id)
      .eq('phone', patientPhone.trim())
      .maybeSingle();

    if (!existingPatient) {
      await supabase.from('patients').insert({
        clinic_id: clinic.id,
        name: patientName.trim(),
        phone: patientPhone.trim(),
        email: patientEmail.trim() || null,
        status: 'agendado',
        source: 'Agendamento Online'
      });
    }

    booked = true;
    saving = false;
  }

  function formatDateDisplay(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  function changeDate(offset) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d < today) return;
    selectedDate = d.toISOString().slice(0, 10);
    selectedTime = '';
    step = 1;
    generateSlots();
  }
</script>

<svelte:head>
  <title>{clinic?.name ? `Agendar — ${clinic.name}` : 'Agendamento Online'}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</svelte:head>

<main class="page">
  {#if loading}
    <div class="loader">
      <div class="spinner"></div>
      <p>Carregando agenda...</p>
    </div>
  {:else if notFound}
    <div class="not-found">
      <span class="nf-icon">🏥</span>
      <h1>Clínica não encontrada</h1>
      <p>O link de agendamento que você acessou não existe ou foi desativado.</p>
      <a href="/" class="btn-back">Ir para o início</a>
    </div>
  {:else if booked}
    <div class="success-state">
      <div class="success-icon">✅</div>
      <h1>Agendamento Confirmado!</h1>
      <p class="success-detail">
        <strong>{patientName}</strong>, sua consulta está marcada para:<br/>
        📅 <strong>{formatDateDisplay(selectedDate)}</strong> às <strong>{selectedTime}</strong>
      </p>
      <p class="success-clinic">Na clínica <strong>{clinic.name}</strong>{settings?.city ? ` — ${settings.city}` : ''}</p>
      <div class="success-note">
        <span>💡</span>
        <p>Você receberá uma confirmação em breve. Se precisar alterar, entre em contato diretamente com a clínica.</p>
      </div>
    </div>
  {:else}
    <div class="booking-container">
      <!-- Header -->
      <div class="booking-header">
        <div class="clinic-badge">
          <div class="clinic-avatar">{clinic.name?.[0] || '+'}</div>
          <div>
            <h2>{clinic.name}</h2>
            <p>{settings?.specialty || 'Clínica de Saúde'}{settings?.city ? ` • ${settings.city}` : ''}</p>
          </div>
        </div>
        <div class="step-indicator">
          <div class="step-dot" class:active={step >= 1}>1</div>
          <div class="step-line" class:active={step >= 2}></div>
          <div class="step-dot" class:active={step >= 2}>2</div>
          <div class="step-line" class:active={step >= 3}></div>
          <div class="step-dot" class:active={step >= 3}>3</div>
        </div>
      </div>

      <!-- Step 1: Choose Date & Time -->
      {#if step === 1}
        <div class="section">
          <h3>📅 Escolha o dia e horário</h3>
          <div class="date-nav">
            <button on:click={() => changeDate(-1)} class="nav-btn">←</button>
            <span class="date-label">{formatDateDisplay(selectedDate)}</span>
            <button on:click={() => changeDate(1)} class="nav-btn">→</button>
          </div>

          {#if availableSlots.length === 0}
            <div class="empty-slots">
              <span>😔</span>
              <p>Sem horários disponíveis nesta data. Tente outro dia.</p>
            </div>
          {:else}
            <div class="slots-grid">
              {#each availableSlots as time}
                <button class="slot-btn" class:selected={selectedTime === time} on:click={() => selectSlot(time)}>
                  {time}
                </button>
              {/each}
            </div>
          {/if}
        </div>

      <!-- Step 2: Patient Info -->
      {:else if step === 2}
        <div class="section">
          <h3>👤 Seus dados</h3>
          <p class="section-sub">Horário selecionado: <strong>{formatDateDisplay(selectedDate)}</strong> às <strong>{selectedTime}</strong> · <button class="link-btn" on:click={() => { step = 1; }}>Alterar</button></p>

          <div class="form-group">
            <label for="booking-name">Nome Completo *</label>
            <input id="booking-name" type="text" bind:value={patientName} placeholder="Seu nome completo" />
          </div>

          <div class="form-group">
            <label for="booking-phone">WhatsApp / Telefone *</label>
            <input id="booking-phone" type="tel" bind:value={patientPhone} placeholder="(11) 99999-9999" />
          </div>

          <div class="form-group">
            <label for="booking-email">Email (opcional)</label>
            <input id="booking-email" type="email" bind:value={patientEmail} placeholder="seu@email.com" />
          </div>

          <div class="form-group">
            <label for="booking-notes">Observação (opcional)</label>
            <textarea id="booking-notes" bind:value={notes} placeholder="Ex: Primeira consulta, retorno, queixa específica..." rows="3"></textarea>
          </div>

          {#if errorMsg}<p class="error">{errorMsg}</p>{/if}

          <button class="btn-primary" on:click={goToConfirm}>Continuar →</button>
        </div>

      <!-- Step 3: Confirm -->
      {:else if step === 3}
        <div class="section confirm-section">
          <h3>✅ Confirme seu agendamento</h3>

          <div class="confirm-card">
            <div class="confirm-row"><span>📅</span><div><strong>Data</strong><p>{formatDateDisplay(selectedDate)}</p></div></div>
            <div class="confirm-row"><span>🕐</span><div><strong>Horário</strong><p>{selectedTime}</p></div></div>
            <div class="confirm-row"><span>👤</span><div><strong>Paciente</strong><p>{patientName}</p></div></div>
            <div class="confirm-row"><span>📱</span><div><strong>Telefone</strong><p>{patientPhone}</p></div></div>
            {#if patientEmail}<div class="confirm-row"><span>📧</span><div><strong>Email</strong><p>{patientEmail}</p></div></div>{/if}
            {#if notes}<div class="confirm-row"><span>📝</span><div><strong>Observação</strong><p>{notes}</p></div></div>{/if}
          </div>

          {#if errorMsg}<p class="error">{errorMsg}</p>{/if}

          <div class="confirm-actions">
            <button class="btn-back-sm" on:click={() => step = 2}>← Voltar</button>
            <button class="btn-confirm" on:click={confirmBooking} disabled={saving}>
              {saving ? 'Agendando...' : 'Confirmar Agendamento 🎉'}
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <footer class="public-footer">
    <p>Powered by <a href="/">Lumia</a> — Inteligência para clínicas</p>
  </footer>
</main>

<style>
  :global(body) { margin: 0; background: #0A0A0A; }
  .page { font-family: 'Inter', sans-serif; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; color: #fff; }

  /* Loader */
  .loader { text-align: center; }
  .spinner { width: 40px; height: 40px; border: 3px solid #222; border-top-color: #E5C100; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loader p { color: #666; font-size: 0.9rem; }

  /* Not Found */
  .not-found { text-align: center; max-width: 400px; }
  .nf-icon { font-size: 4rem; display: block; margin-bottom: 1rem; }
  .not-found h1 { font-size: 1.5rem; margin: 0 0 0.5rem; }
  .not-found p { color: #888; font-size: 0.9rem; margin: 0 0 1.5rem; }
  .btn-back { background: #222; color: #fff; padding: 0.7rem 1.5rem; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 0.85rem; }

  /* Success */
  .success-state { text-align: center; max-width: 500px; }
  .success-icon { font-size: 4rem; margin-bottom: 1rem; }
  .success-state h1 { font-size: 1.8rem; margin: 0 0 1rem; font-weight: 800; }
  .success-detail { color: #ccc; font-size: 1.05rem; line-height: 1.8; margin: 0 0 0.5rem; }
  .success-clinic { color: #888; font-size: 0.9rem; margin: 0 0 1.5rem; }
  .success-note { display: flex; gap: 0.75rem; align-items: flex-start; background: #111; border: 1px solid #222; border-radius: 12px; padding: 1rem; text-align: left; }
  .success-note span { font-size: 1.2rem; }
  .success-note p { color: #888; font-size: 0.85rem; margin: 0; line-height: 1.6; }

  /* Container */
  .booking-container { width: 100%; max-width: 520px; background: #111; border: 1px solid #222; border-radius: 20px; overflow: hidden; }

  /* Header */
  .booking-header { padding: 1.5rem; border-bottom: 1px solid #1a1a1a; }
  .clinic-badge { display: flex; gap: 1rem; align-items: center; margin-bottom: 1.25rem; }
  .clinic-avatar { width: 48px; height: 48px; background: linear-gradient(135deg, #E5C100, #f7e87a); color: #000; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.3rem; flex-shrink: 0; }
  .clinic-badge h2 { margin: 0; font-size: 1.1rem; font-weight: 700; }
  .clinic-badge p { margin: 0; color: #888; font-size: 0.8rem; }

  /* Steps indicator */
  .step-indicator { display: flex; align-items: center; justify-content: center; gap: 0; }
  .step-dot { width: 28px; height: 28px; border-radius: 50%; background: #1a1a1a; border: 2px solid #333; color: #555; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; transition: all 0.3s; }
  .step-dot.active { background: #E5C100; border-color: #E5C100; color: #000; }
  .step-line { width: 40px; height: 2px; background: #222; transition: background 0.3s; }
  .step-line.active { background: #E5C100; }

  /* Section */
  .section { padding: 1.5rem; }
  .section h3 { margin: 0 0 1rem; font-size: 1.1rem; font-weight: 700; }
  .section-sub { color: #888; font-size: 0.85rem; margin: -0.5rem 0 1.25rem; }

  /* Date Nav */
  .date-nav { display: flex; align-items: center; justify-content: space-between; background: #0A0A0A; border: 1px solid #222; border-radius: 12px; padding: 0.75rem; margin-bottom: 1.25rem; }
  .date-label { color: #ccc; font-size: 0.85rem; font-weight: 600; text-transform: capitalize; }
  .nav-btn { background: #1a1a1a; border: 1px solid #333; color: #fff; width: 36px; height: 36px; border-radius: 10px; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
  .nav-btn:hover { border-color: #E5C100; color: #E5C100; }

  /* Slots Grid */
  .slots-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; }
  .slot-btn { background: #0A0A0A; border: 1px solid #222; color: #ccc; padding: 0.7rem; border-radius: 10px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .slot-btn:hover { border-color: #E5C100; color: #E5C100; }
  .slot-btn.selected { background: rgba(229, 193, 0, 0.1); border-color: #E5C100; color: #E5C100; }

  .empty-slots { text-align: center; padding: 2rem; color: #666; }
  .empty-slots span { font-size: 2rem; display: block; margin-bottom: 0.5rem; }

  /* Form */
  .form-group { margin-bottom: 1rem; }
  .form-group label { display: block; color: #888; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 6px; }
  .form-group input, .form-group textarea { width: 100%; background: #0A0A0A; border: 1px solid #222; color: #fff; border-radius: 10px; padding: 0.75rem 1rem; font-size: 0.9rem; font-family: inherit; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
  .form-group input:focus, .form-group textarea:focus { border-color: #E5C100; }
  .form-group textarea { resize: vertical; }
  .link-btn { background: none; border: none; color: #E5C100; cursor: pointer; font-size: 0.85rem; text-decoration: underline; padding: 0; }

  .error { color: #ef4444; font-size: 0.85rem; margin: 0.5rem 0 1rem; }

  .btn-primary { width: 100%; background: #E5C100; color: #000; border: none; padding: 0.9rem; border-radius: 12px; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: all 0.2s; margin-top: 0.5rem; }
  .btn-primary:hover { background: #fce141; transform: translateY(-1px); }

  /* Confirm */
  .confirm-card { background: #0A0A0A; border: 1px solid #1a1a1a; border-radius: 14px; padding: 1.25rem; margin-bottom: 1.25rem; }
  .confirm-row { display: flex; gap: 1rem; align-items: flex-start; padding: 0.5rem 0; border-bottom: 1px solid #151515; }
  .confirm-row:last-child { border-bottom: none; }
  .confirm-row span { font-size: 1.1rem; }
  .confirm-row strong { color: #999; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; display: block; }
  .confirm-row p { color: #fff; font-size: 0.9rem; margin: 2px 0 0; }

  .confirm-actions { display: flex; gap: 0.75rem; }
  .btn-back-sm { flex: 0 0 auto; background: #1a1a1a; border: 1px solid #333; color: #aaa; padding: 0.85rem 1.2rem; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: 0.2s; }
  .btn-back-sm:hover { border-color: #fff; color: #fff; }
  .btn-confirm { flex: 1; background: #E5C100; color: #000; border: none; padding: 0.85rem; border-radius: 12px; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: all 0.2s; }
  .btn-confirm:hover:not(:disabled) { background: #fce141; transform: translateY(-1px); }
  .btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Footer */
  .public-footer { margin-top: 2rem; text-align: center; }
  .public-footer p { color: #444; font-size: 0.75rem; }
  .public-footer a { color: #E5C100; text-decoration: none; font-weight: 600; }

  @media (max-width: 600px) {
    .page { padding: 1rem; }
    .slots-grid { grid-template-columns: repeat(3, 1fr); }
    .confirm-actions { flex-direction: column; }
  }
</style>
