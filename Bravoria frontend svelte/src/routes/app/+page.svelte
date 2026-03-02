<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { supabase } from '$lib/supabase.js';

  onMount(async () => {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user) {
      goto('/dashboard');
    } else {
      goto('/login');
    }
  });
</script>

<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#555;font-size:0.9rem;">
  Redirecionando...
</div>