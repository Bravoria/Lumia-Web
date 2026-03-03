import { json } from '@sveltejs/kit';
import { getStripe } from '$lib/stripe';
import { env } from '$env/dynamic/private';
import { supabase } from '$lib/supabase';

export async function POST({ request }) {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');
    const stripe = getStripe();

    let event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return json({ error: err.message }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const clinicId = session.client_reference_id || session.metadata.clinic_id;
        const plan = session.metadata?.plan || 'pro';
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        if (clinicId) {
            const { error } = await supabase
                .from('subscriptions')
                .upsert({
                    clinic_id: clinicId,
                    plan: plan,
                    status: 'active',
                    stripe_customer_id: customerId,
                    stripe_subscription_id: subscriptionId,
                    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }, { onConflict: 'clinic_id' });

            if (error) {
                console.error('Error updating subscription in Supabase:', error);
            } else {
                console.log(`Successfully upgraded clinic ${clinicId} to ${plan}`);
            }
        }
    }

    if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;
    }

    return json({ received: true });
}
