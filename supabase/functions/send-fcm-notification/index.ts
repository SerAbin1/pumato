import * as jose from "npm:jose@4"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FIREBASE_PROJECT_ID = "pumato-84497"
const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
const FCM_API_URL = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`

const corsHeaders = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ---------------------------------------------------------------------------
// Firebase JWT verification (same pattern as manage-coupons)
// ---------------------------------------------------------------------------
let _JWKS: any = null
function getJWKS() {
    if (!_JWKS) _JWKS = jose.createRemoteJWKSet(new URL(JWKS_URL))
    return _JWKS
}

async function verifyFirebaseToken(token: string): Promise<any> {
    try {
        const { payload } = await jose.jwtVerify(token, getJWKS(), {
            issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
            audience: FIREBASE_PROJECT_ID,
        })
        return payload // contains uid, admin claim, restaurantId claim
    } catch (e) {
        console.error("Token verification error:", e)
        return null
    }
}

// ---------------------------------------------------------------------------
// Google OAuth2 access token from a service-account JSON.
// The service-account JSON is stored as the Supabase secret
// GOOGLE_SERVICE_ACCOUNT_JSON.  Set it with:
//   supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='<contents of pumato-*.json>'
// ---------------------------------------------------------------------------
async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
    const sa = JSON.parse(serviceAccountJson)
    const now = Math.floor(Date.now() / 1000)

    const claimSet = {
        iss: sa.client_email,
        scope: "https://www.googleapis.com/auth/cloud-platform",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
    }

    // Import the RSA private key
    const privateKey = await crypto.subtle.importKey(
        "pkcs8",
        pemToDer(sa.private_key),
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
    )

    const jwt = await new jose.SignJWT(claimSet)
        .setProtectedHeader({ alg: "RS256" })
        .sign(privateKey)

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: jwt,
        }),
    })

    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) throw new Error(`OAuth token exchange failed: ${JSON.stringify(tokenData)}`)
    return tokenData.access_token
}

// Convert PEM to DER bytes for SubtleCrypto
function pemToDer(pem: string): ArrayBuffer {
    const b64 = pem
        .replace(/-----BEGIN PRIVATE KEY-----/, "")
        .replace(/-----END PRIVATE KEY-----/, "")
        .replace(/\s+/g, "")
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes.buffer
}

// ---------------------------------------------------------------------------
// Fetch FCM tokens from Firestore REST API
// ---------------------------------------------------------------------------
async function getFcmTokens(uids: string[], accessToken: string): Promise<string[]> {
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`
    const tokens: string[] = []
    console.log(`[getFcmTokens] looking up UIDs:`, uids)

    await Promise.all(
        uids.map(async (uid) => {
            const res = await fetch(`${baseUrl}/fcm_tokens/${uid}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            })
            console.log(`[getFcmTokens] UID=${uid} status=${res.status}`)
            if (!res.ok) {
                const err = await res.text()
                console.warn(`[getFcmTokens] UID=${uid} error:`, err)
                return
            }
            const data = await res.json()
            const token = data?.fields?.token?.stringValue
            console.log(`[getFcmTokens] UID=${uid} token found:`, !!token)
            if (token) tokens.push(token)
        })
    )

    console.log(`[getFcmTokens] total tokens:`, tokens.length)
    return tokens
}

// ---------------------------------------------------------------------------
// Read all admin UIDs from Firestore (documents with admin custom claim stored
// in fcm_tokens — we query the entire fcm_tokens collection and return all tokens).
// For simplicity: admins store their token under their UID; we can't filter by
// claim from REST easily, so for "admin" role we just broadcast to ALL tokens.
// ---------------------------------------------------------------------------
async function getAllFcmTokens(accessToken: string): Promise<string[]> {
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`
    console.log(`[getAllFcmTokens] fetching all tokens`)
    const res = await fetch(`${baseUrl}/fcm_tokens`, {
        headers: { Authorization: `Bearer ${accessToken}` },
    })
    console.log(`[getAllFcmTokens] status=${res.status}`)
    if (!res.ok) {
        const err = await res.text()
        console.warn(`[getAllFcmTokens] error:`, err)
        return []
    }
    const data = await res.json()
    if (!data.documents) {
        console.warn(`[getAllFcmTokens] no documents field in response`)
        return []
    }
    const tokens = data.documents.map((d: any) => d.fields?.token?.stringValue).filter(Boolean)
    console.log(`[getAllFcmTokens] total tokens:`, tokens.length)
    return tokens
}

// ---------------------------------------------------------------------------
// Get FCM tokens for specific restaurant IDs (for partner notifications)
// ---------------------------------------------------------------------------
async function getFcmTokensByRestaurantIds(restaurantIds: string[], accessToken: string): Promise<string[]> {
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`
    const tokens: string[] = []
    console.log(`[getTokensByRestaurant] querying for restaurantIds:`, restaurantIds)

    await Promise.all(restaurantIds.map(async (restaurantId) => {
        const res = await fetch(baseUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                structuredQuery: {
                    from: [{ collectionId: "fcm_tokens" }],
                    where: {
                        fieldFilter: {
                            field: { fieldPath: "restaurantId" },
                            op: "EQUAL",
                            value: { stringValue: restaurantId },
                        },
                    },
                },
            }),
        })
        console.log(`[getTokensByRestaurant] restaurantId=${restaurantId} status=${res.status}`)
        if (!res.ok) {
            const err = await res.text()
            console.warn(`[getTokensByRestaurant] restaurantId=${restaurantId} error:`, err)
            return
        }
        const results = await res.json()
        console.log(`[getTokensByRestaurant] restaurantId=${restaurantId} results count:`, results.length)
        for (const result of results) {
            const token = result.document?.fields?.token?.stringValue
            if (token) tokens.push(token)
        }
    }))

    console.log(`[getTokensByRestaurant] total tokens:`, tokens.length)
    return tokens
}

// ---------------------------------------------------------------------------
// Send one FCM message per token (FCM v1 does not support multicast in REST)
// ---------------------------------------------------------------------------
async function sendFcmMessage(fcmToken: string, payload: Record<string, string>, accessToken: string) {
    const body = {
        message: {
            token: fcmToken,
            // data payload: service worker handles display + custom sound
            data: payload,
            // webpush urgency=high wakes Android even with screen off
            webpush: {
                headers: {
                    Urgency: "high",
                    TTL: "60",          // deliver within 60 seconds or drop
                },
                // fallback notification in case service worker is not running
                notification: {
                    title: payload.title || "New Order Received",
                    body: payload.body || "A new order is waiting.",
                    icon: "/android-chrome-192x192.png",
                    badge: "/favicon-32x32.png",
                    tag: "new-order",
                    renotify: true,
                },
            },
        },
    }

    const res = await fetch(FCM_API_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    })

    if (!res.ok) {
        const err = await res.text()
        console.warn(`FCM send failed for token ${fcmToken.slice(0, 20)}…: ${err}`)
    }
}

// ---------------------------------------------------------------------------
// Edge Function entry point
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
    const origin = req.headers.get("Origin") || "*"

    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin },
        })
    }

    try {
        // 1. Verify caller is an authenticated admin or partner
        const authHeader = req.headers.get("Authorization")
        if (!authHeader?.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin, "Content-Type": "application/json" },
            })
        }

        const callerToken = authHeader.split(" ")[1]
        const callerPayload = await verifyFirebaseToken(callerToken)
        if (!callerPayload) {
            return new Response(JSON.stringify({ error: "forbidden" }), {
                status: 403,
                headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin, "Content-Type": "application/json" },
            })
        }

        // 2. Parse body
        const body = await req.json()
        // role: "admin" | "partner"
        // orderId: string (for the notification body)
        // restaurantId: string (only used when role === "partner", to target the right partner's token)
        // targetUids: string[] — explicit list of UIDs to notify. If omitted for "admin" role,
        //             all tokens in the collection are targeted.
        const { role, orderId, targetUids } = body

        // 3. Get Google access token for FCM + Firestore REST
        const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON")
        if (!serviceAccountJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON secret not set")
        const accessToken = await getGoogleAccessToken(serviceAccountJson)

        // 4. Resolve FCM tokens
        let fcmTokens: string[]
        if (targetUids && Array.isArray(targetUids) && targetUids.length > 0) {
            fcmTokens = await getFcmTokens(targetUids, accessToken)
        } else if (role === "partner" && body.restaurantIds && Array.isArray(body.restaurantIds) && body.restaurantIds.length > 0) {
            // Notify only partners registered for these restaurants
            fcmTokens = await getFcmTokensByRestaurantIds(body.restaurantIds, accessToken)
        } else {
            // Broadcast to all registered tokens (admin broadcast use-case)
            fcmTokens = await getAllFcmTokens(accessToken)
        }

        if (fcmTokens.length === 0) {
            return new Response(JSON.stringify({ sent: 0, message: "No FCM tokens found" }), {
                headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin, "Content-Type": "application/json" },
            })
        }

        // 5. Build notification data payload
        const notificationPayload: Record<string, string> = {
            title: "New Order Received",
            body: orderId ? `Order #${orderId.slice(-6).toUpperCase()} has been placed.` : "A new order is waiting.",
            role: role || "admin",
            targetUrl: role === "partner" ? "/partner" : "/admin",
            orderId: orderId || "",
        }

        // 6. Send to all tokens in parallel
        await Promise.all(fcmTokens.map((t) => sendFcmMessage(t, notificationPayload, accessToken)))

        return new Response(JSON.stringify({ sent: fcmTokens.length }), {
            headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin, "Content-Type": "application/json" },
        })
    } catch (error: any) {
        console.error("send-fcm-notification error:", error)
        return new Response(JSON.stringify({ error: "internal", message: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin, "Content-Type": "application/json" },
        })
    }
})
