import { useEffect, useState } from "react";
import { API } from "./api";

// Client-side translation cache (mirrors the server cache) so a given string is
// only ever sent to Cortex once per language, and re-renders are instant.
const mem = new Map<string, string>();
const keyOf = (target: string, text: string) => `${target}${text}`;

function cacheGet(target: string, text: string): string | undefined {
  const k = keyOf(target, text);
  if (mem.has(k)) return mem.get(k);
  try {
    const v = sessionStorage.getItem("t8n:" + k);
    if (v != null) { mem.set(k, v); return v; }
  } catch { /* ignore */ }
  return undefined;
}
function cacheSet(target: string, text: string, val: string) {
  const k = keyOf(target, text);
  mem.set(k, val);
  try { sessionStorage.setItem("t8n:" + k, val); } catch { /* ignore */ }
}

// translateTexts returns each input translated to `target` (order preserved).
// Only cache-misses are sent to POST /api/translate; failures fall back to the
// original text so the UI never breaks.
export async function translateTexts(target: "ar" | "en", texts: string[]): Promise<string[]> {
  const out = texts.slice();
  const missIdx: number[] = [];
  const miss: string[] = [];
  texts.forEach((t, i) => {
    if (!t || !t.trim()) return;
    const c = cacheGet(target, t);
    if (c !== undefined) out[i] = c;
    else { missIdx.push(i); miss.push(t); }
  });
  if (miss.length === 0) return out;
  try {
    const r = await fetch(`${API}/api/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, texts: miss }),
    });
    if (r.ok) {
      const d = (await r.json()) as { translations?: string[] };
      (d.translations ?? []).forEach((tr, j) => {
        const i = missIdx[j];
        if (typeof tr === "string" && tr) { out[i] = tr; cacheSet(target, miss[j], tr); }
      });
    }
  } catch { /* keep originals */ }
  return out;
}

// useTranslated aligns a translated array to the inputs. When `enabled` is false
// (e.g. English UI), the originals are returned unchanged. While translation is in
// flight, originals show, then swap in when ready.
export function useTranslated(texts: (string | null | undefined)[], enabled: boolean): string[] {
  const base = texts.map((t) => t ?? "");
  const [out, setOut] = useState<string[]>(base);
  const sig = base.join("");
  useEffect(() => {
    if (!enabled) { setOut(base); return; }
    let alive = true;
    translateTexts("ar", base).then((r) => { if (alive) setOut(r); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, enabled]);
  return enabled ? out : base;
}

// useTranslatedMarkdown translates a markdown body by paragraph (so no single
// chunk exceeds the endpoint's per-string limit), then rejoins it.
export function useTranslatedMarkdown(md: string | null | undefined, enabled: boolean): string {
  const parts = (md ?? "").split(/\n\n+/);
  const translated = useTranslated(parts, enabled);
  return enabled ? translated.join("\n\n") : md ?? "";
}
