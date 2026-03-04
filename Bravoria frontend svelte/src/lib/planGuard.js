// src/lib/planGuard.js
// Helper para verificar limites do plano da clínica
import { supabase } from '$lib/supabase.js';

// Cache local para evitar queries repetidas
let _cache = { clinicId: null, plan: null, limits: null, ts: 0 };
const CACHE_TTL = 60000; // 1 minuto

/**
 * Busca o plano e limites da clínica do usuário atual
 * Retorna: { planId, planName, limits, status }
 */
export async function getClinicPlan(clinicId) {
    // Usar cache se válido
    const now = Date.now();
    if (_cache.clinicId === clinicId && _cache.plan && (now - _cache.ts) < CACHE_TTL) {
        return _cache.plan;
    }

    // Defaults (plano starter)
    const defaults = {
        planId: 'starter',
        planName: 'Starter',
        status: 'active',
        limits: {
            max_users: 1,
            max_patients: 50,
            max_appointments_month: 30,
            max_faq: 5,
            ceo_virtual: false,
            online_booking: false,
            whatsapp_ai: false
        }
    };

    // Business Ilimitado (Master)
    const businessUnlimited = {
        planId: 'business',
        planName: 'Business VIP',
        status: 'active',
        limits: {
            max_users: -1,
            max_patients: -1,
            max_appointments_month: -1,
            max_faq: -1,
            ceo_virtual: true,
            online_booking: true,
            whatsapp_ai: true,
            content_ai: true
        }
    };

    try {
        // 1. Buscar o owner da clínica para checar override de plano
        const { data: memberData } = await supabase
            .from('clinic_members')
            .select('user_id')
            .eq('clinic_id', clinicId)
            .eq('role', 'owner')
            .maybeSingle();

        if (memberData?.user_id) {
            const { data: pOverride } = await supabase
                .from('clinic_settings')
                .select('plan_type')
                .eq('user_id', memberData.user_id)
                .maybeSingle();

            if (pOverride?.plan_type === 'business_lifetime') {
                _cache = { clinicId, plan: businessUnlimited, ts: now };
                return businessUnlimited;
            }
        }

        // 2. SE NÃO TIVER OVERRIDE, BUSCA SUBSCRIPTION
        const { data: sub } = await supabase
            .from('subscriptions')
            .select('plan_id, status')
            .eq('clinic_id', clinicId)
            .maybeSingle();

        if (!sub) {
            _cache = { clinicId, plan: defaults, ts: now };
            return defaults;
        }

        const { data: plan } = await supabase
            .from('plans')
            .select('name, limits')
            .eq('id', sub.plan_id)
            .maybeSingle();

        const result = {
            planId: sub.plan_id,
            planName: plan?.name ?? sub.plan_id,
            status: sub.status,
            limits: plan?.limits ?? defaults.limits
        };

        _cache = { clinicId, plan: result, ts: now };
        return result;
    } catch (e) {
        console.error('Erro ao buscar plano:', e);
        _cache = { clinicId, plan: defaults, ts: now };
        return defaults;
    }
}

/**
 * Verifica se uma feature está disponível no plano
 * Features: 'ceo_virtual', 'online_booking', 'whatsapp_ai'
 */
export function canAccess(limits, feature) {
    return limits?.[feature] === true;
}

/**
 * Verifica se atingiu o limite de contagem
 * Retorna { allowed, current, max, remaining }
 * max = -1 significa ilimitado
 */
export function checkLimit(limits, limitKey, currentCount) {
    const max = limits?.[limitKey] ?? 0;
    if (max === -1) {
        return { allowed: true, current: currentCount, max: -1, remaining: Infinity };
    }
    return {
        allowed: currentCount < max,
        current: currentCount,
        max,
        remaining: Math.max(0, max - currentCount)
    };
}

/**
 * Limpa o cache (chamar após upgrade de plano)
 */
export function clearPlanCache() {
    _cache = { clinicId: null, plan: null, limits: null, ts: 0 };
}
