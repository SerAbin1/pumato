import * as jose from "npm:jose@4"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FIREBASE_PROJECT_ID = "pumato-84497"
const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ---------------------------------------------------------------------------
// Firebase JWT verification
// ---------------------------------------------------------------------------
let _JWKS: any = null
function getJWKS() {
    if (!_JWKS) _JWKS = jose.createRemoteJWKSet(new URL(JWKS_URL))
    return _JWKS
}

async function verifyIsAdmin(token: string): Promise<boolean> {
    try {
        const { payload } = await jose.jwtVerify(token, getJWKS(), {
            issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
            audience: FIREBASE_PROJECT_ID,
        })
        return payload.admin === true
    } catch (e) {
        console.error("Token verification error:", e)
        return false
    }
}

// ---------------------------------------------------------------------------
// Google OAuth2 Token logic (from fcm-notification)
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
// Firebase Auth REST Operations
// ---------------------------------------------------------------------------

async function getOrCreateUser(accessToken: string, email: string, password?: string) {
    // 1. Try to lookup by email
    const lookupRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: [email] }),
    })
    const lookupResText = await lookupRes.text()
    try {
        const lookupData = JSON.parse(lookupResText)
        if (lookupData.users && lookupData.users.length > 0) {
            return lookupData.users[0]
        }
    } catch (e) {
        console.error("Lookup API returned non-JSON:", lookupResText)
        throw new Error("Lookup API returned non-JSON")
    }

    // 2. Not found, create
    if (!password) throw new Error("User not found and no password provided for creation")

    const createRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, emailVerified: true }),
    })
    const createResText = await createRes.text()
    let createData;
    try {
        createData = JSON.parse(createResText)
    } catch (e) {
        console.error("Create API returned non-JSON:", createResText)
        throw new Error("Create API returned non-JSON")
    }
    if (createData.error) throw new Error(createData.error.message || "Failed to create user")

    return createData
}

async function setClaims(accessToken: string, uid: string, claims: any) {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            localId: uid,
            customAttributes: JSON.stringify(claims)
        }),
    })
    const updateResText = await res.text()
    let data;
    try {
        data = JSON.parse(updateResText)
    } catch (e) {
        console.error("Update API returned non-JSON:", updateResText)
        throw new Error("Update API returned non-JSON")
    }
    if (data.error) throw new Error(data.error.message || "Failed to set claims")
    return data
}

async function listUsers(accessToken: string) {
    // Note: projects.accounts.batchGet is for specific UIDs. 
    // For listing all, we use the Admin API:
    // GET https://identitytoolkit.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/accounts

    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/accounts?maxResults=1000`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${accessToken}` },
    })
    const listResText = await res.text()
    let data;
    try {
        data = JSON.parse(listResText)
    } catch (e) {
        console.error("List API returned non-JSON:", listResText)
        throw new Error("List API returned non-JSON")
    }
    if (data.error) throw new Error(data.error.message || "Failed to list users")
    return data.users || []
}

// ---------------------------------------------------------------------------
// Main Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
    const origin = req.headers.get("Origin") || "*"

    // CORS Preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin }
        })
    }

    try {
        // 1. Auth Check
        const authHeader = req.headers.get("Authorization")
        if (!authHeader?.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin, "Content-Type": "application/json" }
            })
        }

        const token = authHeader.split(" ")[1]
        const isAdmin = await verifyIsAdmin(token)
        if (!isAdmin) {
            return new Response(JSON.stringify({ error: "Forbidden" }), {
                status: 403,
                headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin, "Content-Type": "application/json" }
            })
        }

        // 2. Service Account Auth
        const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON")
        if (!serviceAccountJson) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON")
        const accessToken = await getGoogleAccessToken(serviceAccountJson)

        // 3. Action Handling
        const body = await req.json()
        const { action, email, password, restaurantId } = body

        if (action === "CREATE_PARTNER") {
            const user = await getOrCreateUser(accessToken, email, password)
            await setClaims(accessToken, user.localId || user.uid, { partner: true, restaurantId })
            return new Response(JSON.stringify({ success: true, uid: user.localId || user.uid }), {
                headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin, "Content-Type": "application/json" }
            })
        }

        if (action === "CREATE_DELIVERY_BOY") {
            const user = await getOrCreateUser(accessToken, email, password)
            await setClaims(accessToken, user.localId || user.uid, { deliveryBoy: true })
            return new Response(JSON.stringify({ success: true, uid: user.localId || user.uid }), {
                headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin, "Content-Type": "application/json" }
            })
        }

        if (action === "LIST_USERS") {
            const users = await listUsers(accessToken)

            const partners = users
                .filter((u: any) => {
                    const claims = JSON.parse(u.customAttributes || "{}")
                    return claims.partner === true
                })
                .map((u: any) => {
                    const claims = JSON.parse(u.customAttributes || "{}")
                    return {
                        uid: u.localId,
                        email: u.email,
                        restaurantId: claims.restaurantId,
                        lastSignInTime: u.lastLoginAt
                    }
                })

            const deliveryBoys = users
                .filter((u: any) => {
                    const claims = JSON.parse(u.customAttributes || "{}")
                    return claims.deliveryBoy === true
                })
                .map((u: any) => ({
                    uid: u.localId,
                    email: u.email,
                    lastSignInTime: u.lastLoginAt
                }))

            return new Response(JSON.stringify({ partners, deliveryBoys }), {
                headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin, "Content-Type": "application/json" }
            })
        }

        return new Response(JSON.stringify({ error: "Invalid action" }), {
            status: 400,
            headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin, "Content-Type": "application/json" }
        })

    } catch (error: any) {
        console.error("Function Error:", error)
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin, "Content-Type": "application/json" }
        })
    }
})import * as jose from "npm:jose@4"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FIREBASE_PROJECT_ID = "pumato-84497"
const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ---------------------------------------------------------------------------
// Firebase JWT verification
// ---------------------------------------------------------------------------
let _JWKS: any = null
function getJWKS() {
    if (!_JWKS) _JWKS = jose.createRemoteJWKSet(new URL(JWKS_URL))
    return _JWKS
}

async function verifyIsAdmin(token: string): Promise<boolean> {
    try {
        const { payload } = await jose.jwtVerify(token, getJWKS(), {
            issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
            audience: FIREBASE_PROJECT_ID,
        })
        return payload.admin === true
    } catch (e) {
        return false
    }
}

// ---------------------------------------------------------------------------
// Google OAuth2 Token logic (from fcm-notification)
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
// Firebase Auth REST Operations
// ---------------------------------------------------------------------------

async function getOrCreateUser(accessToken: string, email: string, password?: string) {
    // 1. Try to lookup by email
    const lookupRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/accounts:lookup`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: [email] }),
    })
    const lookupResText = await lookupRes.text()
    try {
        const lookupData = JSON.parse(lookupResText)
        if (lookupData.users && lookupData.users.length > 0) {
            return lookupData.users[0]
        }
    } catch (e) {
        throw new Error("Lookup API returned non-JSON")
    }

    // 2. Not found, create
    if (!password) throw new Error("User not found and no password provided for creation")

    const createRes = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/accounts`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, emailVerified: true }),
    })
    const createResText = await createRes.text()
    let createData;
    try {
        createData = JSON.parse(createResText)
    } catch (e) {
        throw new Error("Create API returned non-JSON")
    }
    if (createData.error) throw new Error(createData.error.message || "Failed to create user")

    return createData
}

async function setClaims(accessToken: string, uid: string, claims: any) {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/accounts:update`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            localId: uid,
            customAttributes: JSON.stringify(claims)
        }),
    })
    const updateResText = await res.text()
    let data;
    try {
        data = JSON.parse(updateResText)
    } catch (e) {
        throw new Error("Update API returned non-JSON")
    }
    if (data.error) throw new Error(data.error.message || "Failed to set claims")
    return data
}

async function listUsers(accessToken: string) {
    // The correct endpoint for listing all accounts is accounts:batchGet
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/accounts:batchGet?maxResults=1000`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${accessToken}` },
    })

    const listResText = await res.text()
    let data;
    try {
        data = JSON.parse(listResText)
    } catch (e) {
        throw new Error("List API returned non-JSON")
    }

    if (data.error) throw new Error(data.error.message || "Failed to list users")

    // batchGet returns the array in a 'users' property, just like your code expects
    return data.users || []
}

// ---------------------------------------------------------------------------
// Main Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
    const origin = req.headers.get("Origin") || "*"

    // CORS Preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin }
        })
    }

    try {
        // 1. Auth Check
        const authHeader = req.headers.get("Authorization")
        if (!authHeader?.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin, "Content-Type": "application/json" }
            })
        }

        const token = authHeader.split(" ")[1]
        const isAdmin = await verifyIsAdmin(token)
        if (!isAdmin) {
            return new Response(JSON.stringify({ error: "Forbidden" }), {
                status: 403,
                headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin, "Content-Type": "application/json" }
            })
        }

        // 2. Service Account Auth
        const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON")
        if (!serviceAccountJson) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON")
        const accessToken = await getGoogleAccessToken(serviceAccountJson)

        // 3. Action Handling
        const body = await req.json()
        const { action, email, password, restaurantId } = body

        if (action === "CREATE_PARTNER") {
            const user = await getOrCreateUser(accessToken, email, password)
            await setClaims(accessToken, user.localId || user.uid, { partner: true, restaurantId })
            return new Response(JSON.stringify({ success: true, uid: user.localId || user.uid }), {
                headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin, "Content-Type": "application/json" }
            })
        }

        if (action === "CREATE_DELIVERY_BOY") {
            const user = await getOrCreateUser(accessToken, email, password)
            await setClaims(accessToken, user.localId || user.uid, { deliveryBoy: true })
            return new Response(JSON.stringify({ success: true, uid: user.localId || user.uid }), {
                headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin, "Content-Type": "application/json" }
            })
        }

        if (action === "LIST_USERS") {
            const users = await listUsers(accessToken)

            const partners = users
                .filter((u: any) => {
                    const claims = JSON.parse(u.customAttributes || "{}")
                    return claims.partner === true
                })
                .map((u: any) => {
                    const claims = JSON.parse(u.customAttributes || "{}")
                    return {
                        uid: u.localId,
                        email: u.email,
                        restaurantId: claims.restaurantId,
                        lastSignInTime: u.lastLoginAt
                    }
                })

            const deliveryBoys = users
                .filter((u: any) => {
                    const claims = JSON.parse(u.customAttributes || "{}")
                    return claims.deliveryBoy === true
                })
                .map((u: any) => ({
                    uid: u.localId,
                    email: u.email,
                    lastSignInTime: u.lastLoginAt
                }))

            return new Response(JSON.stringify({ partners, deliveryBoys }), {
                headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin, "Content-Type": "application/json" }
            })
        }

        return new Response(JSON.stringify({ error: "Invalid action" }), {
            status: 400,
            headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin, "Content-Type": "application/json" }
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Access-Control-Allow-Origin": origin, "Content-Type": "application/json" }
        })
    }
})

