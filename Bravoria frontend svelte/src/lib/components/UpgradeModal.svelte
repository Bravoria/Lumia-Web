<script>
  import { fade, fly } from 'svelte/transition';

  export let show = false;
  export let feature = '';
  export let currentPlan = 'Starter';
  export let requiredPlan = 'Pro';

  // Descrições das features
  const featureLabels = {
    ceo_virtual: 'CEO Virtual com IA',
    whatsapp_ai: 'WhatsApp com Agente IA 24h',
    online_booking: 'Agendamento Online',
    max_patients: 'Pacientes ilimitados',
    max_appointments_month: 'Agendamentos ilimitados',
    max_faq: 'FAQ ilimitado'
  };

  const planFeatures = {
    pro: [
      'Pacientes e agendamentos ilimitados',
      'CEO Virtual com IA',
      'Agendamento online',
      'FAQ ilimitado',
      'Relatórios avançados'
    ],
    business: [
      'Tudo do Pro',
      'WhatsApp com agente IA 24h',
      'Pipeline com automações',
      'Suporte prioritário',
      'Onboarding dedicado'
    ]
  };

  const planPrices = {
    pro: { monthly: 'R$ 297', annual: 'R$ 247' },
    business: { monthly: 'R$ 797', annual: 'R$ 647' }
  };

  $: targetPlan = requiredPlan.toLowerCase();
  $: price = planPrices[targetPlan] ?? planPrices.pro;
  $: features = planFeatures[targetPlan] ?? planFeatures.pro;
  $: featureLabel = featureLabels[feature] ?? feature;
</script>

{#if show}
  <div class="overlay" on:click|self={() => show = false} transition:fade={{ duration: 150 }}>
    <div class="modal" in:fly={{ y: 30, duration: 300 }}>
      <button class="close-btn" on:click={() => show = false}>✕</button>

      <div class="modal-icon">🔒</div>
      <h2>Recurso exclusivo do plano {requiredPlan}</h2>
      <p class="modal-desc">
        <strong>{featureLabel}</strong> não está disponível no plano {currentPlan}. 
        Faça upgrade para desbloquear.
      </p>

      <div class="plan-card">
        <div class="plan-header">
          <h3>Plano {requiredPlan}</h3>
          <div class="plan-price">
            <span class="price-main">{price.monthly}</span>
            <span class="price-period">/mês</span>
          </div>
          <span class="price-annual">ou {price.annual}/mês no anual</span>
        </div>

        <ul class="feature-list">
          {#each features as f}
            <li>✓ {f}</li>
          {/each}
        </ul>
      </div>

      <div class="modal-actions">
        <button class="btn-upgrade" on:click={() => { /* TODO: integrar com Stripe */ }}>
          Fazer Upgrade para {requiredPlan} 🚀
        </button>
        <button class="btn-later" on:click={() => show = false}>Agora não</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.8);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; padding: 1rem; backdrop-filter: blur(4px);
  }

  .modal {
    background: #141414; border: 1px solid #252525; border-radius: 24px;
    padding: 2.5rem; width: 100%; max-width: 460px; position: relative;
    text-align: center;
  }

  .close-btn {
    position: absolute; top: 1rem; right: 1rem;
    background: none; border: none; color: #666; font-size: 1.2rem; cursor: pointer;
  }
  .close-btn:hover { color: #fff; }

  .modal-icon { font-size: 3rem; margin-bottom: 1rem; }

  h2 {
    color: #fff; font-size: 1.3rem; font-weight: 800;
    margin: 0 0 0.75rem; letter-spacing: -0.5px;
  }

  .modal-desc {
    color: #888; font-size: 0.9rem; line-height: 1.6;
    margin: 0 0 1.5rem;
  }
  .modal-desc strong { color: #E5C100; }

  .plan-card {
    background: #0A0A0A; border: 1px solid #252525; border-radius: 16px;
    padding: 1.5rem; margin-bottom: 1.5rem; text-align: left;
  }

  .plan-header { text-align: center; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid #1A1A1E; }
  .plan-header h3 { color: #E5C100; font-size: 1rem; margin: 0 0 0.5rem; text-transform: uppercase; letter-spacing: 1px; }
  .price-main { color: #fff; font-size: 2rem; font-weight: 900; letter-spacing: -0.05em; }
  .price-period { color: #555; font-size: 0.9rem; font-weight: 600; }
  .price-annual { color: #555; font-size: 0.75rem; display: block; margin-top: 4px; }

  .feature-list {
    list-style: none; padding: 0; margin: 0;
    display: flex; flex-direction: column; gap: 0.6rem;
  }
  .feature-list li {
    color: #aaa; font-size: 0.85rem; font-weight: 500;
    display: flex; align-items: center; gap: 8px;
  }

  .modal-actions { display: flex; flex-direction: column; gap: 0.75rem; }

  .btn-upgrade {
    width: 100%; padding: 1rem; background: #E5C100; color: #000;
    border: none; border-radius: 12px; font-size: 1rem; font-weight: 700;
    cursor: pointer; transition: all 0.2s;
  }
  .btn-upgrade:hover { background: #fce141; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(229,193,0,0.2); }

  .btn-later {
    background: transparent; border: none; color: #555;
    font-size: 0.85rem; cursor: pointer; padding: 0.5rem;
  }
  .btn-later:hover { color: #888; }
</style>
