import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function POST() {
    // Apontando direto pro IP da Oracle Cloud pra resolver imediatamente pra deslogar também
    const ENGINE_URL = env.ENGINE_URL || 'http://147.15.103.93:3000';
    try {
        const res = await fetch(`${ENGINE_URL}/api/whatsapp/disconnect`, { method: 'POST' });
        const data = await res.json();
        return json(data);
    } catch (e) {
        return json({ success: false, error: 'O motor está offline.', detail: `Falha no IP: ${ENGINE_URL}` }, { status: 502 });
    }
}
