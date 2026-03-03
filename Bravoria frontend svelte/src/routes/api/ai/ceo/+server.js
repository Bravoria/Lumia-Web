import { json } from '@sveltejs/kit';
import { getOpenAI } from '$lib/openai.js';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

function getSupabase() {
    return createClient(
        env.VITE_SUPABASE_URL,
        env.VITE_SUPABASE_ANON_KEY
    );
}

export async function POST({ request }) {
    try {
        const { message, clinicId, userId } = await request.json();

        if (!message || !clinicId) {
            return json({ error: 'Mensagem e clínica são obrigatórios.' }, { status: 400 });
        }

        const supabase = getSupabase();
        const openai = getOpenAI();

        const [patientsRes, appointmentsRes, settingsRes, trainingRes] = await Promise.all([
            supabase.from('patients').select('id, name, status, source').eq('clinic_id', clinicId).limit(50),
            supabase.from('appointments').select('id, date, time, type, status').eq('clinic_id', clinicId).order('date', { ascending: false }).limit(30),
            supabase.from('clinic_settings').select('*').eq('user_id', userId).maybeSingle(),
            supabase.from('clinic_training').select('question, answer').eq('clinic_id', clinicId).limit(20)
        ]);

        const patients = patientsRes.data || [];
        const appointments = appointmentsRes.data || [];
        const settings = settingsRes.data || {};
        const training = trainingRes.data || [];

        const totalPatients = patients.length;
        const activePatients = patients.filter(p => p.status === 'ativo').length;
        const leadPatients = patients.filter(p => p.status === 'lead').length;
        const totalAppointments = appointments.length;
        const upcomingAppointments = appointments.filter(a => new Date(a.date) >= new Date()).length;

        const sources = {};
        patients.forEach(p => { if (p.source) sources[p.source] = (sources[p.source] || 0) + 1; });
        const sourceBreakdown = Object.entries(sources).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Nenhuma fonte registrada';

        const systemPrompt = `Você é o CEO Virtual da plataforma LumiaOS — um conselheiro estratégico de negócios especializado em clínicas de saúde, estéticas e consultórios médicos.

REGRAS IMPORTANTES:
- Responda SEMPRE em português brasileiro, de forma direta, empática e profissional.
- Seja específico e use os dados reais fornecidos abaixo para embasar suas análises.
- Não invente dados. Se não tiver informações suficientes, diga honestamente.
- Use emojis ocasionalmente para tornar a leitura mais agradável (sem exagero).
- Foque em insights acionáveis: o que a clínica pode fazer AGORA para melhorar.
- Mantenha respostas concisas (máximo 3-4 parágrafos).

DADOS DA CLÍNICA:
- Especialidade: ${settings.specialty || 'Não definida'}
- Cidade: ${settings.city || 'Não informada'}
- Tom de voz: ${settings.tone || 'Profissional'}
- Total de pacientes cadastrados: ${totalPatients}
- Pacientes ativos: ${activePatients}
- Leads (novos contatos): ${leadPatients}
- Fontes de captação: ${sourceBreakdown}
- Total de agendamentos registrados: ${totalAppointments}
- Agendamentos futuros: ${upcomingAppointments}
- Perguntas de treinamento da IA cadastradas: ${training.length}

${training.length > 0 ? `BASE DE CONHECIMENTO DA CLÍNICA:\n${training.map(t => `P: ${t.question}\nR: ${t.answer}`).join('\n\n')}` : ''}

Quando o usuário fizer perguntas genéricas como "como posso crescer" ou "o que melhorar", use os dados acima para dar respostas personalizadas e específicas à realidade da clínica dele.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ],
            max_tokens: 800,
            temperature: 0.7
        });

        const reply = completion.choices[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta no momento.';

        return json({ reply });

    } catch (err) {
        console.error('CEO AI error:', err);
        return json({ error: 'Erro ao consultar a IA. Verifique se a API Key está configurada.' }, { status: 500 });
    }
}
