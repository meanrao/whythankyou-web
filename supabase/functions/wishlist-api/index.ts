import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? "no-reply@whythankyou.com";

// Service-role client — bypasses RLS for all writes
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function getMeta(html: string, ...keys: string[]): string | null {
  for (const key of keys) {
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, "i"),
    ];
    for (const re of patterns) {
      const m = html.match(re);
      if (m?.[1]) return m[1].trim();
    }
  }
  return null;
}

function getTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1]?.trim() ?? null;
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function parsePrice(raw: string | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

/**
 * Clean a raw scraped product title into a short, human-readable display name.
 *
 * Rules applied in order:
 *  1. Strip leading site-name prefix  e.g. "Amazon.com: "
 *  2. Strip author / publisher suffix  e.g. ": Smith, Jane: Books"
 *  3. Remove inline SEO filler phrases (gift marketing, age ranges, etc.)
 *  4. Split on pipe `|` — keep only the first segment
 *  5. Split on spaced em/en dash — keep first segment if it's meaningful
 *  6. Strip trailing retail-category suffix  e.g. ": Books" / ": Toys & Games"
 *  7. Final tidy-up (trailing punctuation, whitespace)
 *
 * The original title is never written back to the DB; the cleaned value
 * becomes the editable `name` field the user sees and can override.
 */
function cleanProductName(raw: string): string {
  let s = raw.trim();
  if (!s) return raw;

  // ── 1. Leading site-name prefix ─────────────────────────────────────────────
  // "Amazon.com: Product" → "Product"   "Target - Product" → "Product"
  const sitePrefix = s.replace(/^[^:–\-]{1,30}[:\-–]\s*/i, "").trim();
  if (sitePrefix.length > 0) s = sitePrefix;

  // ── 2. Author / publisher suffix (Amazon books) ──────────────────────────────
  // ": Lastname, Firstname: Books"  or  ": Lastname, Firstname (Author)"
  s = s
    .replace(/:\s*[A-Z][a-záéíóúàèìòùñü'-]+,\s+[A-Z][a-záéíóúàèìòùñü'-]+.*$/u, "")
    .trim();

  // ── 3. Inline SEO filler phrases ─────────────────────────────────────────────
  const fillerPatterns: RegExp[] = [
    // Gift marketing
    /,?\s*(?:Perfect|Great|Amazing|Best|Unique)\s+Gifts?\s+for\b[^|:–—]*/gi,
    /,?\s*Gifts?\s+for\s+(?:Kids?(?:\s+and\s+Adults?)?|Boys?|Girls?|(?:Him|Her|Them))\b[^|:–—]*/gi,
    /,?\s*for\s+Kids?\s+and\s+Adults?\b[^|:–—]*/gi,
    /,?\s*for\s+(?:Boys?|Girls?|Kids?|Him|Her|Them|Everyone)\b(?:\s+\d[^|:–—]*)?/gi,
    // Age ranges
    /,?\s*(?:for\s+)?Ages?\s+\d+\s*[-–—+]\s*\d*\+?/gi,
    /,?\s*for\s+\d+\s+to\s+\d+\s+[Yy]ear/gi,
    /,?\s*\d+\s*[-–]\s*\d+\s*[Yy]ears?\s+[Oo]ld/gi,
    // Coloring/activity book filler
    /,?\s*(?:Great\s+)?Coloring\s+Pages?\s+for\b[^|:–—]*/gi,
    /,?\s*Activity\s+(?:Book|Pages?)\s+for\b[^|:–—]*/gi,
    // Generic count/size clutter in parentheses
    /\s*\(\d+\s*(?:Pieces?|Packs?|Sets?|Count|PCS|CT)\)/gi,
    // ISBN
    /,?\s*ISBN(?:-1[03])?\s*:?\s*[\d-X]{9,17}/gi,
  ];
  for (const re of fillerPatterns) {
    s = s.replace(re, "").trim();
  }

  // ── 4. Pipe split — take first non-trivial segment ───────────────────────────
  if (s.includes("|")) {
    const parts = s.split("|").map((p) => p.trim()).filter((p) => p.length >= 4);
    if (parts.length > 0) s = parts[0];
  }

  // ── 5. Spaced em/en dash — keep first segment if substantive ─────────────────
  const dashParts = s.split(/\s[–—]\s/);
  if (dashParts.length > 1 && dashParts[0].trim().length >= 8) {
    s = dashParts[0].trim();
  }

  // ── 6. Trailing retail-category suffix ───────────────────────────────────────
  s = s.replace(
    /:\s*(?:Books?|Electronics?|Toys?\s*(?:&|and)\s*Games?|Sports?\s*(?:&|and)\s*Outdoors?|Kitchen\s*(?:&|and)\s*Dining|Home\s*(?:&|and)\s*Garden|Clothing|Apparel|Amazon\.com|Amazon)\s*$/i,
    "",
  ).trim();

  // ── 7. Final tidy ────────────────────────────────────────────────────────────
  s = s
    .replace(/[,.:;|–—]+$/, "")   // trailing separators
    .replace(/\s{2,}/g, " ")       // collapsed whitespace
    .trim();

  return s.length >= 3 ? s : raw.trim();
}

// Domain-to-store-name lookup table
const DOMAIN_STORE_MAP: Record<string, string> = {
  "amazon.com": "Amazon",
  "amazon.co.uk": "Amazon UK",
  "target.com": "Target",
  "walmart.com": "Walmart",
  "etsy.com": "Etsy",
  "bestbuy.com": "Best Buy",
  "costco.com": "Costco",
  "macys.com": "Macy's",
  "nordstrom.com": "Nordstrom",
  "gap.com": "Gap",
  "oldnavy.com": "Old Navy",
  "zara.com": "Zara",
  "hm.com": "H&M",
  "toysrus.com": "Toys R Us",
  "barnesandnoble.com": "Barnes & Noble",
  "apple.com": "Apple",
  "nike.com": "Nike",
  "adidas.com": "Adidas",
};

/**
 * Extract a friendly store name from a URL.
 * Priority: domain lookup table > capitalized SLD fallback.
 * Returns null only if the URL is unparseable.
 */
function storeFromUrl(rawUrl: string): string | null {
  try {
    const hostname = new URL(rawUrl).hostname;
    // Strip www. prefix
    const domain = hostname.replace(/^www\./, "");

    // Direct lookup
    if (DOMAIN_STORE_MAP[domain]) return DOMAIN_STORE_MAP[domain];

    // Try matching just the last two parts (e.g. amazon.co.uk already handled above,
    // but handles subdomains like shop.nike.com -> nike.com)
    const parts = domain.split(".");
    if (parts.length > 2) {
      const sldPlusTld = parts.slice(-2).join(".");
      if (DOMAIN_STORE_MAP[sldPlusTld]) return DOMAIN_STORE_MAP[sldPlusTld];
      // Three-part TLDs like co.uk
      const sldPlusThree = parts.slice(-3).join(".");
      if (DOMAIN_STORE_MAP[sldPlusThree]) return DOMAIN_STORE_MAP[sldPlusThree];
    }

    // Fallback: capitalize the SLD (second-level domain)
    const sld = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    return sld.charAt(0).toUpperCase() + sld.slice(1);
  } catch {
    return null;
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping email to", to);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[email] Resend error:", res.status, body);
    }
  } catch (err) {
    console.error("[email] Failed to send to", to, err);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const rawPath = url.pathname.replace(/^\/wishlist-api/, "");
  const method = req.method;

  // POST /api/items
  if (method === "POST" && rawPath === "/api/items") {
    const body = await req.json();
    const { wishlist_id, name, price, store, store_url, notes, image_url } = body;
    if (!wishlist_id || !name) return json({ error: "wishlist_id and name are required" }, 400);

    const { data, error } = await supabase
      .from("wishlist_items")
      .insert({
        wishlist_id,
        name,
        price: price ?? null,
        store: store ?? null,
        store_url: store_url ?? null,
        notes: notes ?? null,
        image_url: image_url ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/items] Supabase insert error:", JSON.stringify(error));
      return json({ error: error.message, details: error }, 500);
    }

    return json({ item: data }, 201);
  }

  // GET /api/items/:wishlistId
  const itemsMatch = rawPath.match(/^\/api\/items\/([^/]+)$/);
  if (method === "GET" && itemsMatch) {
    const wishlistId = itemsMatch[1];
    const { data, error } = await supabase
      .from("wishlist_items")
      .select(`id, wishlist_id, name, price, store, store_url, notes, image_url, created_at, item_claims ( claimer_name )`)
      .eq("wishlist_id", wishlistId)
      .order("created_at", { ascending: true });

    if (error) return json({ error: error.message }, 500);

    const items = (data ?? []).map((item: any) => ({
      id: item.id,
      wishlist_id: item.wishlist_id,
      name: item.name,
      price: item.price,
      store: item.store,
      store_url: item.store_url,
      notes: item.notes,
      image_url: item.image_url,
      created_at: item.created_at,
      is_claimed: item.item_claims !== null && item.item_claims.length > 0,
      claimer_name: item.item_claims?.[0]?.claimer_name ?? null,
    }));

    return json({ items });
  }

  // POST /api/url-preview
  if (method === "POST" && rawPath === "/api/url-preview") {
    const body = await req.json();
    const { url: targetUrl } = body;
    if (!targetUrl) return json({ error: "url is required" }, 400);

    // Step 1: Always derive store name from domain first — most reliable
    const domainStore = storeFromUrl(targetUrl);

    let name: string | null = null;
    let price: number | null = null;
    let store: string | null = domainStore; // domain takes priority
    let image_url: string | null = null;
    let pageTitle: string | null = null;
    let fetchFailed = false;

    // Step 2: Fetch the page HTML with a real browser User-Agent
    try {
      const pageResp = await fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!pageResp.ok) {
        console.warn(`[url-preview] HTTP ${pageResp.status} for ${targetUrl}`);
        fetchFailed = true;
      } else {
        // Read up to 100KB
        const reader = pageResp.body?.getReader();
        let html = "";
        if (reader) {
          let bytesRead = 0;
          const maxBytes = 100_000;
          const decoder = new TextDecoder();
          while (bytesRead < maxBytes) {
            const { done, value } = await reader.read();
            if (done) break;
            html += decoder.decode(value, { stream: true });
            bytesRead += value.byteLength;
            if (html.includes("</head>")) break;
          }
          reader.cancel();
        }

        // Step 3: Extract meta tags via regex
        // name: og:title, fallback to <title> — then clean site-name prefix
        const ogTitle = getMeta(html, "og:title");
        const rawTitle = decodeEntities(ogTitle ?? getTitle(html) ?? "") || null;
        pageTitle = rawTitle;
        name = rawTitle ? cleanProductName(rawTitle) : null;

        // price: og:price:amount OR product:price:amount OR og:price
        price = parsePrice(getMeta(html, "og:price:amount", "product:price:amount", "og:price"));

        // store: domain lookup already set above; only fall back to og:site_name if domain lookup returned nothing
        if (!store) {
          const rawStore = getMeta(html, "og:site_name");
          store = rawStore ? decodeEntities(rawStore) : null;
        }

        // image_url: og:image — return as-is, let frontend decide whether to display
        image_url = getMeta(html, "og:image", "og:image:url") ?? null;
      }
    } catch (fetchErr) {
      console.warn(`[url-preview] Fetch failed for ${targetUrl}:`, fetchErr);
      fetchFailed = true;
    }

    // If fetch failed, still return the domain-derived store name (don't return all nulls)
    if (fetchFailed) {
      return json({ name: null, price: null, store: domainStore, image_url: null, error: "Could not fetch URL" });
    }

    // Step 4: AI fallback via Supabase AI — only if name still missing
    if (!name) {
      try {
        const session = new Supabase.ai.Session("openai/gpt-4o-mini");
        const prompt = [
          "Given this product page title and URL, extract the item name and price.",
          `URL: ${targetUrl}`,
          pageTitle ? `Page title: ${pageTitle}` : "",
          "",
          'Return ONLY valid JSON (no markdown, no explanation): { "name": "...", "price": 12.99 }',
          "If a field cannot be determined, use null.",
        ].filter(Boolean).join("\n");

        const result = await session.run(prompt, { stream: false }) as any;
        const content = typeof result === "string" ? result : result?.choices?.[0]?.message?.content ?? "";
        const cleaned = content.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        if (!name && parsed.name) name = cleanProductName(String(parsed.name));
        if (price === null && parsed.price != null) price = parsePrice(String(parsed.price));
        // Note: store is NOT overridden by AI — domain lookup already handled it
      } catch (aiErr) {
        console.warn("[url-preview] AI fallback failed (skipping):", aiErr);
      }
    }

    return json({ name, price, store, image_url });
  }

  // POST /api/share
  if (method === "POST" && rawPath === "/api/share") {
    const body = await req.json();
    const { wishlist_id } = body;
    if (!wishlist_id) return json({ error: "wishlist_id is required" }, 400);

    // Idempotent: return existing token if one already exists for this wishlist
    const { data: existing } = await supabase
      .from("share_tokens")
      .select("token")
      .eq("wishlist_id", wishlist_id)
      .maybeSingle();

    if (existing?.token) {
      return json({ token: existing.token, share_url: `https://whythankyou.com/list/${existing.token}` });
    }

    // Generate a new token
    const token = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    const { error } = await supabase.from("share_tokens").insert({ wishlist_id, token });
    if (error) return json({ error: error.message }, 500);
    return json({ token, share_url: `https://whythankyou.com/list/${token}` }, 201);
  }

  // GET /api/guest/:token
  const guestMatch = rawPath.match(/^\/api\/guest\/([^/]+)$/);
  if (method === "GET" && guestMatch) {
    const token = guestMatch[1];

    // Look up the token
    const { data: tokenRow, error: tokenErr } = await supabase
      .from("share_tokens")
      .select("wishlist_id")
      .eq("token", token)
      .maybeSingle();

    if (tokenErr) return json({ error: tokenErr.message }, 500);
    if (!tokenRow) return json({ error: "Token not found" }, 404);

    const wishlistId = tokenRow.wishlist_id;

    // Fetch wishlist
    const { data: wishlist, error: wErr } = await supabase
      .from("wishlists")
      .select("id, name, person, occasion, occasion_date, child_age, clothing_size, shoe_size, current_interests, avatar_url, item_count, claimed_count")
      .eq("id", wishlistId)
      .single();

    if (wErr) return json({ error: wErr.message }, 500);

    // Fetch items. Read claimed from wishlist_items.claimed (authoritative boolean)
    // AND item_claims presence — OR of both so any inconsistency shows as claimed.
    const { data: itemRows, error: iErr } = await supabase
      .from("wishlist_items")
      .select(`id, name, price, store, store_url, notes, image_url, created_at, claimed, item_claims ( id )`)
      .eq("wishlist_id", wishlistId)
      .order("created_at", { ascending: true });

    if (iErr) return json({ error: iErr.message }, 500);

    // isClaimed = true if EITHER the claimed flag is set OR a claim row exists.
    // This keeps the GET consistent with the POST guard even when the two are
    // temporarily out of sync (e.g. trigger had an error but the explicit UPDATE ran).
    const items = (itemRows ?? []).map((item: any) => {
      const isClaimed = item.claimed === true ||
        (Array.isArray(item.item_claims) && item.item_claims.length > 0);
      return {
        id: item.id,
        name: item.name,
        price: item.price,
        store: item.store,
        store_url: item.store_url,
        notes: item.notes,
        image_url: item.image_url,
        status: isClaimed ? "claimed" : "available",
      };
    });

    return json({ wishlist, items });
  }

  // POST /api/claims
  if (method === "POST" && rawPath === "/api/claims") {
    const body = await req.json();
    const { item_id, claimer_name, claimer_email, claimer_note } = body;
    if (!item_id || !claimer_name) return json({ error: "item_id and claimer_name are required" }, 400);

    // Fetch item + wishlist details needed for claimed check and email.
    const { data: itemRow, error: itemErr } = await supabase
      .from("wishlist_items")
      .select("id, name, store_url, claimed, wishlists(id, name, person, user_id)")
      .eq("id", item_id)
      .maybeSingle();

    if (itemErr) {
      console.error("[POST /api/claims] item lookup:", JSON.stringify(itemErr));
      return json({ error: itemErr.message }, 500);
    }
    if (!itemRow) return json({ error: "Item not found" }, 404);
    if (itemRow.claimed) return json({ error: "Item already claimed" }, 409);

    // Insert claim row. The trigger on item_claims syncs wishlist_items.claimed.
    const { data: claim, error: claimErr } = await supabase
      .from("item_claims")
      .insert({
        item_id,
        claimer_name,
        claimer_email: claimer_email ?? null,
        claimer_note: claimer_note ?? null,
      })
      .select("id, item_id, claimer_name, created_at")
      .single();

    if (claimErr) {
      console.error("[POST /api/claims] insert:", JSON.stringify(claimErr));
      if (claimErr.code === "23505") return json({ error: "Item already claimed" }, 409);
      return json({ error: claimErr.message, details: claimErr }, 500);
    }

    // Belt-and-suspenders sync (trigger handles it, but do it explicitly too).
    const { error: syncErr } = await supabase
      .from("wishlist_items")
      .update({ claimed: true })
      .eq("id", item_id);
    if (syncErr) {
      console.error("[POST /api/claims] wishlist_items sync:", JSON.stringify(syncErr));
    }

    // Send confirmation emails. Failures are logged but never block the response.
    const wishlist = Array.isArray(itemRow.wishlists) ? itemRow.wishlists[0] : itemRow.wishlists as any;
    const listName = wishlist?.name ?? "the wishlist";
    const personName = wishlist?.person ?? null;
    const itemName = itemRow.name;
    const storeUrl = itemRow.store_url ?? null;
    const shopLink = storeUrl
      ? `<p style="margin:16px 0;"><a href="${storeUrl}" style="background:#e8705a;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Shop ${itemName}</a></p>`
      : "";
    const noteHtml = claimer_note
      ? `<p style="margin:8px 0;color:#666;">Note: <em>${claimer_note}</em></p>`
      : "";

    // Email to claimer (if email provided)
    if (claimer_email) {
      const giverSubject = `You're all set to get a gift from ${listName}!`;
      const giverHtml = `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#333;">
          <h2 style="color:#e8705a;">You're all set! 🎁</h2>
          <p>Hi ${claimer_name},</p>
          <p>Thanks for letting the list know you're planning to get <strong>${itemName}</strong>${personName ? ` for ${personName}` : ""}.</p>
          ${shopLink}
          <p style="color:#888;font-size:0.9em;">If the list owner needs shipping details, they'll contact you directly at this email address.</p>
        </div>`;
      sendEmail(claimer_email, giverSubject, giverHtml).catch(() => {});
    }

    // Email to list owner
    if (wishlist?.user_id) {
      const { data: ownerData } = await supabase.auth.admin.getUserById(wishlist.user_id);
      const ownerEmail = ownerData?.user?.email;
      if (ownerEmail) {
        const ownerSubject = `${claimer_name} is planning to get a gift from ${listName}`;
        const ownerHtml = `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#333;">
            <h2 style="color:#e8705a;">Great news! 🎁</h2>
            <p><strong>${claimer_name}</strong> is planning to get <strong>${itemName}</strong>${personName ? ` for ${personName}` : ""}.</p>
            <p style="margin:8px 0;">Their email: <a href="mailto:${claimer_email ?? ""}">${claimer_email ?? "not provided"}</a></p>
            ${noteHtml}
            <p style="color:#888;font-size:0.9em;">You can reach out to them directly if you need to share shipping details.</p>
          </div>`;
        sendEmail(ownerEmail, ownerSubject, ownerHtml).catch(() => {});
      }
    }

    return json({ claim }, 201);
  }

  // DELETE /api/claims/:itemId
  const claimsMatch = rawPath.match(/^\/api\/claims\/([^/]+)$/);
  if (method === "DELETE" && claimsMatch) {
    const itemId = claimsMatch[1];
    const { error } = await supabase.from("item_claims").delete().eq("item_id", itemId);
    if (error) return json({ error: error.message }, 500);
    return json({ success: true });
  }

  return json({ error: "Not found" }, 404);
});
