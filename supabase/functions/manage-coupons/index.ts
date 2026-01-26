import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
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
    // 1. Handle CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // 2. Auth Check
        const authHeader = req.headers.get('Authorization')
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const token = authHeader.split(' ')[1]
        const isAuthorized = await verifyFirebaseToken(token)
        if (!isAuthorized) {
            return new Response(JSON.stringify({ error: 'forbidden' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 3. Supabase Client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
        )

        const { action, payload } = await req.json()

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
                    usage_limit: payload.usageLimit,
                    used_count: payload.usedCount || 0
                })
                .select()
            if (error) throw error
            return new Response(JSON.stringify(data[0]), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        if (action === 'DELETE') {
            const { error } = await supabaseClient
                .from('promocodes')
                .delete()
                .eq('id', payload.id)
            if (error) throw error
            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        if (action === 'FETCH_ALL') {
            const { data, error } = await supabaseClient
                .from('promocodes')
                .select('*')
            if (error) throw error
            return new Response(JSON.stringify(data), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        return new Response(JSON.stringify({ error: 'invalid-action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (error) {
        console.error('Function error:', error)
        return new Response(JSON.stringify({ error: 'internal', message: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})

