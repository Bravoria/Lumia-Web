import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' }); // Lê as variáveis da raiz Svelte (onde estão SUPABASE e OPENAI)

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
// 1. ENDPOINT DE WEBHOOK PARA RECEBER MENSAGENS (Ex: Evolution API)
// ==========================================
app.post('/webhook/evolution', async (req, res) => {
    try {
        const payload = req.body;

        // 1.1: Extração básica dependendo do payload da API (aqui genérico)
        // Se for da Evolution API, costuma vir req.body.data.message
        const messageEvent = payload.data?.message || payload;

        // Ignora status de leitura, etc, foca na mensagem
        if (!messageEvent || !messageEvent.text) {
            return res.status(200).send('Ignorado');
        }

        const patientPhone = messageEvent.remoteJid?.split('@')[0] || messageEvent.pushName || 'Desconhecido';
        const patientMessage = messageEvent.text;
        const clinicId = req.query.clinic_id; // Passado no endpoint configurado na API (Ex: /webhook/evolution?clinic_id=XXX)

        if (!clinicId) {
            console.warn("Mensagem recebida mas sem clinic_id no webhook URL.");
            return res.status(200).send('Falta clinic_id');
        }

        console.log(`[WhatsApp -> IA] ${patientPhone}: ${patientMessage}`);

        // ==========================================
        // 2. VERIFICAR/CADASTRAR LEAD NO SUPABASE
        // ==========================================
        let patient = null;
        const { data: existingPatients, error: searchError } = await supabase
            .from('patients')
            .select('*')
            .eq('clinic_id', clinicId)
            .eq('phone', patientPhone)
            .limit(1);

        if (existingPatients && existingPatients.length > 0) {
            patient = existingPatients[0];
        } else {
            console.log(`[CRM] Cadastrando novo lead: ${patientPhone}`);
            // Insere Lead no Kanban Pipeline
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
        // 3. CONSULTAR CONTEXTO E FAQ PARA A IA
        // ==========================================
        const [settingsRes, trainingRes] = await Promise.all([
            supabase.from('clinic_settings').select('*').eq('user_id', clinicId).maybeSingle(),
            supabase.from('faq_items').select('question, answer').eq('clinic_id', clinicId).limit(30)
        ]);

        const settings = settingsRes.data || {};
        const training = trainingRes.data || [];

        const systemPrompt = `Você é o Concierge Virtual Oficial de Atendimento da clínica "${settings.clinic_name || 'Saúde'}".
Seu papel não é apenas de um robô, mas de um(a) recepcionista nível sênior (PhD em atendimento ao cliente), altamente capacitado(a) em vendas, empatia e conversão de agendamentos.

INFORMAÇÕES DA CLÍNICA:
Especialidade: ${settings.specialty || 'Área da Saúde'}
Cidade/Local: ${settings.city || 'Não especificada'}
Tom de Voz Exigido: ${settings.tone || 'Humanizado, acolhedor e profissional'}
Serviços Prestados: ${Array.isArray(settings.services) ? settings.services.join(', ') : settings.services || 'Consulte a recepção.'}
Sobre a Clínica: ${settings.about_clinic || 'Somos focados na melhor experiência e saúde dos nossos pacientes.'}
Convênios e Pagamentos: ${settings.insurances || 'Informação não cadastrada'} / ${settings.payment_methods || 'Consulte os métodos na avaliação.'}
Diferenciais (Por que escolher a clínica): ${settings.differentials || 'Excelência e tecnologia.'}

REGRAS ESTÓICAS DO ATENDIMENTO (GUARDRAILS CLÍNICOS E COMERCIAIS):
1. [PROIBIÇÃO ABSOLUTA DE DIAGNÓSTICO]: Você é um assistente, NÃO É MÉDICO OU DENTISTA. Jamais afirme que o paciente tem uma doença ou sugira medicamentos. Sempre oriente: "Para entender seu caso corretamente, o ideal é avaliarmos em consulta."
2. [CONVERSÃO E AGENDAMENTO]: O seu **objetivo final** na conversa é sempre guiar o paciente educadamente para o AGENDAMENTO. Termine suas respostas (quando fizer sentido) com uma pergunta que incentiva o avanço. Ex: "Podemos encontrar um horário para sua avaliação esta semana?" ou "Gostaria de agendar para avaliarmos isso de pertinho?"
3. [POLÍTICA DE PREÇOS]: Na área da saúde (CFM/CFO), não se costuma passar orçamentos completos sem avaliação clínica. Se o paciente perguntar o preço de um procedimento (ex: Implante, Faceta, Cirurgia), explique com extrema educação que "Cada paciente é único e os materiais variam", sugerindo imediatamente o agendamento de uma avaliação ou consulta inicial. Se na aba Base de Dados constar preços de consultas, você pode informá-las.
4. [EMPATIA RADICAL]: Demonstre preocupação legítima. Se o paciente disser que está com dor, demonstre urgência e priorize o encontro presencial. Ex: "Poxa, sinto muito que esteja com dor! Vamos tentar um encaixe para te ajudar o mais rápido possível."
5. [TOM E LINGUAGEM]: Natural, curto, sem usar blocos de textos gigantes. Comporte-se como um humano no WhatsApp. Divida os pensamentos e use *negrito* para destacar coisas importantes, e emojis (com parcimônia) para dar cor à frase.
6. [REGRAS PESSOAIS DA CLÍNICA]: 
${Array.isArray(settings.rules) && settings.rules.length > 0 ? settings.rules.map(r => '- ' + r).join('\n') : '- Seja solicito sempre.'}

BASE DE DADOS EXATA (MEMÓRIA DA CLÍNICA):
Sempre baseie-se estritamente nestas informações fornecidas pelos diretores:
${training.length > 0 ? training.map(t => `Q: ${t.question}\nA: ${t.answer}`).join('\n\n') : '- Sem dados adicionais. Responda com base no contexto geral.'}

DICA FINAL DE OURO: Se você não sabe a resposta, seja honesto de forma Premium: "Olha, essa informação mais específica eu vou precisar confirmar com o Dr(a) ou com a gerência. Mas já posso adiantar seu agendamento para...", NUNCA INVENTE UM HORÁRIO OU VALOR.`;

        // ==========================================
        // 4. CHAMAR A OPENAI PARA GERAR A RESPOSTA
        // ==========================================
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                // Em um cenário real, você puxaria as últimas mensagens do Supabase para ter histórico de contexto
                { role: 'user', content: patientMessage }
            ],
            temperature: 0.7,
            max_tokens: 300,
        });

        const aiResponse = completion.choices[0]?.message?.content || 'Desculpe, estou em manutenção agora. Um atendente já vai falar com você!';

        console.log(`[IA -> WhatsApp] ${aiResponse}`);

        // ==========================================
        // 5. DEVOLVER A MENSAGEM PARA A API DE WHATSAPP (Ex: Evolution API)
        // ==========================================
        // Em produção, aqui você faria um POST (axios/fetch) para:
        // https://sua-evolution-api.com/message/sendText/INSTANCE_NAME
        // body: { "number": patientPhone, "text": aiResponse }

        // Por enquanto, enviamos um 200 OK para o webhook não estourar timeout
        res.status(200).json({ success: true, aiResponse });

    } catch (err) {
        console.error('Erro no Webhook:', err.message);
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🤖 LumiaOS Webhook Server rodando na porta ${PORT}`);
});
