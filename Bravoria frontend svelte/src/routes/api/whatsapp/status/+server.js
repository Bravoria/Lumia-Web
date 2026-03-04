import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

const ENGINE_URL = env.ENGINE_URL || 'http://localhost:3000';

export async function GET() {
    try {
        const res = await fetch(`${ENGINE_URL}/api/whatsapp/status`);
        const data = await res.json();
        return json(data);
    } catch (e) {
        return json({ success: false, error: 'Motor de IA offline. Inicie o server_node.' }, { status: 502 });
    }
}
