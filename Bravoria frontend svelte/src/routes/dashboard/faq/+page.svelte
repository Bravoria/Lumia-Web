<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import { fade, fly } from 'svelte/transition';
  import { getClinicPlan, checkLimit } from '$lib/planGuard.js';
  import UpgradeModal from '$lib/components/UpgradeModal.svelte';

  let loading = true;
  let clinicId = null;
  let userId = null;

  // Tabs
  let activeTab = 'faq';

  // FAQ items
  let faqItems = [];
  let showFaqModal = false;
  let editingFaq = null;
  let faqForm = { question: '', answer: '', is_published: true };
  let faqSaving = false;
  let faqMsg = '';
  let faqErr = '';

  // Context da clínica (puxado de clinic_settings)
  let settings = null;
  let ctxSaving = false;
  let ctxMsg = '';

  // Campos de contexto
  let specialty = '';
  let city = '';
  let tone = 'Profissional';
  let servicesRaw = '';
  let rulesRaw = '';
  let aboutClinic = '';
  let insurancesRaw = '';
  let addressInfo = '';
  let pricingInfo = '';
  let preparationInfo = '';
  let cancellationPolicy = '';
  let teamInfo = '';
  let paymentMethods = '';
  let differentials = '';

  // Plan
  let planInfo = null;
  let showUpgrade = false;

  onMount(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;

      const { data: member } = await supabase
        .from('clinic_members')
        .select('clinic_id')
        .eq('user_id', user.id).limit(1).maybeSingle();

      clinicId = member?.clinic_id ?? null;
      if (!clinicId) return;

      planInfo = await getClinicPlan(clinicId);

      // Carregar FAQ items e settings em paralelo
      const [faqRes, settingsRes] = await Promise.all([
        supabase.from('faq_items').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false }),
        supabase.from('clinic_settings').select('*').eq('user_id', user.id).maybeSingle()
      ]);

      faqItems = faqRes.data ?? [];
      settings = settingsRes.data;

      if (settings) {
        specialty = settings.specialty || '';
        city = settings.city || '';
        tone = settings.tone || 'Profissional';
        servicesRaw = Array.isArray(settings.services) ? settings.services.join(', ') : '';
        rulesRaw = Array.isArray(settings.rules) ? settings.rules.join('\n') : '';
        aboutClinic = settings.about_clinic || '';
        insurancesRaw = settings.insurances || '';
        addressInfo = settings.address_info || '';
        pricingInfo = settings.pricing_info || '';
        preparationInfo = settings.preparation_info || '';
        cancellationPolicy = settings.cancellation_policy || '';
        teamInfo = settings.team_info || '';
        paymentMethods = settings.payment_methods || '';
        differentials = settings.differentials || '';
      }
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  });

  // ── FAQ CRUD ──
  $: faqLimit = planInfo ? checkLimit(planInfo.limits, 'max_faq', faqItems.length) : { allowed: true, max: -1 };

  function openNewFaq() {
    if (faqLimit.max !== -1 && !faqLimit.allowed) {
      showUpgrade = true;
      return;
    }
    editingFaq = null;
    faqForm = { question: '', answer: '', is_published: true };
    showFaqModal = true;
    faqErr = '';
    faqMsg = '';
  }

  function openEditFaq(item) {
    editingFaq = item;
    faqForm = { question: item.question, answer: item.answer, is_published: item.is_published };
    showFaqModal = true;
    faqErr = '';
    faqMsg = '';
  }

  async function saveFaq() {
    faqErr = ''; faqMsg = '';
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      faqErr = 'Preencha pergunta e resposta.';
      return;
    }
    faqSaving = true;

    if (editingFaq) {
      const { error } = await supabase.from('faq_items')
        .update({ question: faqForm.question.trim(), answer: faqForm.answer.trim(), is_published: faqForm.is_published })
        .eq('id', editingFaq.id);
      if (error) { faqErr = error.message; }
      else { faqMsg = 'FAQ atualizada!'; }
    } else {
      const { error } = await supabase.from('faq_items')
        .insert({ clinic_id: clinicId, question: faqForm.question.trim(), answer: faqForm.answer.trim(), is_published: faqForm.is_published });
      if (error) { faqErr = error.message; }
      else { faqMsg = 'FAQ adicionada!'; }
    }

    // Reload
    const { data } = await supabase.from('faq_items').select('*').eq('clinic_id', clinicId).order('created_at', { ascending: false });
    faqItems = data ?? [];
    faqSaving = false;
    if (!faqErr) setTimeout(() => { showFaqModal = false; faqMsg = ''; }, 800);
  }

  async function deleteFaq(id) {
    await supabase.from('faq_items').delete().eq('id', id);
    faqItems = faqItems.filter(f => f.id !== id);
  }

  // ── CONTEXTO / REGRAS ──
  async function saveContext() {
    ctxMsg = '';
    ctxSaving = true;

    const payload = {
      user_id: userId,
      specialty: specialty.trim(),
      city: city.trim(),
      tone,
      services: servicesRaw.split(',').map(s => s.trim()).filter(Boolean),
      rules: rulesRaw.split('\n').map(s => s.trim()).filter(Boolean),
      about_clinic: aboutClinic.trim(),
      insurances: insurancesRaw.trim(),
      address_info: addressInfo.trim(),
      pricing_info: pricingInfo.trim(),
      preparation_info: preparationInfo.trim(),
      cancellation_policy: cancellationPolicy.trim(),
      team_info: teamInfo.trim(),
      payment_methods: paymentMethods.trim(),
      differentials: differentials.trim()
    };

    const { error } = await supabase.from('clinic_settings').upsert(payload, { onConflict: 'user_id' });
    if (error) { ctxMsg = '❌ Erro: ' + error.message; }
    else { ctxMsg = '✅ Contexto da IA salvo!'; setTimeout(() => ctxMsg = '', 2500); }
    ctxSaving = false;
  }

  // Score de treinamento (10 campos + FAQ)
  $: trainingScore = (() => {
    let s = 0;
    const fields = [aboutClinic, servicesRaw, insurancesRaw, addressInfo, pricingInfo, preparationInfo, cancellationPolicy, teamInfo, paymentMethods, differentials];
    const filledFields = fields.filter(f => f && f.trim()).length;
    s += Math.round((filledFields / fields.length) * 70); // 70% do score
    s += Math.min(20, faqItems.length * 2); // 20% do score = FAQs
    if (rulesRaw.trim()) s += 10; // 10% = regras
    return Math.min(100, s);
  })();

  $: answeredCount = [aboutClinic, servicesRaw, insurancesRaw, addressInfo, pricingInfo, preparationInfo, cancellationPolicy, teamInfo, paymentMethods, differentials].filter(f => f && f.trim()).length;
  $: totalQuestions = 10;

  $: scoreColor = trainingScore >= 75 ? '#22C55E' : trainingScore >= 50 ? '#F59E0B' : '#EF4444';
  $: scoreLabel = trainingScore >= 75 ? 'Agente PhD' : trainingScore >= 50 ? 'Agente Intermediário' : 'Agente Iniciante';
</script>

<svelte:head><title>Treinamento da IA • Lumia</title></svelte:head>

<div class="wrap" in:fade>
  <div class="head">
    <div>
      <p class="label">TREINAMENTO DA IA</p>
      <h1>Central de Conhecimento</h1>
      <p class="sub">Ensine sua IA a atender como um especialista. Quanto mais informação, melhor ela performa.</p>
    </div>
    <div class="score-box">
      <div class="score-ring" style="--clr: {scoreColor}; --pct: {trainingScore}">
        <span>{trainingScore}</span>
      </div>
      <div class="score-info">
        <strong style="color: {scoreColor}">{scoreLabel}</strong>
        <span>Nível de treinamento</span>
      </div>
    </div>
  </div>

  {#if loading}
    <p class="muted">Carregando dados de treinamento...</p>
  {:else}
    <div class="tabs">
      <button class:active={activeTab === 'faq'} on:click={() => activeTab = 'faq'}>
        📋 Perguntas & Respostas <span class="count">{faqItems.length}</span>
      </button>
      <button class:active={activeTab === 'context'} on:click={() => activeTab = 'context'}>
        🏥 Sobre a Clínica
      </button>
      <button class:active={activeTab === 'rules'} on:click={() => activeTab = 'rules'}>
        🎯 Regras do Agente
      </button>
    </div>

    <!-- TAB: FAQ -->
    {#if activeTab === 'faq'}
      <div class="tab-content" in:fly={{ y: 10, duration: 300 }}>
        <div class="tab-header">
          <div>
            <h2>Perguntas Frequentes</h2>
            <p class="muted">A IA usa estas respostas para atender seus pacientes automaticamente.</p>
          </div>
          <button class="btn-add" on:click={openNewFaq}>
            + Nova FAQ{faqLimit.max !== -1 ? ` (${faqLimit.remaining} restantes)` : ''}
          </button>
        </div>

        {#if faqLimit.max !== -1 && !faqLimit.allowed}
          <div class="limit-banner">
            ⚠️ Limite de {faqLimit.max} FAQs no plano {planInfo?.planName}. Faça upgrade para FAQ ilimitado.
            <button class="banner-btn" on:click={() => showUpgrade = true}>Upgrade</button>
          </div>
        {/if}

        {#if faqItems.length === 0}
          <div class="empty-state">
            <span class="empty-icon">💬</span>
            <h3>Nenhuma FAQ cadastrada</h3>
            <p>Adicione perguntas que seus pacientes fazem com frequência. A IA vai usar para responder automaticamente.</p>
            <div class="suggestion-grid">
              <button class="suggestion" on:click={() => { faqForm = { question: 'Vocês aceitam plano de saúde?', answer: '', is_published: true }; showFaqModal = true; }}>
                💳 Plano de saúde?
              </button>
              <button class="suggestion" on:click={() => { faqForm = { question: 'Qual o horário de funcionamento?', answer: '', is_published: true }; showFaqModal = true; }}>
                🕐 Horário?
              </button>
              <button class="suggestion" on:click={() => { faqForm = { question: 'Como faço para agendar?', answer: '', is_published: true }; showFaqModal = true; }}>
                📅 Como agendar?
              </button>
              <button class="suggestion" on:click={() => { faqForm = { question: 'Onde fica a clínica?', answer: '', is_published: true }; showFaqModal = true; }}>
                📍 Localização?
              </button>
            </div>
          </div>
        {:else}
          <div class="faq-list">
            {#each faqItems as item, i}
              <div class="faq-card" in:fly={{ y: 10, duration: 200, delay: i * 50 }}>
                <div class="faq-header">
                  <div class="faq-q">
                    <span class="q-icon">Q</span>
                    <strong>{item.question}</strong>
                  </div>
                  <div class="faq-actions">
                    <span class="pub-tag" class:active={item.is_published}>
                      {item.is_published ? 'Ativa' : 'Rascunho'}
                    </span>
                    <button class="btn-icon" on:click={() => openEditFaq(item)}>✏️</button>
                    <button class="btn-icon danger" on:click={() => deleteFaq(item.id)}>🗑</button>
                  </div>
                </div>
                <div class="faq-a">
                  <span class="a-icon">A</span>
                  <p>{item.answer}</p>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

    <!-- TAB: CONTEXT (Questionário guiado) -->
    {:else if activeTab === 'context'}
      <div class="tab-content" in:fly={{ y: 10, duration: 300 }}>
        <div class="tab-header">
          <div>
            <h2>Ensine sua IA sobre a clínica</h2>
            <p class="muted">Responda as perguntas abaixo — quanto mais detalhes, mais inteligente a IA fica.</p>
          </div>
          <button class="btn-save" on:click={saveContext} disabled={ctxSaving}>
            {ctxSaving ? 'Salvando...' : '💾 Salvar Respostas'}
          </button>
        </div>
        {#if ctxMsg}<div class="ctx-msg">{ctxMsg}</div>{/if}

        <div class="qa-interview">
          <!-- Pergunta 1 -->
          <div class="qa-item">
            <div class="qa-question">
              <div class="ai-avatar">🤖</div>
              <div class="qa-bubble">
                <strong>Conte um pouco sobre a sua clínica.</strong>
                <span>O que faz? Qual o diferencial? Há quanto tempo atende?</span>
              </div>
            </div>
            <div class="qa-answer">
              <textarea rows="3"
                placeholder="Ex: Somos uma clínica odontológica focada em implantes e estética, atendendo há 12 anos na zona sul de São Paulo. Nosso diferencial é o atendimento humanizado e equipamentos de última geração."
                bind:value={aboutClinic}
              ></textarea>
              {#if aboutClinic.trim()}<span class="check-done">✅</span>{/if}
            </div>
          </div>

          <!-- Pergunta 2 -->
          <div class="qa-item">
            <div class="qa-question">
              <div class="ai-avatar">🤖</div>
              <div class="qa-bubble">
                <strong>Quais serviços vocês oferecem?</strong>
                <span>Liste tudo que a clínica faz — assim a IA consegue orientar os pacientes.</span>
              </div>
            </div>
            <div class="qa-answer">
              <textarea rows="2"
                placeholder="Ex: Consulta, Limpeza, Clareamento, Implante, Ortodontia, Prótese, Canal, Extração..."
                bind:value={servicesRaw}
              ></textarea>
              {#if servicesRaw.trim()}<span class="check-done">✅</span>{/if}
            </div>
          </div>

          <!-- Pergunta 3 -->
          <div class="qa-item">
            <div class="qa-question">
              <div class="ai-avatar">🤖</div>
              <div class="qa-bubble">
                <strong>Vocês aceitam plano de saúde? Quais?</strong>
                <span>Essa é a pergunta mais feita pelos pacientes. Se não aceita, diga "Particular apenas".</span>
              </div>
            </div>
            <div class="qa-answer">
              <textarea rows="2"
                placeholder="Ex: Aceitamos Amil, Bradesco Saúde, SulAmérica e Unimed. Também atendemos particular."
                bind:value={insurancesRaw}
              ></textarea>
              {#if insurancesRaw.trim()}<span class="check-done">✅</span>{/if}
            </div>
          </div>

          <!-- Pergunta 4 -->
          <div class="qa-item">
            <div class="qa-question">
              <div class="ai-avatar">🤖</div>
              <div class="qa-bubble">
                <strong>Onde fica a clínica? Como o paciente chega?</strong>
                <span>Endereço, ponto de referência, estacionamento, metrô perto...</span>
              </div>
            </div>
            <div class="qa-answer">
              <textarea rows="2"
                placeholder="Ex: Rua das Flores, 123 - Vila Nova, São Paulo. Ao lado da farmácia Drogasil. Estacionamento gratuito. 5 min do metrô Saúde."
                bind:value={addressInfo}
              ></textarea>
              {#if addressInfo.trim()}<span class="check-done">✅</span>{/if}
            </div>
          </div>

          <!-- Pergunta 5 -->
          <div class="qa-item">
            <div class="qa-question">
              <div class="ai-avatar">🤖</div>
              <div class="qa-bubble">
                <strong>Como funciona o valor das consultas?</strong>
                <span>A IA precisa saber se pode falar preço, dar faixa de valor, ou se deve encaminhar para avaliação presencial.</span>
              </div>
            </div>
            <div class="qa-answer">
              <textarea rows="2"
                placeholder="Ex: A consulta de avaliação é gratuita. Procedimentos variam de R$ 200 a R$ 8.000, dependendo do caso. Valores exatos só após avaliação presencial."
                bind:value={pricingInfo}
              ></textarea>
              {#if pricingInfo.trim()}<span class="check-done">✅</span>{/if}
            </div>
          </div>

          <!-- Pergunta 6 -->
          <div class="qa-item">
            <div class="qa-question">
              <div class="ai-avatar">🤖</div>
              <div class="qa-bubble">
                <strong>O paciente precisa de algum preparo antes da consulta?</strong>
                <span>Jejum, documentos, exames, chegada antecipada... A IA avisa automaticamente ao agendar.</span>
              </div>
            </div>
            <div class="qa-answer">
              <textarea rows="2"
                placeholder="Ex: Trazer documento com foto e carteirinha do plano. Para exames de sangue, jejum de 12h. Chegar 15 min antes da primeira consulta."
                bind:value={preparationInfo}
              ></textarea>
              {#if preparationInfo.trim()}<span class="check-done">✅</span>{/if}
            </div>
          </div>

          <!-- Pergunta 7 -->
          <div class="qa-item">
            <div class="qa-question">
              <div class="ai-avatar">🤖</div>
              <div class="qa-bubble">
                <strong>Qual a política de cancelamento ou reagendamento?</strong>
                <span>Multa? Prazo mínimo? A IA informa isso quando o paciente quer desmarcar.</span>
              </div>
            </div>
            <div class="qa-answer">
              <textarea rows="2"
                placeholder="Ex: Cancelamentos devem ser feitos com 24h de antecedência. Fora desse prazo, cobramos 50% da consulta. Reagendamentos são ilimitados."
                bind:value={cancellationPolicy}
              ></textarea>
              {#if cancellationPolicy.trim()}<span class="check-done">✅</span>{/if}
            </div>
          </div>

          <!-- Pergunta 8 -->
          <div class="qa-item">
            <div class="qa-question">
              <div class="ai-avatar">🤖</div>
              <div class="qa-bubble">
                <strong>Quem faz parte da equipe?</strong>
                <span>Nomes dos médicos/dentistas, especializações, CRM/CRO. Isso gera confiança na conversa.</span>
              </div>
            </div>
            <div class="qa-answer">
              <textarea rows="2"
                placeholder="Ex: Dr. Carlos Silva (CRO 12345) - Implantodontia. Dra. Ana Costa (CRO 67890) - Ortodontia. Equipe de 3 auxiliares."
                bind:value={teamInfo}
              ></textarea>
              {#if teamInfo.trim()}<span class="check-done">✅</span>{/if}
            </div>
          </div>

          <!-- Pergunta 9 -->
          <div class="qa-item">
            <div class="qa-question">
              <div class="ai-avatar">🤖</div>
              <div class="qa-bubble">
                <strong>Quais formas de pagamento vocês aceitam?</strong>
                <span>Cartão, Pix, parcelamento, boleto... Pacientes perguntam muito isso.</span>
              </div>
            </div>
            <div class="qa-answer">
              <textarea rows="2"
                placeholder="Ex: Pix, cartão de débito e crédito (até 12x sem juros), boleto bancário e dinheiro. Parcelamos tratamentos acima de R$ 1.000."
                bind:value={paymentMethods}
              ></textarea>
              {#if paymentMethods.trim()}<span class="check-done">✅</span>{/if}
            </div>
          </div>

          <!-- Pergunta 10 -->
          <div class="qa-item">
            <div class="qa-question">
              <div class="ai-avatar">🤖</div>
              <div class="qa-bubble">
                <strong>O que diferencia vocês da concorrência?</strong>
                <span>Tecnologia, atendimento, prêmios, anos de experiência... A IA usa isso para persuadir o paciente a agendar.</span>
              </div>
            </div>
            <div class="qa-answer">
              <textarea rows="2"
                placeholder="Ex: Scanner intraoral 3D, sedação consciente para pacientes com medo, nota 4.9 no Google com 500+ avaliações, Dr. Carlos é referência nacional em implantes."
                bind:value={differentials}
              ></textarea>
              {#if differentials.trim()}<span class="check-done">✅</span>{/if}
            </div>
          </div>

          <!-- Resumo -->
          <div class="qa-summary">
            <div class="ai-avatar">🤖</div>
            <div class="qa-bubble summary">
              <strong>{answeredCount === totalQuestions ? 'Perfeito! Tenho tudo que preciso.' : answeredCount > 0 ? `Bom progresso! ${answeredCount} de ${totalQuestions} respondidas.` : 'Preencha as respostas acima para eu poder atender seus pacientes.'}</strong>
              <span>
                {#if answeredCount === totalQuestions}
                  Todas as perguntas respondidas — estou pronta para atender como um PhD! 🎓🚀
                {:else if answeredCount >= 7}
                  Quase lá! Faltam só {totalQuestions - answeredCount}. Cada resposta me deixa mais inteligente.
                {:else}
                  Faltam {totalQuestions - answeredCount} de {totalQuestions} respostas. Quanto mais eu souber, melhor atendo!
                {/if}
              </span>
            </div>
          </div>
        </div>
      </div>

    <!-- TAB: RULES -->
    {:else if activeTab === 'rules'}
      <div class="tab-content" in:fly={{ y: 10, duration: 300 }}>
        <div class="tab-header">
          <div>
            <h2>Regras do Agente IA</h2>
            <p class="muted">Defina o comportamento e os limites do agente. A IA seguirá estas regras em todas as interações.</p>
          </div>
          <button class="btn-save" on:click={saveContext} disabled={ctxSaving}>
            {ctxSaving ? 'Salvando...' : '💾 Salvar Regras'}
          </button>
        </div>
        {#if ctxMsg}<div class="ctx-msg">{ctxMsg}</div>{/if}

        <div class="form-grid single">
          <div class="form-card">
            <h3>🎭 Tom de Voz</h3>
            <p class="hint">Como a IA deve se comunicar com seus pacientes.</p>
            <div class="tone-options">
              {#each ['Profissional', 'Humanizado', 'Direto', 'Premium'] as t}
                <button class="tone-btn" class:active={tone === t} on:click={() => tone = t}>
                  {t === 'Profissional' ? '👔' : t === 'Humanizado' ? '💛' : t === 'Direto' ? '⚡' : '✨'}
                  {t}
                </button>
              {/each}
            </div>
          </div>

          <div class="form-card full">
            <h3>📜 Regras de comportamento</h3>
            <p class="hint">Uma regra por linha. A IA vai seguir rigorosamente cada uma delas.</p>
            <textarea rows="8"
              placeholder="Exemplos:
Nunca dê diagnóstico por mensagem
Sempre pergunte o nome do paciente
Sempre ofereça agendamento quando possível
Não fale preço sem antes avaliar presencialmente
Se o paciente insistir, encaminhe para humano
Responda no máximo em 3 parágrafos"
              bind:value={rulesRaw}
            ></textarea>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>

<!-- FAQ Modal -->
{#if showFaqModal}
  <div class="modal-overlay" on:click|self={() => showFaqModal = false} transition:fade={{ duration: 150 }}>
    <div class="modal" in:fly={{ y: 30, duration: 300 }}>
      <div class="modal-head">
        <h2>{editingFaq ? 'Editar FAQ' : 'Nova FAQ'}</h2>
        <button class="close-btn" on:click={() => showFaqModal = false}>✕</button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label>Pergunta do paciente</label>
          <input placeholder="Ex: Vocês aceitam plano de saúde?" bind:value={faqForm.question} />
        </div>
        <div class="field">
          <label>Resposta da IA</label>
          <textarea rows="4" placeholder="Ex: Sim! Aceitamos Amil, Bradesco Saúde e SulAmérica. Também atendemos particular." bind:value={faqForm.answer}></textarea>
        </div>
        <label class="checkbox-row">
          <input type="checkbox" bind:checked={faqForm.is_published} />
          <span>Ativa (IA usa esta resposta no atendimento)</span>
        </label>
        {#if faqErr}<p class="msg err">{faqErr}</p>{/if}
        {#if faqMsg}<p class="msg ok">{faqMsg}</p>{/if}
        <button class="btn-main" on:click={saveFaq} disabled={faqSaving}>
          {faqSaving ? 'Salvando...' : editingFaq ? 'Salvar Alteração' : 'Adicionar FAQ'}
        </button>
      </div>
    </div>
  </div>
{/if}

<UpgradeModal bind:show={showUpgrade} feature="max_faq" currentPlan={planInfo?.planName ?? 'Starter'} requiredPlan="Pro" />

<style>
  .wrap { max-width: 1100px; margin: 0 auto; padding-bottom: 2rem; }
  .label { color: #555; letter-spacing: 3px; font-size: .72rem; text-transform: uppercase; margin: 0 0 .3rem; font-weight: 700; }
  h1 { color: #fff; font-size: 2rem; margin: 0 0 .35rem; letter-spacing: -.5px; }
  .sub { color: #777; margin: 0; font-size: .95rem; }
  .muted { color: #666; font-size: .85rem; margin: 0; }

  /* Header */
  .head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; gap: 2rem; }
  .score-box { display: flex; align-items: center; gap: 1rem; background: #141414; border: 1px solid #252525; border-radius: 16px; padding: 1rem 1.5rem; flex-shrink: 0; }
  .score-ring { width: 56px; height: 56px; border-radius: 50%; background: conic-gradient(var(--clr) calc(var(--pct) * 1%), #1A1A1E 0); display: flex; align-items: center; justify-content: center; position: relative; }
  .score-ring::before { content: ''; position: absolute; inset: 5px; background: #141414; border-radius: 50%; }
  .score-ring span { position: relative; z-index: 1; color: #fff; font-size: 1rem; font-weight: 900; }
  .score-info { display: flex; flex-direction: column; gap: 2px; }
  .score-info strong { font-size: .85rem; font-weight: 800; }
  .score-info span { font-size: .65rem; color: #555; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

  /* Tabs */
  .tabs { display: flex; gap: 4px; background: #0F0F11; border: 1px solid #1A1A1E; border-radius: 12px; padding: 4px; margin-bottom: 1.5rem; }
  .tabs button { flex: 1; background: transparent; border: none; color: #666; padding: .75rem 1rem; border-radius: 10px; font-weight: 700; font-size: .85rem; cursor: pointer; transition: all 0.2s; }
  .tabs button.active { background: #16161A; color: #fff; }
  .tabs button:hover:not(.active) { color: #aaa; }
  .count { background: #1A1A1E; padding: 2px 7px; border-radius: 10px; font-size: .7rem; margin-left: 4px; }

  /* Tab content */
  .tab-content { display: flex; flex-direction: column; gap: 1.25rem; }
  .tab-header { display: flex; justify-content: space-between; align-items: flex-start; }
  h2 { color: #fff; font-size: 1.15rem; margin: 0 0 4px; font-weight: 800; }

  .btn-add, .btn-save { background: #fff; color: #000; border: none; padding: .65rem 1.2rem; border-radius: 10px; font-weight: 700; font-size: .85rem; cursor: pointer; transition: 0.2s; white-space: nowrap; }
  .btn-add:hover, .btn-save:hover { background: #E5C100; transform: translateY(-1px); }
  .btn-save:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  /* Limit Banner */
  .limit-banner { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); color: #F59E0B; padding: .8rem 1.25rem; border-radius: 10px; font-size: .85rem; font-weight: 600; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .banner-btn { background: #E5C100; color: #000; border: none; padding: .5rem 1rem; border-radius: 8px; font-weight: 700; font-size: .8rem; cursor: pointer; transition: 0.2s; }
  .banner-btn:hover { background: #fce141; }

  /* Empty state */
  .empty-state { text-align: center; padding: 3rem 2rem; background: #141414; border: 1px solid #252525; border-radius: 16px; }
  .empty-icon { font-size: 2.5rem; display: block; margin-bottom: 1rem; }
  .empty-state h3 { color: #fff; margin: 0 0 .5rem; font-size: 1.1rem; }
  .empty-state p { color: #666; font-size: .9rem; margin: 0 0 1.5rem; max-width: 400px; margin-left: auto; margin-right: auto; line-height: 1.5; }
  .suggestion-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: .75rem; }
  .suggestion { background: #0F0F11; border: 1px solid #1A1A1E; color: #999; padding: .6rem 1rem; border-radius: 10px; font-size: .8rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
  .suggestion:hover { border-color: #E5C100; color: #E5C100; }

  /* FAQ List */
  .faq-list { display: flex; flex-direction: column; gap: .75rem; }
  .faq-card { background: #141414; border: 1px solid #252525; border-radius: 14px; padding: 1.25rem; transition: 0.2s; }
  .faq-card:hover { border-color: #333; }
  .faq-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: .75rem; }
  .faq-q { display: flex; gap: 10px; align-items: flex-start; flex: 1; }
  .q-icon, .a-icon { flex-shrink: 0; width: 22px; height: 22px; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: .7rem; font-weight: 900; }
  .q-icon { background: #E5C100; color: #000; }
  .a-icon { background: #1A1A1E; color: #888; }
  .faq-q strong { color: #fff; font-size: .9rem; line-height: 1.4; }
  .faq-a { display: flex; gap: 10px; align-items: flex-start; }
  .faq-a p { color: #888; font-size: .85rem; line-height: 1.5; margin: 0; }
  .faq-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .pub-tag { font-size: .65rem; font-weight: 800; padding: 3px 8px; border-radius: 5px; background: #1A1A1E; color: #555; }
  .pub-tag.active { background: rgba(34,197,94,0.1); color: #22C55E; }
  .btn-icon { background: none; border: none; cursor: pointer; font-size: .85rem; padding: 4px; border-radius: 4px; transition: 0.2s; }
  .btn-icon:hover { background: #1A1A1E; }
  .btn-icon.danger:hover { background: rgba(239,68,68,0.1); }

  /* Context Form (legacy - kept for rules tab) */
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .form-grid.single { grid-template-columns: 1fr; }
  .form-card { background: #141414; border: 1px solid #252525; border-radius: 14px; padding: 1.5rem; }
  .form-card.full { grid-column: 1 / -1; }
  .form-card h3 { color: #fff; font-size: 1rem; margin: 0 0 .4rem; font-weight: 800; }
  .hint { color: #555; font-size: .8rem; margin: 0 0 1rem; line-height: 1.4; }
  .ctx-msg { padding: .8rem 1rem; border-radius: 10px; font-size: .85rem; font-weight: 600; background: rgba(229,193,0,0.08); color: #E5C100; border: 1px solid rgba(229,193,0,0.2); }

  /* Conversational Q&A Interview */
  .qa-interview { display: flex; flex-direction: column; gap: 1.5rem; }
  .qa-item { display: flex; flex-direction: column; gap: .75rem; }

  .qa-question { display: flex; gap: .75rem; align-items: flex-start; }
  .ai-avatar { width: 36px; height: 36px; background: #1A1A1E; border: 1px solid #252525; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
  .qa-bubble { background: #141414; border: 1px solid #252525; border-radius: 0 14px 14px 14px; padding: 1rem 1.25rem; flex: 1; }
  .qa-bubble strong { display: block; color: #fff; font-size: .95rem; margin-bottom: .3rem; line-height: 1.4; }
  .qa-bubble span { color: #666; font-size: .8rem; line-height: 1.4; }
  .qa-bubble.summary { border-color: rgba(229,193,0,0.2); background: rgba(229,193,0,0.03); }
  .qa-bubble.summary strong { color: #E5C100; }

  .qa-answer { margin-left: 48px; position: relative; }
  .qa-answer textarea { border-left: 3px solid #252525; border-radius: 0 10px 10px 10px; transition: border-color 0.2s; }
  .qa-answer textarea:focus { border-left-color: #E5C100; }
  .check-done { position: absolute; top: .75rem; right: .75rem; font-size: .9rem; }

  .qa-summary { display: flex; gap: .75rem; align-items: flex-start; padding-top: .5rem; border-top: 1px solid #1A1A1E; }

  textarea, input[type="text"], input:not([type]) {
    width: 100%; background: #0A0A0A; border: 1px solid #2a2a2a; border-radius: 10px;
    padding: .85rem 1rem; color: #fff; font-size: .9rem; outline: none; resize: vertical;
    font-family: 'Inter', sans-serif; box-sizing: border-box;
  }
  textarea:focus, input:focus { border-color: #E5C100; }

  /* Tone selector */
  .tone-options { display: flex; gap: .75rem; flex-wrap: wrap; }
  .tone-btn { background: #0A0A0A; border: 1px solid #2a2a2a; color: #888; padding: .75rem 1.25rem; border-radius: 10px; font-size: .9rem; font-weight: 600; cursor: pointer; transition: 0.2s; }
  .tone-btn.active { border-color: #E5C100; color: #E5C100; background: rgba(229,193,0,0.05); }
  .tone-btn:hover:not(.active) { border-color: #444; color: #ccc; }

  /* Modal */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; backdrop-filter: blur(4px); }
  .modal { background: #141414; border: 1px solid #252525; border-radius: 20px; width: 100%; max-width: 520px; }
  .modal-head { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 1.5rem 1rem; border-bottom: 1px solid #1A1A1E; }
  .modal-head h2 { margin: 0; }
  .close-btn { background: none; border: none; color: #666; font-size: 1.2rem; cursor: pointer; } .close-btn:hover { color: #fff; }
  .modal-body { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
  .field { display: flex; flex-direction: column; gap: .4rem; }
  .field label { color: #888; font-size: .7rem; text-transform: uppercase; letter-spacing: 0.8px; font-weight: 700; }
  .checkbox-row { display: flex; align-items: center; gap: 8px; color: #888; font-size: .85rem; cursor: pointer; }
  .checkbox-row input { accent-color: #E5C100; }
  .msg { font-size: .85rem; margin: 0; } .msg.err { color: #ff6b6b; } .msg.ok { color: #22C55E; }
  .btn-main { background: #fff; color: #000; border: none; padding: .85rem; border-radius: 10px; font-weight: 700; cursor: pointer; transition: 0.2s; font-size: .95rem; }
  .btn-main:hover { background: #E5C100; } .btn-main:disabled { opacity: 0.5; cursor: not-allowed; }

  @media (max-width: 768px) {
    .head { flex-direction: column; }
    .tabs { flex-direction: column; }
    .tab-header { flex-direction: column; gap: 1rem; }
    .btn-add, .btn-save { width: 100%; text-align: center; }
    .form-grid { grid-template-columns: 1fr; }
    .faq-header { flex-direction: column; }
    .limit-banner { flex-direction: column; text-align: center; }
  }
</style>