const { OpenAI } = require('openai');
require('dotenv').config();

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
    console.warn('⚠️ OPENAI_API_KEY NÃO CONFIGURADA NO .ENV');
}

const openai = new OpenAI({
    apiKey: apiKey || 'sk-placeholder'
});

/**
 * Função central para gerar a resposta da IA (O Cérebro da Lumia)
 * @param {Array} messages - O array de mensagens (histórico da conversa)
 * @param {String} systemPrompt - O prompt doutrinador (Regras da Clínica + FAQ)
 */
async function generateAIResponse(messages, systemPrompt) {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o', // Model mais inteligente para os Agentes PhD
            temperature: 0.3, // Menos alucinação
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ]
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('❌ Erro na OpenAI:', error.message);
        return 'Desculpe, estou enfrentando uma instabilidade técnica no momento. Pode aguardar alguns minutos e me chamar novamente?';
    }
}

module.exports = { openai, generateAIResponse };
