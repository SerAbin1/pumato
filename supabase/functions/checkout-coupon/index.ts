// No need to import serve from std, Deno.serve is built-in.
import { createClient } from "supabase"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    const origin = req.headers.get('Origin') || '*'

    // 1. Robust CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                ...corsHeaders,
                'Access-Control-Allow-Origin': origin,
            }
        })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { couponCode } = await req.json()

        if (!couponCode) {
            return new Response(
                JSON.stringify({ error: 'invalid-argument', message: 'Coupon code is required.' }),
                {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': origin,
                    },
                    status: 400
                }
            )
        }

        // Fetch coupon
        const { data: coupon, error: fetchError } = await supabaseClient
            .from('promocodes')
            .select('*')
            .eq('code', couponCode.toUpperCase())
            .single()

        if (fetchError || !coupon) {
            return new Response(
                JSON.stringify({ error: 'not-found', message: 'Invalid coupon code.' }),
                {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': origin,
                    },
                    status: 404
                }
            )
        }

        const usageLimit = coupon.usage_limit || 0
        const usedCount = coupon.used_count || 0

        if (usageLimit < 1) {
            return new Response(
                JSON.stringify({ error: 'failed-precondition', message: 'Coupon is not configured properly.' }),
                {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': origin,
                    },
                    status: 400
                }
            )
        }

        if (usedCount >= usageLimit) {
            return new Response(
                JSON.stringify({ error: 'resource-exhausted', message: 'Coupon usage limit reached.' }),
                {
                    headers: {
                        ...corsHeaders,
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': origin,
                    },
                    status: 400
                }
            )
        }

        // Increment used_count
        const { error: updateError } = await supabaseClient
            .from('promocodes')
            .update({ used_count: usedCount + 1 })
            .eq('id', coupon.id)

        if (updateError) {
            throw updateError
        }

        return new Response(
            JSON.stringify({ success: true }),
            {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin,
                },
                status: 200
            }
        )
    } catch (error) {
        console.error('Function error:', error)
        return new Response(
            JSON.stringify({ error: 'internal', message: error.message }),
            {
                headers: {
                    ...corsHeaders,
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': origin,
                },
                status: 500
            }
        )
    }
})
