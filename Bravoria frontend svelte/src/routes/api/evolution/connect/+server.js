import { json } from '@sveltejs/kit';

export async function POST({ request, url }) {
    try {
        const payload = await request.json();
        const { clinicId } = payload;

        if (!clinicId) {
            return json({ success: false, error: 'clinicId é obrigatório' }, { status: 400 });
        }

        const EVOLUTION_URL = process.env.VITE_EVOLUTION_API_URL;
        const EVOLUTION_KEY = process.env.VITE_EVOLUTION_GLOBAL_KEY;

        if (!EVOLUTION_URL || !EVOLUTION_KEY) {
            console.warn('Variáveis VITE_EVOLUTION não encontradas no ambiente.');
            return json({
                success: false,
                error: 'Faltam credenciais da Evolution no servidor (Environment Variables).'
            }, { status: 500 });
        }

        // 1. Criar a Instância (Nome = clinicId) 
        // Obs: Se já existir ele retorna o QR Code da mesma forma ou precisaremos gerar novo token.
        const createRes = await fetch(`${EVOLUTION_URL}/instance/create`, {
            method: 'POST',
            headers: {
                'apikey': EVOLUTION_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                instanceName: clinicId,
                qrcode: true, // Já pedir o QR code de cara
                integration: "WHATSAPP-BAILEYS"
            })
        });

        const data = await createRes.json();

        if (createRes.ok || data.status === 'success') {
            return json({
                success: true,
                base64: data.qrcode?.base64 || data.qrcode // Depende da versão da Evolution
            });
        }

        // 2. Se a Instância já existir, vamos apenas puxar o Connect(QR Code)
        if (createRes.status === 403 || data.error?.includes('already exists')) {
            const connectRes = await fetch(`${EVOLUTION_URL}/instance/connect/${clinicId}`, {
                method: 'GET',
                headers: { 'apikey': EVOLUTION_KEY }
            });
            const connectData = await connectRes.json();
            return json({
                success: true,
                base64: connectData.base64 || connectData.qrcode,
                instance: connectData.instance
            });
        }

        return json({ success: false, error: data.response || 'Erro desconhecido na Evolution' }, { status: 500 });

    } catch (err) {
        console.error('API Evolution Connect Error:', err);
        return json({ success: false, error: err.message }, { status: 500 });
    }
}
