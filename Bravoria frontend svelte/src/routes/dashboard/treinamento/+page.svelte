<!-- src/routes/dashboard/treinamento/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import { goto } from '$app/navigation';

  let clinicId = null;
  let isLoading = true;

  // Chat state
  let messages = [];
  let userInput = '';
  let isSending = false;
  let chatContainer;

  // Rules state
  let savedRules = [];
  let totalRulesSaved = 0;

  async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { goto('/login'); return; }

    const { data: member } = await supabase
      .from('clinic_members')
      .select('clinic_id')
      .eq('user_id', user.id)
      .limit(1).maybeSingle();

    if (!member?.clinic_id) { isLoading = false; return; }
    clinicId = member.clinic_id;

    // Carregar regras existentes
    await loadRules();

    // Mensagem inicial do treinador
    messages = [{
      role: 'assistant',
      content: 'Oi! 👋 Sou o treinador da sua assistente virtual. Vou te fazer algumas perguntas rápidas pra deixar ela afiada pro atendimento.\n\nBora? Me conta: qual o nome da sua clínica e sua especialidade?'
    }];

    isLoading = false;
  }

  async function loadRules() {
    if (!clinicId) return;
    const { data } = await supabase
      .from('training_rules')
      .select('*')
      .eq('clinic_id', clinicId)
      .order('created_at', { ascending: false });
    savedRules = data || [];
  }

  async function sendMessage() {
    if (!userInput.trim() || isSending) return;

    const text = userInput.trim();
    userInput = '';
    messages = [...messages, { role: 'user', content: text }];
    isSending = true;
    scrollToBottom();

    try {
      const res = await fetch('/api/ai/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinicId,
          messages: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await res.json();

      if (data.error) {
        messages = [...messages, { role: 'assistant', content: '❌ Erro: ' + data.error }];
      } else {
        messages = [...messages, { role: 'assistant', content: data.reply }];
        if (data.savedRules > 0) {
          totalRulesSaved += data.savedRules;
          await loadRules();
        }
      }
    } catch (e) {
      messages = [...messages, { role: 'assistant', content: '❌ Erro de conexão. Tente novamente.' }];
    }

    isSending = false;
    scrollToBottom();
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 50);
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function deleteRule(id) {
    await supabase.from('training_rules').delete().eq('id', id);
    await loadRules();
  }

  function resetChat() {
    messages = [{
      role: 'assistant',
      content: 'Chat reiniciado! 🔄 Vamos continuar treinando. O que mais você quer ensinar pra sua assistente?'
    }];
    totalRulesSaved = 0;
  }

  const categoryLabels = {
    identity: '🏥 Identidade',
    schedule: '🕐 Horários',
    always_do: '✅ Sempre Fazer',
    never_do: '🚫 Nunca Fazer',
    faq: '❓ FAQ',
    location: '📍 Localização',
    services: '💼 Serviços',
    payments: '💳 Pagamentos',
    general: '📋 Geral'
  };

  onMount(init);
</script>

<main class="wrap">
  <div class="top">
    <div>
      <p class="label">TREINAMENTO IA</p>
      <h1>Treine sua assistente</h1>
      <p class="muted">Converse com o Agente Treinador. Ele vai entender seu negócio e configurar a IA automaticamente.</p>
    </div>
    {#if totalRulesSaved > 0}
      <div class="badge">🎓 {totalRulesSaved} regra(s) salvas nesta sessão</div>
    {/if}
  </div>

  {#if isLoading}
    <p class="muted">Carregando...</p>
  {:else}
    <div class="grid">
      <!-- Chat Panel -->
      <section class="card chat-card">
        <div class="chat-header">
          <span>🧠 Agente Treinador</span>
          <button class="btn-reset" on:click={resetChat}>🔄 Reiniciar</button>
        </div>

        <div class="chat-messages" bind:this={chatContainer}>
          {#each messages as msg}
            <div class="msg {msg.role}">
              <div class="msg-avatar">{msg.role === 'assistant' ? '🧠' : '👤'}</div>
              <div class="msg-bubble">{msg.content}</div>
            </div>
          {/each}
          {#if isSending}
            <div class="msg assistant">
              <div class="msg-avatar">🧠</div>
              <div class="msg-bubble typing">Pensando<span class="dots">...</span></div>
            </div>
          {/if}
        </div>

        <div class="chat-input">
          <textarea
            bind:value={userInput}
            on:keydown={handleKeydown}
            placeholder="Descreva sua clínica, regras, horários..."
            rows="2"
            disabled={isSending}
          ></textarea>
          <button class="btn-send" on:click={sendMessage} disabled={isSending || !userInput.trim()}>
            {isSending ? '⏳' : '➤'}
          </button>
        </div>
      </section>

      <!-- Rules Panel -->
      <section class="card rules-card">
        <h2>📋 Regras Aprendidas ({savedRules.length})</h2>
        <p class="muted small">Regras geradas automaticamente pelo treinador. Você pode excluir qualquer uma.</p>

        {#if savedRules.length === 0}
          <div class="empty-state">
            <p>Nenhuma regra ainda. Converse com o treinador para começar!</p>
          </div>
        {:else}
          <div class="rules-list">
            {#each savedRules as rule}
              <div class="rule-item">
                <div class="rule-header">
                  <span class="rule-cat">{categoryLabels[rule.category] || '📋 Geral'}</span>
                  <button class="btn-del" on:click={() => deleteRule(rule.id)}>✕</button>
                </div>
                <p class="rule-text">{rule.rule_text}</p>
              </div>
            {/each}
          </div>
        {/if}
      </section>
    </div>
  {/if}
</main>

<style>
  .wrap { max-width: 1200px; margin: 0 auto; padding: 2rem; }
  .label { font-size: .72rem; text-transform: uppercase; letter-spacing: 2px; color: #555; margin-bottom: .5rem; font-weight: 700; }
  h1 { color: #fff; font-size: 2rem; font-weight: 900; margin: 0 0 .35rem; letter-spacing: -.8px; }
  .muted { color: #666; margin: 0; }
  .small { font-size: .85rem; margin-top: .5rem; }

  .top { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
  .badge { background: rgba(229,193,0,.1); color: #E5C100; padding: .5rem 1rem; border-radius: 10px; font-size: .8rem; font-weight: 700; border: 1px solid rgba(229,193,0,.2); }

  .grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 1.25rem; min-height: 600px; }

  .card { background: #141414; border: 1px solid #252525; border-radius: 16px; transition: border-color 0.2s; }
  .card:hover { border-color: #333; }

  /* Chat */
  .chat-card { display: flex; flex-direction: column; overflow: hidden; }
  .chat-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-bottom: 1px solid #222; font-weight: 800; color: #fff; font-size: .9rem; }
  .btn-reset { background: none; border: 1px solid #333; color: #888; padding: .35rem .75rem; border-radius: 8px; font-size: .75rem; cursor: pointer; font-weight: 600; transition: 0.2s; }
  .btn-reset:hover { border-color: #E5C100; color: #E5C100; }

  .chat-messages { flex: 1; overflow-y: auto; padding: 1.25rem; display: flex; flex-direction: column; gap: .75rem; }

  .msg { display: flex; gap: .6rem; align-items: flex-start; }
  .msg.user { flex-direction: row-reverse; }
  .msg-avatar { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: .9rem; flex-shrink: 0; background: #1a1a1e; border: 1px solid #2a2a2a; }
  .msg-bubble { padding: .75rem 1rem; border-radius: 14px; font-size: .88rem; line-height: 1.5; max-width: 85%; white-space: pre-wrap; }
  .msg.assistant .msg-bubble { background: #1a1a1e; color: #ddd; border: 1px solid #2a2a2a; }
  .msg.user .msg-bubble { background: #E5C100; color: #000; font-weight: 500; }

  .typing { color: #888; }
  .dots { animation: blink 1.2s infinite; }
  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

  .chat-input { display: flex; gap: .5rem; padding: 1rem 1.25rem; border-top: 1px solid #222; background: #111; }
  .chat-input textarea { flex: 1; background: #0A0A0A; border: 1px solid #2a2a2a; border-radius: 10px; padding: .7rem 1rem; color: #fff; font-size: .9rem; outline: none; resize: none; font-family: 'Inter', sans-serif; transition: border-color 0.2s; }
  .chat-input textarea:focus { border-color: #E5C100; }
  .btn-send { width: 44px; height: 44px; border-radius: 10px; border: none; background: #E5C100; color: #000; font-size: 1.1rem; font-weight: 900; cursor: pointer; transition: 0.2s; flex-shrink: 0; }
  .btn-send:hover { background: #fce141; transform: translateY(-1px); }
  .btn-send:disabled { opacity: .4; cursor: not-allowed; transform: none; }

  /* Rules */
  .rules-card { padding: 1.25rem; overflow-y: auto; }
  h2 { color: #fff; font-size: 1rem; margin: 0 0 .25rem; font-weight: 800; }

  .empty-state { text-align: center; padding: 3rem 1rem; color: #444; }
  .rules-list { display: flex; flex-direction: column; gap: .6rem; margin-top: 1rem; }
  .rule-item { background: #0e0e0e; border: 1px solid #222; border-radius: 12px; padding: .85rem 1rem; transition: border-color 0.2s; }
  .rule-item:hover { border-color: #333; }
  .rule-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: .5rem; }
  .rule-cat { font-size: .7rem; font-weight: 700; color: #E5C100; text-transform: uppercase; letter-spacing: .5px; }
  .btn-del { background: none; border: none; color: #555; cursor: pointer; font-size: .8rem; transition: 0.2s; padding: .2rem .4rem; border-radius: 4px; }
  .btn-del:hover { color: #EF4444; background: rgba(239,68,68,.1); }
  .rule-text { color: #bbb; font-size: .82rem; margin: 0; line-height: 1.5; }

  @media (max-width: 900px) {
    .wrap { padding: 1.5rem; }
    .grid { grid-template-columns: 1fr; }
    .top { flex-direction: column; }
  }
</style>
