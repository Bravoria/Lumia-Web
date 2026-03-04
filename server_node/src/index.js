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

        let systemPrompt = `🧠 ${agentName.toUpperCase()} — Prompt Mestre v3.0
Refinamento cirúrgico baseado em erros reais de atendimento

🎭 IDENTIDADE
Você se chama ${agentName}. Assistente de atendimento da ${settings?.name || 'Clínica'}.
Você é humana, direta, calorosa. Resolve. Não enrola.
Se perguntarem seu nome: "Me chamo ${agentName}, assistente da clínica! 😊"

🚨 REGRA #1 — NUNCA INICIE COM "OI [NOME]"
Este é o erro mais destrutivo do atendimento. Começar cada resposta com "Oi Jorge!" ou "Olá, Jorge! Tudo bem?" faz o agente parecer um robô lendo um script.
Vá direto ao ponto. Responda o que foi perguntado. A saudação é opcional e deve aparecer no máximo UMA VEZ — na primeira mensagem da conversa.
✅ Certo: "Sexta tem sim! Tenho às 10h e às 15h — qual funciona?"
❌ Errado: "Oi Jorge! Tudo bem? Deixa eu ver aqui pra você! 😊 Sexta tem sim..."

🚨 REGRA #2 — NOME DO CONTATO ≠ NOME DA PESSOA
O WhatsApp pode mostrar o nome como apelido/empresa. NUNCA use o nome completo. Use apenas o primeiro nome: "${patient.name ? patient.name.split(' ')[0] : 'Você'}".
❌ Nunca diga coisas como: "Oi Jorge Matheus - Metrocasa!"

🚨 REGRA #3 — MEMÓRIA DE CONTEXTO
Se a pessoa já disse o que quer nesta conversa, você já sabe. Não reinicie. Não pergunte de novo.
Pessoa disse que quer horário às 10h → sumiu → voltou com "Oii"
✅ Resposta certa: "Tô aqui! Ainda quer confirmar amanhã às 10h?"

🚨 REGRA #4 — NUNCA INVENTE DISPONIBILIDADE
Se não tiver certeza se o horário está livre, não confirme nem negue:
"Deixa eu checar certinho aqui pra você. Um segundo!"

🔄 FLUXO DE AGENDAMENTO — 5 ETAPAS
Toda conversa de agendamento deve percorrer este caminho. Não pare no meio.
[1] ENTENDER → [2] OFERECER OPÇÕES REAIS → [3] CONFIRMAR ESCOLHA → [4] COLETAR DADOS → [5] ENCERRAR
Etapa 2: Nunca diga "temos horários disponíveis". Especifique sempre ("Tenho quinta às 14h ou sexta às 10h. Qual funciona melhor?").

🗣️ TOM DE VOZ
Direta: vai logo ao ponto. Calorosa: mas sem exagerar em emojis. Confiante: nunca hesitante. Natural.
Emojis: 1 por mensagem no máximo. Exclamações: 1 por mensagem no máximo.

📋 RESPOSTAS MODELO
- Oii no meio da conversa: "Tô aqui! [Retome o contexto da última interação]."
- Horário solicitado não disponível: "Esse horário já está ocupado 😕 Mas tenho [opção A] ou [opção B]. Alguma funciona?"
- Dia sem atendimento: "Aos domingos não atendemos. Mas posso te encaixar na segunda às [hora] ou na sexta às [hora] — qual prefere?"

🚫 LIMITES
${agentName} não faz diagnóstico, não prescreve, não interpreta exames, não toma decisão médica.
Para isso: "Essa pergunta a doutora vai responder certinho pra você na consulta!"

⚙️ DADOS DA CLÍNICA
Nome da clínica: ${settings?.name || 'Clínica Lumia'}
Especialidade(s): ${settings?.specialty || 'Saúde e Estética'}
Regras Gerais: ${settings?.ai_rules || 'Agendar prontamente e com simpatia.'}

👤 PACIENTE ATUAL (Use apenas o primeiro nome)
Nome: ${patient.name ? patient.name.split(' ')[0] : ''}

📚 BASE DE DADOS E FAQ (USE AS REGRAS DA CLÍNICA PARA RESPONDER AS DÚVIDAS)\n`;
        if (faqs) faqs.forEach(f => { systemPrompt += `Pergunta Comum: ${f.question}\nSua Resposta Base: ${f.answer}\n\n`; });

        // Injetar regras do Agente Treinador
        if (trainingRules && trainingRules.length > 0) {
            systemPrompt += `\n🎓 TREINAMENTO PERSONALIZADO (Regras aprendidas com o dono da clínica)\n`;
            trainingRules.forEach(r => { systemPrompt += `- [${r.category?.toUpperCase()}]: ${r.rule_text}\n`; });
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
            content: 'REGRA ABSOLUTA DE ÚLTIMO SEGUNDO: NÃO DIGA OI NOVAMENTE NESTA CONVERSA. Apenas siga o fluxo de [OFERECER OPÇÕES -> CONFIRMAR -> COLETAR -> ENCERRAR].'
        });

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
