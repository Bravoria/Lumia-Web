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
            const { data: newPatient } = await supabase
                .from('patients')
                .insert({
                    clinic_id: clinicId,
                    name: pushName || 'Lead Sem Nome',
                    phone: phoneNumber,
                    status: 'Lead',
                    observations: 'Cadastrado automaticamente pela Lumia AI via WhatsApp.'
                })
                .select('id, name, status, created_at')
                .single();

            patient = newPatient;
        } else {
            patientLog = `Paciente Existente (${patient.status})`;
        }
        console.log(`   └─ CRM: ${patientLog}`);

        // 2. Montar Contexto (RAG)
        const { data: settings } = await supabase.from('clinic_settings').select('name, specialty, tone, ai_rules').eq('id', clinicId).maybeSingle();
        const { data: faqs } = await supabase.from('faq_items').select('question, answer').eq('clinic_id', clinicId);

        let systemPrompt = `Você é uma Recepcionista e Consultora Virtual para clínicas (Método "PhD"). Seja persuasiva e humana.
Nome da clínica: ${settings?.name || 'Clínica Lumia'}
Especialidade: ${settings?.specialty || 'Saúde'}
Regras: ${settings?.ai_rules || 'Foco em agendar avaliação presencial.'}
Paciente atual: ${patient.name}

=== FAQ EXATO DA CLÍNICA ===\n`;
        if (faqs) faqs.forEach(f => { systemPrompt += `P: ${f.question}\nR: ${f.answer}\n\n`; });

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
        history.push({ role: 'user', content: text });

        // 4. OpenAI Processando
        console.log(`   └─ 🧠 OpenAI Processando RAG...`);
        const aiResponse = await generateAIResponse(history, systemPrompt);

        // 5. Salvar Log
        await supabase.from('chat_logs').insert({ patient_id: patient.id, user_message: text, ai_message: aiResponse });

        // 6. Devolver via Baileys
        console.log(`   └─ 📤 Disparando resposta final...`);
        await sendWhatsAppMessage(phoneId, aiResponse);
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
    console.log(`🚀 [LumiaOS AI Engine - BAILEYS EDITION] Servidor Web na porta ${PORT}`);

    // Dar partida no WhatsApp Local e plugar a função Recebedora
    await initWhatsAppEngine(handleIncomingMessage);
});
