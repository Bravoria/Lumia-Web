<!-- src/routes/+error.svelte -->
<script>
  import { dev } from '$app/environment';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';

  export let error;  // <- vem do SvelteKit
  export let status; // <- vem do SvelteKit

  const pick = (e, k) => (e && typeof e === 'object' && k in e ? e[k] : undefined);

  function safeStringify(e) {
    try {
      if (!e) return '';
      if (e instanceof Error) {
        const obj = {};
        for (const k of Object.getOwnPropertyNames(e)) obj[k] = e[k];
        return JSON.stringify(obj, null, 2);
      }
      if (typeof e === 'object') return JSON.stringify(e, null, 2);
      return String(e);
    } catch {
      return String(e);
    }
  }

  $: statusCode = status ?? $page.status ?? 500;

  // tenta “puxar” o máximo de info possível
  $: message =
    error?.message ||
    pick(error, 'error_description') ||
    pick(error, 'details') ||
    pick(error, 'hint') ||
    String(error || 'Internal Error');

  $: raw = safeStringify(error);

  $: path = $page?.url?.pathname || '';
</script>

<svelte:head>
  <title>{statusCode} - Erro</title>
</svelte:head>

<main class="wrap">
  <div class="card">
    <h1>- Erro</h1>

    <div class="box">
      <div class="row">
        <span class="pill">{statusCode}</span>
        <span class="msg">{message}</span>
      </div>

      {#if dev}
        <div class="meta">
          <div><b>Rota:</b> {path}</div>
        </div>

        {#if raw}
          <h3>Detalhes (RAW)</h3>
          <pre class="stack">{raw}</pre>
        {/if}
      {/if}
    </div>

    <div class="actions">
      <button class="btn" on:click={() => history.back()}>Voltar</button>
      <button class="btn primary" on:click={() => goto('/dashboard')}>Ir pro Dashboard</button>
      <button class="btn" on:click={() => location.reload()}>Recarregar</button>
    </div>

    <p class="hint">
      Se continuar “genérico”, o stack completo vai aparecer no TERMINAL onde roda o <code>npm run dev</code>.
    </p>
  </div>
</main>

<style>
  .wrap{
    min-height: 100vh;
    background:#111;
    display:flex;
    align-items:flex-start;
    justify-content:center;
    padding: 2rem 1.2rem;
    color:#fff;
  }
  .card{
    width: min(980px, 100%);
    background: rgba(255,255,255,.03);
    border:1px solid #262626;
    border-radius:16px;
    padding: 1.2rem;
  }
  h1{ margin:0 0 1rem; font-size: 1.6rem; letter-spacing:-.4px; }
  .box{
    border:1px solid #2a2a2a;
    background: #0f0f0f;
    border-radius: 12px;
    padding: .9rem;
    min-height: 64px;
  }
  .row{ display:flex; gap:.7rem; align-items:center; flex-wrap:wrap; }
  .pill{
    padding:.18rem .55rem;
    border-radius: 999px;
    border:1px solid #333;
    color:#ddd;
    font-weight:800;
    font-size:.78rem;
  }
  .msg{ color:#fff; font-size:.95rem; }
  .meta{ margin-top:.6rem; color:#999; font-size:.85rem; }
  h3{ margin: 1rem 0 .4rem; font-size:.95rem; color:#ddd; }
  .stack{
    margin:0;
    padding:.9rem;
    border-radius: 10px;
    border: 1px solid #242424;
    background:#0b0b0b;
    color:#cfcfcf;
    white-space: pre-wrap;
    font-family: ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
    font-size:.85rem;
  }
  .actions{ display:flex; gap:.6rem; flex-wrap:wrap; margin-top: 1rem; }
  .btn{
    padding:.5rem .9rem;
    background:transparent;
    color:#ddd;
    border:1px solid #303030;
    border-radius: 10px;
    cursor:pointer;
    font-weight:800;
    font-size:.85rem;
  }
  .btn:hover{ border-color:#fff; color:#fff; }
  .btn.primary{ background:#E5C100; border-color:#E5C100; color:#111; }
  .hint{ margin: .9rem 0 0; color:#777; font-size:.9rem; }
  code{ color:#ddd; }
</style>