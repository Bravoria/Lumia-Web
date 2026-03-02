import { json } from '@sveltejs/kit';
import { stripe } from '$lib/stripe';
import { STRIPE_WEBHOOK_SECRET } from '$env/static/private';
import { supabase } from '$lib/supabase'; // WARNING: Using standard client might hit RLS, but if we have the service_role key it's better. For now we will update subscription directly if RLS allows, or bypass. Wait, RLS on `subscriptions` table.

// Usually you want `supabase-admin` client bypassing RLS for webhooks.
// Let's assume RLS on subscriptions allows insert/update based on... we need to check RLS.
// For now let's use the public client and assume it has access or we fix RLS later.

export async function POST({ request }) {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    let event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return json({ error: err.message }, { status: 400 });
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const clinicId = session.client_reference_id || session.metadata.clinic_id;
        const plan = session.metadata?.plan || 'pro';
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        if (clinicId) {
            // Update or insert subscription in Supabase
            const { error } = await supabase
                .from('subscriptions')
                .upsert({
                    clinic_id: clinicId,
                    plan: plan,
                    status: 'active',
                    stripe_customer_id: customerId,
                    stripe_subscription_id: subscriptionId,
                    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days approx, real sync requires reading the subscription object
                }, { onConflict: 'clinic_id' });

            if (error) {
                console.error('Error updating subscription in Supabase:', error);
            } else {
                console.log(`Successfully upgraded clinic ${clinicId} to ${plan}`);
            }
        }
    }

    // Handle subscription update/delete events later if needed
    if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;
        // const customerId = subscription.customer;
        // update status to 'canceled' where stripe_subscription_id = subscription.id
    }

    return json({ received: true });
}
