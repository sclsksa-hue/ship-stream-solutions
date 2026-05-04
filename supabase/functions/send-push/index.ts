// Web Push sender — uses Web Push Protocol with VAPID
// No external libraries needed (works in Deno)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:info@scls.co";

// ---------- helpers ----------
function b64urlToBytes(b64url: string): Uint8Array {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function bytesToB64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function strToBytes(s: string): Uint8Array { return new TextEncoder().encode(s); }
function concat(...arrs: Uint8Array[]): Uint8Array {
  const len = arrs.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrs) { out.set(a, off); off += a.length; }
  return out;
}

// Import VAPID keys
async function importVapidKeys() {
  const pubBytes = b64urlToBytes(VAPID_PUBLIC_KEY); // 65-byte uncompressed point
  const privBytes = b64urlToBytes(VAPID_PRIVATE_KEY); // 32 bytes
  // Build JWK
  const x = bytesToB64url(pubBytes.slice(1, 33));
  const y = bytesToB64url(pubBytes.slice(33, 65));
  const d = bytesToB64url(privBytes);
  const jwk = { kty: "EC", crv: "P-256", x, y, d, ext: true };
  const privKey = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const pubKey = await crypto.subtle.importKey(
    "jwk", { kty: "EC", crv: "P-256", x, y, ext: true },
    { name: "ECDH", namedCurve: "P-256" }, true, []
  );
  return { privKey, pubKey, pubBytes };
}

// Sign VAPID JWT (ES256)
async function buildVapidJwt(audience: string, privKey: CryptoKey): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: VAPID_SUBJECT,
  };
  const enc = (o: unknown) => bytesToB64url(strToBytes(JSON.stringify(o)));
  const signingInput = `${enc(header)}.${enc(payload)}`;
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, privKey, strToBytes(signingInput)
  );
  return `${signingInput}.${bytesToB64url(new Uint8Array(sig))}`;
}

// HKDF
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    key, length * 8
  );
  return new Uint8Array(bits);
}

// Encrypt payload (aes128gcm content-encoding, RFC 8291)
async function encryptPayload(
  payload: string,
  subP256dh: string,
  subAuth: string,
  serverPubBytes: Uint8Array,
  serverPrivKey: CryptoKey,
): Promise<Uint8Array> {
  const clientPubBytes = b64urlToBytes(subP256dh); // 65 bytes
  const authSecret = b64urlToBytes(subAuth);

  const clientPub = await crypto.subtle.importKey(
    "raw", clientPubBytes, { name: "ECDH", namedCurve: "P-256" }, false, []
  );
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientPub }, serverPrivKey, 256
  );
  const ecdhSecret = new Uint8Array(sharedBits);

  // PRK_key = HKDF(authSecret, ecdhSecret, info, 32)
  const keyInfo = concat(strToBytes("WebPush: info\0"), clientPubBytes, serverPubBytes);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);

  // salt = 16 random bytes
  const salt = crypto.getRandomValues(new Uint8Array(16));
  // CEK = HKDF(salt, ikm, "Content-Encoding: aes128gcm\0", 16)
  const cek = await hkdf(salt, ikm, strToBytes("Content-Encoding: aes128gcm\0"), 16);
  // NONCE = HKDF(salt, ikm, "Content-Encoding: nonce\0", 12)
  const nonce = await hkdf(salt, ikm, strToBytes("Content-Encoding: nonce\0"), 12);

  // plaintext padded with 0x02 (last record)
  const plaintext = concat(strToBytes(payload), new Uint8Array([0x02]));
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, plaintext));

  // header: salt(16) | rs(4=4096) | idlen(1) | keyid(serverPubBytes)
  const rs = new Uint8Array([0, 0, 0x10, 0]); // 4096
  const idlen = new Uint8Array([serverPubBytes.length]);
  return concat(salt, rs, idlen, serverPubBytes, ct);
}

async function sendOne(sub: { endpoint: string; p256dh: string; auth: string }, payload: string, keys: Awaited<ReturnType<typeof importVapidKeys>>): Promise<number> {
  const url = new URL(sub.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await buildVapidJwt(audience, keys.privKey);
  const body = await encryptPayload(payload, sub.p256dh, sub.auth, keys.pubBytes, await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC", crv: "P-256",
      x: bytesToB64url(keys.pubBytes.slice(1, 33)),
      y: bytesToB64url(keys.pubBytes.slice(33, 65)),
      d: bytesToB64url(b64urlToBytes(VAPID_PRIVATE_KEY)),
      ext: true,
    },
    { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]
  ));

  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      "TTL": "86400",
      "Authorization": `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
    },
    body,
  });
  return res.status;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user_id, title, message, type, priority, reference_type, reference_id } = await req.json();
    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "user_id and title required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", user_id);
    if (error) throw error;
    if (!subs?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: "no subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keys = await importVapidKeys();
    const payload = JSON.stringify({
      title, body: message, type, priority,
      url: reference_type === "lead" ? "/leads"
        : reference_type === "quotation" ? "/quotations"
        : reference_type === "shipment" ? "/" 
        : reference_type === "task" ? "/tasks" : "/",
      ref_id: reference_id,
    });

    let sent = 0; const stale: string[] = [];
    for (const s of subs) {
      try {
        const status = await sendOne(s, payload, keys);
        if (status === 410 || status === 404) stale.push(s.id);
        else if (status >= 200 && status < 300) sent++;
        else console.error("push failed", status, s.endpoint);
      } catch (e) { console.error("push error", e); }
    }
    if (stale.length) {
      await supabase.from("push_subscriptions").delete().in("id", stale);
    }

    return new Response(JSON.stringify({ sent, removed_stale: stale.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-push error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
