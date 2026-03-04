import { json } from '@sveltejs/kit';
import { getOpenAI } from '$lib/openai.js';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

function getSupabase() {
    // Usar service role key para bypass do RLS (API server-side)
    return createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY);
}

const TRAINER_PROMPT = `Você é o AGENTE TREINADOR da plataforma LumiaOS.
Seu trabalho é CONVERSAR com o dono da clínica de forma natural e extrair TODAS as informações necessárias para treinar o agente de atendimento WhatsApp dele.

🎯 SEU OBJETIVO:
Através de uma conversa leve e simpática, descubra:
1. Nome da clínica e especialidade
2. Nome do(a) profissional principal
3. Endereço e como chegar
4. Horários de funcionamento  
5. Serviços oferecidos e valores (se puder compartilhar)
6. Convênios aceitos
7. Regras especiais (ex: "nunca fale preço por WhatsApp", "sempre peça avaliação")
8. Dúvidas mais comuns dos pacientes (FAQ)
9. Tom de voz preferido (formal, descontraído, etc)
10. Coisas que a assistente NUNCA deve fazer

🗣️ COMO CONVERSAR:
- Seja simpático e direto. Faça uma pergunta por vez.
- Use linguagem informal brasileira.
- Quando receber uma resposta, confirme que entendeu e siga para o próximo tópico.
- Não faça todas as perguntas de uma vez. Vá gradualmente.
- Começa assim: "Oi! 👋 Sou o treinador da sua assistente virtual. Vou te fazer algumas perguntas rápidas pra deixar ela afiada pro atendimento. Bora? Me conta: qual o nome da sua clínica e sua especialidade?"

📋 QUANDO TIVER INFORMAÇÃO SUFICIENTE:
Quando já tiver coletado pelo menos 5 informações importantes, gere um bloco JSON no final da MESMA MENSAGEM com as regras extraídas. Use EXATAMENTE este formato:

---TRAINING_DATA---
{
  "rules": [
    { "category": "identity", "text": "A clínica se chama [nome] e é especializada em [área]" },
    { "category": "schedule", "text": "Horário de funcionamento: [dias e horas]" },
    { "category": "always_do", "text": "Sempre oferecer avaliação gratuita" },
    { "category": "never_do", "text": "Nunca informar preço sem avaliação" },
    { "category": "faq", "text": "Pergunta: [X] / Resposta: [Y]" }
  ]
}
---END_TRAINING_DATA---

Categorias válidas: identity, schedule, always_do, never_do, faq, location, services, payments

IMPORTANTE: Continue conversando após gerar o JSON. Pergunte se quer adicionar mais algo.`;

export async function POST({ request }) {
    try {
        const { messages, clinicId } = await request.json();

        if (!messages || !clinicId) {
            return json({ error: 'Mensagens e clinicId são obrigatórios.' }, { status: 400 });
        }

        const openai = getOpenAI();
        const supabase = getSupabase();

        // Chamar OpenAI com o prompt do Treinador
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: TRAINER_PROMPT },
                ...messages
            ],
            max_tokens: 1200,
            temperature: 0.7
        });

        const reply = completion.choices[0]?.message?.content || 'Desculpe, tive um problema. Pode repetir?';

        // Verificar se tem dados de treinamento na resposta
        const trainingMatch = reply.match(/---TRAINING_DATA---([\s\S]*?)---END_TRAINING_DATA---/);
        let savedRules = 0;

        if (trainingMatch) {
            try {
                const trainingData = JSON.parse(trainingMatch[1].trim());
                if (trainingData.rules && Array.isArray(trainingData.rules)) {
                    const rulesToInsert = trainingData.rules.map(r => ({
                        clinic_id: clinicId,
                        category: r.category || 'general',
                        rule_text: r.text,
                        source: 'trainer_agent'
                    }));

                    const { error } = await supabase.from('training_rules').insert(rulesToInsert);
                    if (!error) savedRules = rulesToInsert.length;
                }
            } catch (e) {
                console.error('Erro ao parsear training data:', e);
            }
        }

        // Limpar o JSON da resposta antes de enviar pro frontend
        const cleanReply = reply.replace(/---TRAINING_DATA---[\s\S]*?---END_TRAINING_DATA---/, '').trim();

        return json({ reply: cleanReply, savedRules });

    } catch (err) {
        console.error('Trainer AI error:', err);
        return json({ error: 'Erro ao consultar a IA treinadora.' }, { status: 500 });
    }
}
