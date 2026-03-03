import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

export function getStripe() {
    return new Stripe(env.STRIPE_SECRET_KEY || 'sk_not_configured', {
        apiVersion: '2023-10-16'
    });
}
