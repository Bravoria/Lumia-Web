<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { user, logout } from '$lib/auth.js';
  import { supabase } from '$lib/supabase.js';

  let currentUser = null;

  user.subscribe((value) => {
    currentUser = value;
  });

  onMount(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      user.set(session.user);
    }
  });
</script>

<slot />

<style>
  /* Importação direta da Inter cravada no Layout Mestre */
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* Aplicação do Design System: Elite Monochrome Industrial */
  :global(body) {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background-color: #0F0F11; /* Cinza espacial profundo do OS 2.0 */
    color: #FFFFFF;
    
    /* Padrão Apple/Silicon Valley para nitidez em monitores retina */
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Garante que inputs e botões não usem a fonte padrão do navegador */
  :global(input, button, textarea, select) {
    font-family: inherit;
  }

  :global(a) {
    text-decoration: none;
    color: inherit;
  }

  /* Nova seleção de texto elegante (removido o amarelo antigo) */
  :global(::selection) {
    background: rgba(255, 255, 255, 0.15);
    color: #FFFFFF;
  }
</style>