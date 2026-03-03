import { json } from '@sveltejs/kit';
import { openai } from '$lib/openai.js';
import { createClient } from '@supabase/supabase-js';
import { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } from '$env/static/private';

function getSupabase() {
    return createClient(
        import.meta.env.VITE_SUPABASE_URL || VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY || VITE_SUPABASE_ANON_KEY
    );
}

export async function POST({ request }) {
    try {
        const { topic, format, clinicId, userId } = await request.json();

        if (!topic || !clinicId) {
            return json({ error: 'Tópico e clínica são obrigatórios.' }, { status: 400 });
        }

        const supabase = getSupabase();

        // Fetch clinic settings and training data for personalization
        const [settingsRes, trainingRes] = await Promise.all([
            supabase.from('clinic_settings').select('specialty, tone, services, clinic_name').eq('user_id', userId).maybeSingle(),
            supabase.from('clinic_training').select('question, answer').eq('clinic_id', clinicId).limit(10)
        ]);

        const settings = settingsRes.data || {};
        const training = trainingRes.data || [];

        const formatLabels = {
            instagram: 'Post para Instagram (imagem + legenda)',
            stories: 'Série de Stories (3-5 slides sequenciais)',
            reels: 'Script de Reels/TikTok (roteiro 30-60 segundos)',
            blog: 'Artigo para Blog (texto longo + SEO)'
        };

        const toneInstructions = {
            'Profissional': 'Use linguagem técnica mas acessível, com embasamento.',
            'Humanizado': 'Seja acolhedor, empático e próximo do paciente.',
            'Direto': 'Seja objetivo, claro e sem rodeios.',
            'Premium': 'Use sofisticação, exclusividade e cuidado nos detalhes.'
        };

        const systemPrompt = `Você é um especialista em marketing digital para clínicas de saúde. Você cria conteúdo profissional, engajante e que gera resultados reais.

INFORMAÇÕES DA CLÍNICA:
- Nome: ${settings.clinic_name || 'Clínica'}
- Especialidade: ${settings.specialty || 'Saúde'}
- Tom de voz: ${settings.tone || 'Profissional'}
- Serviços: ${settings.services || 'Não informados'}
${toneInstructions[settings.tone] ? `- Instrução de tom: ${toneInstructions[settings.tone]}` : ''}

${training.length > 0 ? `CONTEXTO ADICIONAL DA CLÍNICA (use para personalizar):\n${training.slice(0, 5).map(t => `• ${t.question}: ${t.answer}`).join('\n')}` : ''}

REGRAS:
- Responda SEMPRE em português brasileiro.
- O conteúdo deve ser adaptado à especialidade "${settings.specialty || 'saúde'}".
- Não use termos genéricos demais. Personalize ao máximo.
- Inclua sempre um Call-to-Action (CTA) para agendamento.
- Use emojis de forma estratégica (sem exagero).

Você DEVE retornar a resposta EXCLUSIVAMENTE em formato JSON válido com esta estrutura exata:
{
  "idea": "Ideia central do conteúdo em 1-2 frases",
  "hook": "Frase de gancho poderosa para capturar atenção nos primeiros 3 segundos",
  "visual": "Descrição detalhada da sugestão visual (imagem, vídeo, layout)",
  "copy": "Legenda/texto completo pronto para publicar, com CTA",
  "hashtags": "#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5 #hashtag6"
}

NÃO inclua nada fora do JSON. Apenas o JSON puro.`;

        const userMessage = `Crie um conteúdo no formato "${formatLabels[format] || format}" sobre o tema: "${topic}"`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage }
            ],
            max_tokens: 1000,
            temperature: 0.8,
            response_format: { type: 'json_object' }
        });

        const raw = completion.choices[0]?.message?.content || '{}';

        let result;
        try {
            result = JSON.parse(raw);
        } catch {
            result = {
                idea: 'Erro ao interpretar a resposta da IA.',
                hook: '',
                visual: '',
                copy: raw,
                hashtags: ''
            };
        }

        return json({
            idea: result.idea || '',
            hook: result.hook || '',
            visual: result.visual || '',
            copy: result.copy || '',
            hashtags: result.hashtags || ''
        });

    } catch (err) {
        console.error('Content AI error:', err);
        return json({ error: 'Erro ao gerar conteúdo. Verifique se a API Key está configurada.' }, { status: 500 });
    }
}
