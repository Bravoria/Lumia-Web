<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';

    onMount(() => {
        // Redireciona a página antiga do pipeline para a nova experiência unificada
        goto('/dashboard/whatsapp?tab=pipeline');
    });
</script>

<div class="flex items-center justify-center h-full w-full">
    <div class="animate-pulse flex flex-col items-center">
        <div class="w-8 h-8 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mb-4"></div>
        <p class="text-zinc-400 text-sm">Carregando o novo CRM Kanban...</p>
    </div>
</div>
