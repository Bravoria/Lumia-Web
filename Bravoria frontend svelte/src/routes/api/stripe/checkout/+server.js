import { json } from '@sveltejs/kit';
import { stripe } from '$lib/stripe';
import { supabase } from '$lib/supabase'; // Wait, server-side supabase needs service role or standard user token. For this MVP, we can just pass clinic_id in metadata.
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

export async function POST({ request, url }) {
    try {
        const { plan, clinicId, userEmail } = await request.json();

        if (!clinicId) {
            return json({ error: 'Clinic ID is required' }, { status: 400 });
        }

        // Determine prices based on plan
        const unitAmount = plan === 'pro' ? 29700 : 79700; // in cents
        const productName = plan === 'pro' ? 'Plano Pro' : 'Plano Business';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: userEmail || undefined,
            line_items: [
                {
                    price_data: {
                        currency: 'brl',
                        product_data: {
                            name: productName,
                            description: `Assinatura Mensal - LumiaOS ${productName}`
                        },
                        unit_amount: unitAmount,
                        recurring: {
                            interval: 'month'
                        }
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${url.origin}/dashboard/conta?success=true`,
            cancel_url: `${url.origin}/dashboard/conta?canceled=true`,
            client_reference_id: clinicId, // Keep clinicId reference
            metadata: {
                clinic_id: clinicId,
                plan: plan
            }
        });

        return json({ url: session.url });
    } catch (err) {
        console.error('Stripe checkout error:', err);
        return json({ error: err.message }, { status: 500 });
    }
}
