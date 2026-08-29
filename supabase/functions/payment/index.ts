
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') ?? '';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, ...payload } = await req.json()

        if (action === 'create-order') {
            const { amount, currency = 'INR', receipt } = payload

            if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
                throw new Error("Razorpay keys not configured on server");
            }

            const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)

            const resp = await fetch('https://api.razorpay.com/v1/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${auth}`
                },
                body: JSON.stringify({
                    amount: Math.round(amount * 100), // Convert to paise
                    currency,
                    receipt,
                    payment_capture: 1
                })
            })

            const data = await resp.json()
            if (!resp.ok) {
                console.error("Razorpay Error:", data);
                throw new Error(data.error?.description || 'Failed to create order');
            }

            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })

        } else if (action === 'verify-signature') {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = payload

            const text = `${razorpay_order_id}|${razorpay_payment_id}`
            const key = RAZORPAY_KEY_SECRET

            const encoder = new TextEncoder()
            const keyData = encoder.encode(key)
            const msgData = encoder.encode(text)

            const cryptoKey = await crypto.subtle.importKey(
                'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
            )

            const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
            const signatureHex = Array.from(new Uint8Array(signatureBuffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')

            if (signatureHex === razorpay_signature) {
                return new Response(JSON.stringify({ status: 'success' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            } else {
                return new Response(JSON.stringify({ status: 'failure', error: 'Invalid Signature' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }
        }

        return new Response(JSON.stringify({ error: 'Invalid action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
