import OpenAI from 'openai';
import { env } from '$env/dynamic/private';

export function getOpenAI() {
    return new OpenAI({
        apiKey: env.OPENAI_API_KEY || 'sk-not-configured'
    });
}
