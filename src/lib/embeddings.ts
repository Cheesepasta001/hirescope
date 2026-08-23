/**
 * Pluggable embeddings.
 *
 * Voyage when VOYAGE_API_KEY is set (Anthropic has no embeddings endpoint;
 * Voyage is the recommended pairing). Otherwise a deterministic local lexical
 * embedding so the project runs with one API key and no extra signup.
 *
 * The local fallback is genuinely worse — it matches words, not meaning, so
 * "PyTorch" will not find "deep learning framework". That is acceptable for a
 * demo corpus and not acceptable in production; the search layer compensates by
 * combining semantic rank with a structured tag filter, and the tag filter is
 * doing most of the work either way.
 */

const DIM = 512;

export async function embed(text: string): Promise<number[]> {
  const key = process.env.VOYAGE_API_KEY;
  if (key) {
    try {
      return await voyageEmbed(text, key);
    } catch {
      // A failed embedding must not fail a candidate's submission.
      return localEmbed(text);
    }
  }
  return localEmbed(text);
}

export function usingRealEmbeddings(): boolean {
  return Boolean(process.env.VOYAGE_API_KEY);
}

async function voyageEmbed(text: string, key: string): Promise<number[]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "voyage-3",
      input: [text.slice(0, 30_000)],
      input_type: "document",
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Voyage returned HTTP ${res.status}`);
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data[0].embedding;
}

/**
 * Hashed bag-of-bigrams, L2-normalised. Deterministic, no network, no state.
 */
function localEmbed(text: string): number[] {
  const vec = new Array<number>(DIM).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));

  const add = (term: string, weight: number) => {
    vec[hash(term) % DIM] += weight;
  };

  for (let i = 0; i < tokens.length; i++) {
    add(tokens[i], 1);
    if (i + 1 < tokens.length) add(`${tokens[i]}_${tokens[i + 1]}`, 0.6);
  }

  const norm = Math.sqrt(vec.reduce((a, b) => a + b * b, 0)) || 1;
  return vec.map((v) => v / norm);
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "was", "were", "are", "has",
  "have", "had", "our", "their", "her", "his", "its", "you", "your", "not", "but",
  "all", "any", "can", "will", "would", "should", "could", "into", "over", "than",
  "then", "them", "they", "been", "being", "more", "most", "such", "also", "very",
]);
