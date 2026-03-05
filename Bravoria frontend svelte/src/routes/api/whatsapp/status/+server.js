import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function GET() {
    // Apontando direto pro IP da Oracle Cloud pra resolver imediatamente sem depender do ENV lá da nuvem Vercel.
    const ENGINE_URL = env.ENGINE_URL || 'http://147.15.103.93:3000';
    try {
        const res = await fetch(`${ENGINE_URL}/api/whatsapp/status`);
        const data = await res.json();
        return json(data);
    } catch (e) {
        return json({ success: false, error: 'Motor de IA offline. Inicie o server_node.', detail: `Tentou conectar em: ${ENGINE_URL}` }, { status: 502 });
    }
}
