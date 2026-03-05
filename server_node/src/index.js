require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importação dos serviços vitais
const { initWhatsAppEngine, sendWhatsAppMessage, getWhatsAppStatus, disconnectWhatsApp } = require('./services/whatsapp');
const { generateAIResponse } = require('./services/openai');
const { supabase } = require('./services/supabase');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send({ status: 'LumiaOS Core Engine (Baileys) 🧠 Operante', version: '2.0.0' });
});

// ==========================================
// API REST PARA O FRONTEND (SVELTE)
// ==========================================
app.get('/api/whatsapp/status', (req, res) => {
    const status = getWhatsAppStatus();
    res.json({ success: true, data: status });
});

app.post('/api/whatsapp/disconnect', async (req, res) => {
    await disconnectWhatsApp();
    res.json({ success: true, message: 'Desconectado com sucesso' });
});

app.get('/api/whatsapp/conversations', async (req, res) => {
    try {
        // Busca pacientes agrupados pelas últimas interações. Simplificado buscando os últimos que têm log.
        // Simulando listagem dos 'chats recentes'. Em caso de produção avançada faz-se um raw query via Postgres RPC.
        const { data: patients, error } = await supabase
            .from('patients')
            .select(`
                id, name, phone, status,
                chat_logs ( id, user_message, ai_message, created_at )
            `)
            .order('created_at', { ascending: false, foreignTable: 'chat_logs' })
            .limit(10, { foreignTable: 'chat_logs' })
            .order('created_at', { ascending: false })
            .limit(30);

        if (error) throw error;

        // Pós processar
        const sorted = patients.filter(p => p.chat_logs && p.chat_logs.length > 0)
            .map(p => {
                // pegar o último log
                const lastLog = p.chat_logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
                return {
                    id: p.id,
                    name: p.name,
                    phone: p.phone,
                    status: p.status,
                    lastMessage: lastLog ? (lastLog.user_message || lastLog.ai_message) : '',
                    lastMessageTime: lastLog ? lastLog.created_at : null
                }
            }).sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

        res.json({ success: true, data: sorted });
    } catch (e) {
        console.error(e);
        res.json({ success: false, error: e.message });
    }
});

app.get('/api/whatsapp/messages/:patientId', async (req, res) => {
    try {
        const { patientId } = req.params;
        const { data, error } = await supabase
            .from('chat_logs')
            .select('*')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: true })
            .limit(100);

        if (error) throw error;
        res.json({ success: true, data });
    } catch (e) {
        res.json({ success: false, error: e.message });
    }
});

// ==========================================
// PIPELINE COGNITIVO (O CEREBRO DO AGENTE)
// ==========================================
async function handleIncomingMessage(msgObj) {
    const { phoneId, phoneNumber, text, pushName } = msgObj;

    // ACHAR A CLÍNICA MATRIZ DESTE SERVIDOR
    // Numa versão multi-tenant real, associaríamos a sessão do Baileys ao ID da clínica logada.
    // Aqui assumimos a primeira clínica para testes.
    const { data: cData } = await supabase.from('clinics').select('id, name').limit(1).maybeSingle();
    let clinicId = cData ? cData.id : null;

    if (!clinicId) {
        console.log(`⚠️ Mensagem recebida de ${phoneNumber}, mas não encontrei Clínicas cadastradas no banco.`);
        return;
    }

    try {
        console.log(`\n📨 Mensagem de ${pushName} (${phoneNumber}): "${text}"`);
        let patientLog = ``;

        // 1. Tentar achar paciente no Supabase
        let { data: patient } = await supabase
            .from('patients')
            .select('id, name, status, created_at')
            .eq('clinic_id', clinicId)
            .eq('phone', phoneNumber)
            .maybeSingle();

        if (!patient) {
            patientLog = `Novo Lead Cadastrado`;
            const { data: newPatient, error: insertErr } = await supabase
                .from('patients')
                .insert({
                    clinic_id: clinicId,
                    name: pushName || 'Lead Sem Nome',
                    phone: phoneNumber
                })
                .select('id, name, created_at')
                .single();

            if (insertErr) {
                console.error('⚠️ Erro ao inserir paciente no Supabase:', insertErr);
            }

            // Fallback imediato se o banco falhar, para a IA poder responder!
            patient = newPatient || { id: 'fallback-id', name: pushName || 'Lead Sem Nome', status: 'Lead' };
        } else {
            patientLog = `Paciente Existente (${patient.status || 'Cadastrado'})`;
        }
        console.log(`   └─ CRM: ${patientLog}`);

        // 2. Montar Contexto (RAG)
        const { data: settings } = await supabase.from('clinic_settings').select('name, specialty, tone, ai_rules, agent_name').eq('id', clinicId).maybeSingle();
        const { data: faqs } = await supabase.from('faq_items').select('question, answer').eq('clinic_id', clinicId);
        const { data: trainingRules } = await supabase.from('training_rules').select('category, rule_text').eq('clinic_id', clinicId);

        const agentName = settings?.agent_name || 'Lumia';

        let systemPrompt = `🧠 ${agentName.toUpperCase()} — Prompt Mestre v4.0 (JSON OBRIGATÓRIO)
Refinamento cirúrgico para atendimento humanizado, prestativo e NUNCA focado apenas em forçar agenda.

🎭 IDENTIDADE E TOM DE VOZ
Você se chama ${agentName}, assistente de atendimento da ${settings?.name || 'Clínica'}.
Seu objetivo principal é AJUDAR, TIRAR DÚVIDAS E PASSAR SEGURANÇA. O agendamento deve ser uma consequência natural de um cliente bem atendido e com as dúvidas sanadas, NUNCA o foco desesperado da primeira interação.
Tom de voz: Direta, Calorosa (sem exagerar em emojis), Confiante e Paciente.

🚨 REGRA #1 — NUNCA INICIE COM "OI [NOME]" E SEJA PRESTATIVA
Vá direto ao ponto. Responda o que foi perguntado.
A saudação é opcional e deve aparecer no máximo UMA VEZ na primeira mensagem da conversa.
Não force a venda. Se a pessoa quer saber preço, explique. Se quer saber se dói, acalme-a. Somente depois ofereça agendamento se julgar apropriado.

🚨 REGRA #2 — NOME DO CONTATO ≠ NOME DA PESSOA
NUNCA use o nome completo. Use apenas o primeiro nome: "${patient.name ? patient.name.split(' ')[0] : 'Você'}".

🚨 REGRA #3 — MEMÓRIA DE CONTEXTO E FLUXO
Se a pessoa já disse o que quer, você já sabe. Não reinicie.
[1] Acolher e Entender a Dúvida → [2] Responder com Clareza (baseado no FAQ) → [3] Quando todas as dúvidas acabarem, oferecer Opções Reais de Agenda.

🚨 REGRA INSTITUCIONAL — NUNCA INVENTE
Se não souber, diga: "Vou verificar essa informação específica com a nossa equipe pra você."
${agentName} não faz diagnóstico, não prescreve e não opina sobre tratamentos. "A Dra. consegue te dar certeza absoluta sobre isso na avaliação!"

🔥 REGRA ABSOLUTA DE SAÍDA — JSON OBRIGATÓRIO 🔥
Você DEVE SEMPRE, SEM EXCEÇÃO, retornar sua resposta em formato JSON VÁLIDO contendo exatamente estas duas chaves:
{
  "resposta_chat": "Cadeia de texto limpa com a sua mensagem conversacional para ser enviada no WhatsApp",
  "resumo_crm": "Resumo analítico de até 6 palavras sobre a intenção atual DO PACIENTE"
}

⚙️ DADOS DA CLÍNICA
Nome da clínica: ${settings?.name || 'Clínica Lumia'}
Especialidade(s): ${settings?.specialty || 'Saúde e Estética'}
Regras Gerais: ${settings?.ai_rules || 'Agendar prontamente e com simpatia.'}

👤 PACIENTE ATUAL (Use apenas o primeiro nome)
Nome: ${patient.name ? patient.name.split(' ')[0] : ''}

📚 BASE DE DADOS E FAQ (USE AS REGRAS DA CLÍNICA PARA RESPONDER AS DÚVIDAS)\n`;
        if (faqs) faqs.forEach(f => { systemPrompt += `Pergunta Comum: ${f.question} \nSua Resposta Base: ${f.answer} \n\n`; });

        // Injetar regras do Agente Treinador
        if (trainingRules && trainingRules.length > 0) {
            systemPrompt += `\n🎓 TREINAMENTO PERSONALIZADO(Regras aprendidas com o dono da clínica) \n`;
            trainingRules.forEach(r => { systemPrompt += `- [${r.category?.toUpperCase()}]: ${r.rule_text} \n`; });
        }

        // 3. Montar Histórico (Últimas 4 interações)
        const { data: logs } = await supabase.from('chat_logs')
            .select('user_message, ai_message')
            .eq('patient_id', patient.id)
            .order('created_at', { ascending: false }).limit(4);

        const history = [];
        if (logs) {
            logs.reverse().forEach(log => {
                history.push({ role: 'user', content: log.user_message });
                history.push({ role: 'assistant', content: log.ai_message });
            });
        }

        // Lembrete Constante de Não Alucinar (Impede Amensia pós-histórico longo)
        history.push({
            role: 'system',
            content: 'REGRA ABSOLUTA DE ÚLTIMO SEGUNDO: RETORNE APENAS UM JSON VÁLIDO. CHAVES: "resposta_chat" E "resumo_crm". NÃO DIGA OI NOVAMENTE. SEJA PRESTATiva.'
        });

        history.push({ role: 'user', content: text });

        // 4. OpenAI Processando (Retorna um JSON via Schema Mode)
        console.log(`   └─ 🧠 OpenAI Processando RAG(Modo JSON)...`);
        const aiRawResponse = await generateAIResponse(history, systemPrompt);

        let respostaChat = '';
        let resumoCrm = '';

        try {
            const parsed = JSON.parse(aiRawResponse);
            respostaChat = parsed.resposta_chat || 'Desculpe, a conexão da clínica oscilou, pode repetir?';
            resumoCrm = parsed.resumo_crm || '';
        } catch (e) {
            console.error('❌ Falha ao dar Parse no JSON da OpenAI:', e);
            respostaChat = aiRawResponse; // Tenta devolver do jeito que veio em último caso
        }

        // 4.5 Salvar Resumo Analítico no CRM, caso o Lead não seja fallback
        if (resumoCrm && patient.id !== 'fallback-id') {
            await supabase.from('patients').update({ notes: resumoCrm }).eq('id', patient.id);
            console.log(`   └─ 📝 Nota de CRM da IA: [${resumoCrm}]`);
        }

        // 5. Salvar Log
        await supabase.from('chat_logs').insert({ patient_id: patient.id, user_message: text, ai_message: respostaChat });

        // 6. Devolver via Baileys
        console.log(`   └─ 📤 Disparando resposta final...`);
        await sendWhatsAppMessage(phoneId, respostaChat);
        console.log(`✅ Ciclo Completo com Sucesso!\n`);

    } catch (err) {
        console.error('❌ Erro Fatal no Pipeline AI:', err);
    }
}

// ==========================================
// STARTUP DA MÁQUINA
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🚀[LumiaOS AI Engine - BAILEYS EDITION] Servidor Web na porta ${PORT} `);

    // Dar partida no WhatsApp Local e plugar a função Recebedora
    await initWhatsAppEngine(handleIncomingMessage);
});
