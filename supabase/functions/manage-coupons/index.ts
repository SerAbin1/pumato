import * as jose from "npm:jose@4"
import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Firebase Project ID for verification
const FIREBASE_PROJECT_ID = "pumato-84497"
const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"

let _JWKS: any = null
function getJWKS() {
    if (!_JWKS) {
        _JWKS = jose.createRemoteJWKSet(new URL(JWKS_URL))
    }
    return _JWKS
}

async function verifyFirebaseToken(token: string) {
    try {
        const { payload } = await jose.jwtVerify(token, getJWKS(), {
            issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
            audience: FIREBASE_PROJECT_ID,
        })
        return payload.admin === true;
    } catch (e) {
        console.error('Token verification error:', e);
        return false;
    }
}

Deno.serve(async (req) => {
    const origin = req.headers.get('Origin') || '*'

    // 1. Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                ...corsHeaders,
                'Access-Control-Allow-Origin': origin
            }
        })
    }

    try {
        // 2. Auth Check
        const authHeader = req.headers.get('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.warn('Missing or invalid Authorization header')
            return new Response(JSON.stringify({ error: 'unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin, 'Content-Type': 'application/json' },
            })
        }

        const token = authHeader.split(' ')[1]
        const isAuthorized = await verifyFirebaseToken(token)
        if (!isAuthorized) {
            console.warn('Unauthorized attempt with invalid or non-admin token')
            return new Response(JSON.stringify({ error: 'forbidden' }), {
                status: 403,
                headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin, 'Content-Type': 'application/json' },
            })
        }

        // 3. Supabase Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')

        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Missing Supabase environment variables')
        }

        const supabaseClient = createClient(supabaseUrl, supabaseKey)

        // 4. Parse Body
        let body: any = {}
        if (req.method !== 'GET') {
            try {
                body = await req.json()
            } catch (e) {
                console.error('Failed to parse JSON body:', e)
                return new Response(JSON.stringify({ error: 'invalid-json' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin, 'Content-Type': 'application/json' }
                })
            }
        }

        const { action, payload } = body

        if (action === 'CREATE' || action === 'UPDATE') {
            const { data, error } = await supabaseClient
                .from('promocodes')
                .upsert({
                    id: payload.id || payload.code.toUpperCase(),
                    code: payload.code.toUpperCase(),
                    type: payload.type,
                    value: payload.value,
                    min_order: payload.minOrder,
                    description: payload.description,
                    is_visible: payload.isVisible,
                    is_active: payload.isActive,
                    usage_limit: payload.usageLimit,
                    used_count: payload.usedCount || 0,
                    restaurant_id: payload.restaurantId || null,
                    item_id: payload.itemId || null
                })
                .select()
            if (error) throw error
            return new Response(JSON.stringify(data[0]), {
                headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin, 'Content-Type': 'application/json' }
            })
        }

        if (action === 'DELETE') {
            const { error } = await supabaseClient
                .from('promocodes')
                .delete()
                .eq('id', payload.id)
            if (error) throw error
            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin, 'Content-Type': 'application/json' }
            })
        }

        if (action === 'FETCH_ALL') {
            const { data, error } = await supabaseClient
                .from('promocodes')
                .select('*')
            if (error) throw error
            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin, 'Content-Type': 'application/json' }
            })
        }

        return new Response(JSON.stringify({ error: 'invalid-action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin, 'Content-Type': 'application/json' }
        })

    } catch (error: any) {
        console.error('Function error:', error)
        return new Response(JSON.stringify({ error: 'internal', message: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Access-Control-Allow-Origin': origin, 'Content-Type': 'application/json' },
        })
    }
})


