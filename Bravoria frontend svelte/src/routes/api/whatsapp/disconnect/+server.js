import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export async function POST() {
    const ENGINE_URL = env.ENGINE_URL || 'http://localhost:3000';
    try {
        const res = await fetch(`${ENGINE_URL}/api/whatsapp/disconnect`, { method: 'POST' });
        const data = await res.json();
        return json(data);
    } catch (e) {
        return json({ success: false, error: 'Motor de IA offline.' }, { status: 502 });
    }
}
