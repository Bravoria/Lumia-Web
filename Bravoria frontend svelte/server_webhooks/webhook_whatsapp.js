import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

if (!supabaseUrl || !supabaseKey || !openaiKey) {
    console.error("ERRO: Faltam variáveis de ambiente críticas no .env!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiKey });

// ==========================================
// ENDPOINT DE WEBHOOK PARA RECEBER MENSAGENS
// ==========================================
app.post('/webhook/evolution', async (req, res) => {
    try {
        const payload = req.body;
        const messageEvent = payload.data?.message || payload;

        if (!messageEvent || !messageEvent.text) {
            return res.status(200).send('Ignorado');
        }

        const patientPhone = messageEvent.remoteJid?.split('@')[0] || messageEvent.pushName || 'Desconhecido';
        const patientMessage = messageEvent.text;
        const clinicId = req.query.clinic_id;

        if (!clinicId) {
            console.warn("Mensagem recebida mas sem clinic_id no webhook URL.");
            return res.status(200).send('Falta clinic_id');
        }

        console.log(`[WhatsApp -> IA] ${patientPhone}: ${patientMessage}`);

        // ==========================================
        // 1. VERIFICAR/CADASTRAR LEAD NO SUPABASE
        // ==========================================
        let patient = null;
        const { data: existingPatients } = await supabase
            .from('patients')
            .select('*')
            .eq('clinic_id', clinicId)
            .eq('phone', patientPhone)
            .limit(1);

        if (existingPatients && existingPatients.length > 0) {
            patient = existingPatients[0];
        } else {
            console.log(`[CRM] Cadastrando novo lead: ${patientPhone}`);
            const { data: newPatient, error: insertErr } = await supabase
                .from('patients')
                .insert({
                    clinic_id: clinicId,
                    name: messageEvent.pushName || 'Lead Sem Nome',
                    phone: patientPhone,
                    status: 'lead',
                    source: 'WhatsApp'
                })
                .select()
                .single();

            if (!insertErr && newPatient) {
                patient = newPatient;
            }
        }

        // ==========================================
        // 2. CONSULTAR TODO O CONTEXTO DO SISTEMA
        // ==========================================
        const today = new Date().toISOString().slice(0, 10);

        const [settingsRes, trainingRes, patientApptsRes, todayApptsRes] = await Promise.all([
            supabase.from('clinic_settings').select('*').eq('user_id', clinicId).maybeSingle(),
            supabase.from('faq_items').select('question, answer').eq('clinic_id', clinicId).limit(30),
            patient?.name
                ? supabase.from('appointments').select('date, time, type, status').eq('clinic_id', clinicId).eq('patient_name', patient.name).order('date', { ascending: false }).limit(5)
                : Promise.resolve({ data: [] }),
            supabase.from('appointments').select('date, time').eq('clinic_id', clinicId).gte('date', today).in('status', ['agendado', 'confirmado']).order('date').limit(30)
        ]);

        const settings = settingsRes.data || {};
        const training = trainingRes.data || [];
        const patientAppts = patientApptsRes.data || [];
        const bookedSlots = todayApptsRes.data || [];

        // Calcular horarios livres
        const startH = parseInt((settings.start_time || '09:00').split(':')[0]);
        const endH = parseInt((settings.end_time || '18:00').split(':')[0]);
        const activeDays = Array.isArray(settings.days) ? settings.days : ['seg', 'ter', 'qua', 'qui', 'sex'];
        const dayMap = { 0: 'dom', 1: 'seg', 2: 'ter', 3: 'qua', 4: 'qui', 5: 'sex', 6: 'sab' };

        function getAvailableSlots(dateStr) {
            const d = new Date(dateStr + 'T12:00:00');
            const dayKey = dayMap[d.getDay()];
            if (!activeDays.includes(dayKey)) return 'Fechado';
            const slots = [];
            for (let h = startH; h < endH; h++) {
                for (const m of ['00', '30']) {
                    const t = `${h.toString().padStart(2, '0')}:${m}`;
                    const isBooked = bookedSlots.some(b => b.date === dateStr && b.time?.slice(0, 5) === t);
                    if (!isBooked) slots.push(t);
                }
            }
            return slots.length > 0 ? slots.slice(0, 6).join(', ') + (slots.length > 6 ? ` (+${slots.length - 6} mais)` : '') : 'Lotado';
        }

        const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
        const slotsToday = getAvailableSlots(today);
        const slotsTomorrow = getAvailableSlots(tomorrowStr);

        const isReturning = patientAppts.length > 0;
        const lastAppt = patientAppts[0];
        const patientContext = isReturning
            ? `PACIENTE RECORRENTE: ${patient.name} ja agendou ${patientAppts.length}x. Ultima consulta: ${lastAppt?.date} (${lastAppt?.status}). Tipo: ${lastAppt?.type}.`
            : `LEAD NOVO: Primeiro contato de ${patient?.name || 'paciente'}. Nunca agendou antes. Priorize a conversao.`;

        // ==========================================
        // 3. SYSTEM PROMPT - CEREBRO COMPLETO
        // ==========================================
        const systemPrompt = `Voce e o LUMIA - o Sistema Central de Inteligencia da clinica "${settings.clinic_name || 'Saude'}".
Voce nao e apenas um chatbot. Voce e o CEREBRO da operacao: gerencia o CRM, a Agenda, o Pipeline de Vendas e o Atendimento.
Nivel de expertise: PhD em Gestao de Clinicas, Vendas Consultivas e Experiencia do Paciente.

INFORMACOES DA CLINICA:
Nome: ${settings.clinic_name || 'Clinica'}
Especialidade: ${settings.specialty || 'Area da Saude'}
Cidade: ${settings.city || 'Nao especificada'}
Tom de Voz: ${settings.tone || 'Humanizado, acolhedor e profissional'}
Servicos: ${Array.isArray(settings.services) ? settings.services.join(', ') : settings.services || 'Consultas gerais'}
Sobre: ${settings.about_clinic || 'Clinica focada na excelencia e experiencia do paciente.'}
Convenios: ${settings.insurances || 'Consultar'}
Diferenciais: ${settings.differentials || 'Excelencia e tecnologia.'}

CONTEXTO DESTE PACIENTE (CRM):
${patientContext}
Status no CRM: ${patient?.status || 'Desconhecido'}
Fonte de Captacao: ${patient?.source || 'WhatsApp'}

AGENDA EM TEMPO REAL:
Horarios disponiveis HOJE (${today}): ${slotsToday}
Horarios disponiveis AMANHA (${tomorrowStr}): ${slotsTomorrow}
Horario de funcionamento: ${settings.start_time || '09:00'} as ${settings.end_time || '18:00'}

INSTRUCOES OPERACIONAIS (GUARDRAILS):

1. [PROIBICAO ABSOLUTA DE DIAGNOSTICO] Voce NAO E MEDICO/DENTISTA. Jamais diagnostique, prescreva ou sugira medicamentos. Direcione: "Para avaliarmos seu caso com precisao, o ideal e uma consulta presencial."

2. [MOTOR DE CONVERSAO] Seu objetivo #1 e AGENDAR. Para leads novos, feche o agendamento em no maximo 3 mensagens. Sempre ofereca horarios reais (use a AGENDA ACIMA). Ex: "Tenho horario hoje as 14:00 ou amanha as 10:30, qual fica melhor pra voce?"

3. [PACIENTES RECORRENTES] Se e paciente que ja veio antes, seja caloroso: "Que bom ter noticias suas, {nome}! Como posso ajudar?" e sugira retorno ou check-up.

4. [POLITICA DE PRECOS] Nunca passe orcamento de procedimentos complexos. Diga: "Cada caso e unico, os materiais e tecnicas variam. Vamos marcar sua avaliacao sem compromisso?" Se a FAQ tiver preco de consulta avulsa, pode informar.

5. [EMPATIA RADICAL] Se o paciente mencionar DOR, URGENCIA ou MEDO: mude o tom, demonstre cuidado genuino e priorize encaixe. "Poxa, sinto muito! Vou priorizar um horario pra voce o mais rapido possivel."

6. [TOM WHATSAPP] Mensagens curtas. Maximo 3-4 linhas por bloco. Use *negrito* para destaques, emojis com parcimonia. NUNCA envie textao.

7. [HONESTIDADE PREMIUM] Se nao sabe: "Vou confirmar essa info com a equipe e te retorno em instantes. Enquanto isso, posso ja reservar um horario pra voce?"

8. [REGRAS DA CLINICA]
${Array.isArray(settings.rules) && settings.rules.length > 0 ? settings.rules.map(r => '- ' + r).join('\n') : '- Ser sempre solicito e cordial.'}

BASE DE CONHECIMENTO (FAQ):
${training.length > 0 ? training.map(t => `Q: ${t.question}\nA: ${t.answer}`).join('\n\n') : '(Sem perguntas cadastradas.)'}

ESTRATEGIA DE OURO:
- SE lead novo: Acolha > Responda a duvida > Ofereca horario real > Feche
- SE paciente recorrente: Reconheca > Pergunte como esta > Sugira retorno
- SE pergunta sobre preco: Valorize o servico > Explique individualidade > Convide pra avaliacao
- SE dor/urgencia: Empatia maxima > Encaixe imediato > Humanize
- SEMPRE termine com uma pergunta que avanca a conversa pro agendamento`;

        // ==========================================
        // 4. CHAMAR A OPENAI
        // ==========================================
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: patientMessage }
            ],
            temperature: 0.7,
            max_tokens: 400,
        });

        const aiResponse = completion.choices[0]?.message?.content || 'Desculpe, estou em manutencao agora. Um atendente ja vai falar com voce!';

        console.log(`[IA -> WhatsApp] ${aiResponse}`);

        // ==========================================
        // 5. DEVOLVER A MENSAGEM PARA A API DE WHATSAPP
        // ==========================================
        res.status(200).json({ success: true, aiResponse });

    } catch (err) {
        console.error('Erro no Webhook:', err.message);
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`LUMIA Webhook Server rodando na porta ${PORT}`);
});
