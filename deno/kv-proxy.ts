/**
 * Deno KV HTTP Proxy for Deno Deploy
 * 
 * Deploy to Deno Deploy:
 * 1. Push to GitHub
 * 2. Create Deno Deploy project → link repo
 * 3. Set environment variable: KV_PROXY_SECRET (shared secret)
 * 4. Deploy
 * 
 * On Deno Deploy, `Deno.openKv()` auto-connects to the project's KV database
 * (no connection string needed - only works on Deno Deploy)
 * 
 * Then configure Next.js:
 * DENO_KV_URL="https://your-project.deno.dev"
 * DENO_KV_TOKEN="your-KV_PROXY_SECRET"
 */

// On Deno Deploy, this auto-connects to the project's KV database
// Locally, you can use `deno run --allow-net --allow-env kv-proxy.ts` with DENO_KV_URL set
const kv = await Deno.openKv();

const PROXY_SECRET = Deno.env.get("KV_PROXY_SECRET") || "dev-secret-change-me";

interface KvEntry<T = unknown> {
  key: readonly unknown[];
  value: T;
  versionstamp: string;
}

interface KvListResult<T = unknown> {
  entries: KvEntry<T>[];
  cursor?: string;
}

function verifyAuth(req: Request): boolean {
  const auth = req.headers.get("Authorization");
  if (!auth) return false;
  const token = auth.replace("Bearer ", "");
  return token === PROXY_SECRET;
}

function serializeBigInt(data: unknown): unknown {
  if (typeof data === 'bigint') {
    return Number(data);
  }
  if (Array.isArray(data)) {
    return data.map(serializeBigInt);
  }
  if (data !== null && typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = serializeBigInt(value);
    }
    return result;
  }
  return data;
}

function serializeBigInt(data: unknown): unknown {
  if (typeof data === 'bigint') {
    return Number(data);
  }
  if (Array.isArray(data)) {
    return data.map(serializeBigInt);
  }
  if (data !== null && typeof data === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = serializeBigInt(value);
    }
    return result;
  }
  return data;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(serializeBigInt(data)), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

Deno.serve(async (req) => {
  // CORS for local development
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (!verifyAuth(req)) {
    return errorResponse("Unauthorized", 401);
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/+/, ""); // remove leading slashes
  const method = req.method;

  try {
    // GET /get/["key","parts"]
    if (method === "GET" && path.startsWith("get/")) {
      const keyJson = decodeURIComponent(path.slice(4));
      const key = JSON.parse(keyJson);
      const res = await kv.get(key);
      return jsonResponse({ value: res.value, versionstamp: res.versionstamp });
    }

    // POST /set { key, value }
    if (method === "POST" && path === "set") {
      const { key, value } = await req.json();
      if (!Array.isArray(key)) return errorResponse("key must be array");
      await kv.set(key, value);
      return new Response(null, { status: 204 });
    }

    // POST /atomic { checks, mutations }
    if (method === "POST" && path === "atomic") {
      const { checks, mutations } = await req.json();
      
      let atomic = kv.atomic();
      
      // Apply checks
      for (const check of checks || []) {
        atomic = atomic.check({ 
          key: check.key, 
          versionstamp: check.versionstamp 
        });
      }
      
      // Apply mutations
      for (const mutation of mutations || []) {
        switch (mutation.type) {
          case "set":
            atomic = atomic.set(mutation.key, mutation.value);
            break;
          case "sum":
            atomic = atomic.sum(mutation.key, BigInt(mutation.value));
            break;
          case "delete":
            atomic = atomic.delete(mutation.key);
            break;
          case "min":
            atomic = atomic.min(mutation.key, mutation.value);
            break;
          case "max":
            atomic = atomic.max(mutation.key, mutation.value);
            break;
        }
      }
      
      const result = await atomic.commit();
      return jsonResponse({ ok: result.ok });
    }

    // POST /list { prefix, limit }
    if (method === "POST" && path === "list") {
      const { prefix, limit = 1000 } = await req.json();
      if (!Array.isArray(prefix)) return errorResponse("prefix must be array");
      
      const entries: KvEntry[] = [];
      for await (const entry of kv.list({ prefix: prefix as Deno.KvKey }, { limit, reverse: false })) {
        entries.push({
          key: entry.key,
          value: entry.value,
          versionstamp: entry.versionstamp,
        });
      }
      return jsonResponse({ entries });
    }

    // POST /get-many { keys: [[]] }
    if (method === "POST" && path === "get-many") {
      const { keys } = await req.json();
      if (!Array.isArray(keys)) return errorResponse("keys must be array");
      
      const results = await Promise.all(
        keys.map((key: unknown[]) => kv.get(key as Deno.KvKey))
      );
      
      return jsonResponse({
        results: results.map(r => ({ 
          value: r.value, 
          versionstamp: r.versionstamp 
        }))
      });
    }

    // GET /health
    if (method === "GET" && path === "health") {
      return jsonResponse({ status: "ok", timestamp: Date.now() });
    }

    return errorResponse("Not Found", 404);
  } catch (e) {
    console.error("KV Proxy error:", e);
    return errorResponse(String(e), 500);
  }
});

console.log("Deno KV Proxy running on Deno Deploy (auto-connected to project KV)");