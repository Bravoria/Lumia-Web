<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    goto('/#pricing');
  });
</script>

<p style="color: #666; text-align: center; padding: 4rem;">Redirecionando para os planos...</p>
