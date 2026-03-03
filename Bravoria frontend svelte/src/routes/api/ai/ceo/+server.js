import { json } from '@sveltejs/kit';
import { getOpenAI } from '$lib/openai.js';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

function getSupabase() {
    return createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
}

export async function POST({ request }) {
    try {
        const { message, clinicId, userId } = await request.json();

        if (!message || !clinicId) {
            return json({ error: 'Mensagem e clinica sao obrigatorios.' }, { status: 400 });
        }

        const supabase = getSupabase();
        const openai = getOpenAI();
        const today = new Date().toISOString().slice(0, 10);
        const currentMonth = today.slice(0, 7);
        const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 7);

        // ==========================================
        // CARREGAR TUDO DO SISTEMA EM PARALELO
        // ==========================================
        const [
            patientsRes, appointmentsRes, settingsRes,
            trainingRes, postsRes, faqRes,
            recentLeadsRes, todayApptsRes
        ] = await Promise.all([
            supabase.from('patients').select('id, name, status, source, created_at').eq('clinic_id', clinicId).limit(200),
            supabase.from('appointments').select('id, date, time, type, status, patient_name').eq('clinic_id', clinicId).order('date', { ascending: false }).limit(100),
            supabase.from('clinic_settings').select('*').eq('user_id', userId).maybeSingle(),
            supabase.from('clinic_training').select('question, answer').eq('clinic_id', clinicId).limit(20),
            supabase.from('ai_posts').select('id, status').eq('clinic_id', clinicId),
            supabase.from('faq_items').select('id, status').eq('clinic_id', clinicId),
            supabase.from('patients').select('name, source, created_at').eq('clinic_id', clinicId).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()).order('created_at', { ascending: false }).limit(10),
            supabase.from('appointments').select('patient_name, time, status').eq('clinic_id', clinicId).eq('date', today).order('time')
        ]);

        const patients = patientsRes.data || [];
        const appointments = appointmentsRes.data || [];
        const settings = settingsRes.data || {};
        const training = trainingRes.data || [];
        const posts = postsRes.data || [];
        const faqItems = faqRes.data || [];
        const recentLeads = recentLeadsRes.data || [];
        const todayAppts = todayApptsRes.data || [];

        // ==========================================
        // CALCULAR METRICAS AVANCADAS
        // ==========================================
        const totalPatients = patients.length;
        const activePatients = patients.filter(p => p.status === 'ativo').length;
        const leadPatients = patients.filter(p => p.status === 'lead').length;
        const totalAppointments = appointments.length;
        const completed = appointments.filter(a => a.status === 'concluido').length;
        const noShows = appointments.filter(a => a.status === 'no-show').length;
        const noShowRate = totalAppointments > 0 ? Math.round((noShows / totalAppointments) * 100) : 0;
        const completionRate = totalAppointments > 0 ? Math.round((completed / totalAppointments) * 100) : 0;
        const upcomingAppts = appointments.filter(a => a.date >= today);

        // Metricas mensais
        const thisMonthAppts = appointments.filter(a => a.date?.startsWith(currentMonth));
        const lastMonthAppts = appointments.filter(a => a.date?.startsWith(lastMonth));
        const growthRate = lastMonthAppts.length > 0
            ? Math.round(((thisMonthAppts.length - lastMonthAppts.length) / lastMonthAppts.length) * 100)
            : thisMonthAppts.length > 0 ? 100 : 0;

        // Fontes de captacao
        const sources = {};
        patients.forEach(p => { if (p.source) sources[p.source] = (sources[p.source] || 0) + 1; });
        const sourceBreakdown = Object.entries(sources).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Nenhuma fonte';

        // Tipos de consulta mais populares
        const typeMap = {};
        appointments.forEach(a => { const t = a.type || 'Consulta'; typeMap[t] = (typeMap[t] || 0) + 1; });
        const topTypes = Object.entries(typeMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k} (${v}x)`).join(', ');

        // Agenda de hoje
        const todaySummary = todayAppts.length > 0
            ? todayAppts.map(a => `- ${a.time?.slice(0, 5)} ${a.patient_name} (${a.status})`).join('\n')
            : 'Nenhum agendamento hoje.';

        // Leads recentes
        const recentLeadsSummary = recentLeads.length > 0
            ? recentLeads.map(l => `- ${l.name} (via ${l.source || '?'})`).join('\n')
            : 'Nenhum lead novo nos ultimos 7 dias.';

        // ==========================================
        // SYSTEM PROMPT - CEREBRO ESTRATEGICO
        // ==========================================
        const systemPrompt = `Voce e o CEO VIRTUAL da plataforma LumiaOS.
Voce e o CEREBRO ESTRATEGICO da clinica - nao apenas um chatbot, mas um CONSULTOR DE NEGOCIOS PhD em Gestao de Clinicas, Marketing em Saude e Ciencia de Dados aplicada.

Voce tem ACESSO TOTAL aos dados do sistema em tempo real. Use-os para dar insights ESPECIFICOS e ACIONAVEIS.

REGRAS:
- Responda SEMPRE em portugues BR, direto e profissional
- Use os DADOS REAIS abaixo para embasar TUDO. Nunca invente numeros.
- Seja ESPECIFICO: em vez de "melhore seu marketing", diga "Voce captou 5 leads via WhatsApp e 2 via Indicacao — invista mais no WhatsApp que tem 2.5x mais conversao"
- Use emojis com parcimonia para tornar a leitura agradavel
- Respostas concisas: maximo 4-5 paragrafos
- Quando der sugestoes, ordene por IMPACTO (maior primeiro)
- Se os dados sao insuficientes, diga honestamente e sugira acoes para coletar mais

═══════════════════════════════════
DADOS DA CLINICA
═══════════════════════════════════
Nome: ${settings.clinic_name || 'Nao definido'}
Especialidade: ${settings.specialty || 'Nao definida'}
Cidade: ${settings.city || 'Nao informada'}
Tom de voz: ${settings.tone || 'Profissional'}

═══════════════════════════════════
METRICAS EM TEMPO REAL
═══════════════════════════════════
Total de pacientes cadastrados: ${totalPatients}
Pacientes ativos: ${activePatients}
Leads (nao convertidos): ${leadPatients}
Taxa de conversao Lead>Ativo: ${leadPatients > 0 ? Math.round((activePatients / (activePatients + leadPatients)) * 100) : 0}%
Fontes de captacao: ${sourceBreakdown}

Total de agendamentos: ${totalAppointments}
Agendamentos concluidos: ${completed} (${completionRate}%)
No-shows: ${noShows} (${noShowRate}%)
Agendamentos futuros: ${upcomingAppts.length}
Tipos mais populares: ${topTypes || 'N/A'}

Este mes: ${thisMonthAppts.length} agendamentos
Mes passado: ${lastMonthAppts.length} agendamentos
Crescimento: ${growthRate > 0 ? '+' : ''}${growthRate}%

Conteudo IA gerado: ${posts.length} posts (${posts.filter(p => p.status === 'approved' || p.status === 'published').length} publicados)
FAQ/Treinamento IA: ${faqItems.length} perguntas cadastradas

═══════════════════════════════════
AGENDA DE HOJE (${today})
═══════════════════════════════════
${todaySummary}

═══════════════════════════════════
LEADS RECENTES (ultimos 7 dias)
═══════════════════════════════════
${recentLeadsSummary}

═══════════════════════════════════
BASE DE CONHECIMENTO
═══════════════════════════════════
${training.length > 0 ? training.map(t => `P: ${t.question}\nR: ${t.answer}`).join('\n\n') : '(Nenhum treinamento cadastrado)'}

═══════════════════════════════════
FRAMEWORK DE ANALISE
═══════════════════════════════════
Quando o usuario perguntar algo generico como "como crescer" ou "o que melhorar", use este framework:
1. DIAGNOSTICO: O que os dados mostram? (taxa de no-show alta? poucos leads? baixa conversao?)
2. ACAO IMEDIATA: O que fazer nos proximos 7 dias?
3. ACAO ESTRATEGICA: O que mudar no proximo mes?
4. METRICA DE SUCESSO: Como medir se deu certo?

Quando o usuario perguntar sobre a agenda de hoje, mostre os agendamentos acima em formato visual e de dicas de preparacao.`;

        // ==========================================
        // CHAMAR OPENAI
        // ==========================================
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ],
            max_tokens: 1000,
            temperature: 0.7
        });

        const reply = completion.choices[0]?.message?.content || 'Desculpe, nao consegui gerar uma resposta no momento.';

        return json({ reply });

    } catch (err) {
        console.error('CEO AI error:', err);
        return json({ error: 'Erro ao consultar a IA. Verifique se a API Key esta configurada.' }, { status: 500 });
    }
}
