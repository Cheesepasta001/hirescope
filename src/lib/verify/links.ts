/**
 * Verification of professional links the candidate supplied themselves.
 *
 * Ground rules, enforced here rather than left to the caller:
 *   1. Only URLs the candidate put on their own resume or entered in the form.
 *      Nothing discovered, nothing searched for, nothing guessed from their name.
 *   2. Only public, purpose-built professional endpoints — a public GitHub
 *      profile, an ORCID record, their own portfolio. These exist to be read by
 *      prospective employers; a personal social account does not.
 *   3. Requires consentLinkCheck on the candidate record.
 *   4. Every result is candidate-visible and rebuttable before any decision.
 *   5. Facts only: does the account exist, is the public activity consistent with
 *      the claim. Never a character read, never anything about who they are.
 */

export type LinkKind = "github" | "linkedin" | "portfolio" | "scholar" | "orcid" | "other";

export type LinkCheck = {
  url: string;
  kind: LinkKind;
  status: "verified" | "unreachable" | "mismatch" | "not_checked";
  detail: string;
  facts?: Record<string, unknown>;
};

const ALLOWED_HOSTS: Record<string, LinkKind> = {
  "github.com": "github",
  "www.github.com": "github",
  "orcid.org": "orcid",
  "scholar.google.com": "scholar",
};

/**
 * LinkedIn is explicitly refused rather than silently skipped, so the reason
 * shows up in the audit trail instead of looking like a bug.
 */
const REFUSED_HOSTS: Record<string, string> = {
  "linkedin.com": "LinkedIn prohibits automated access in its terms of service. Ask the candidate to share their profile directly if you need it.",
  "www.linkedin.com": "LinkedIn prohibits automated access in its terms of service. Ask the candidate to share their profile directly if you need it.",
  "twitter.com": "Personal social accounts are out of scope: they surface protected characteristics and create EEOC exposure.",
  "x.com": "Personal social accounts are out of scope: they surface protected characteristics and create EEOC exposure.",
  "facebook.com": "Personal social accounts are out of scope: they surface protected characteristics and create EEOC exposure.",
  "www.facebook.com": "Personal social accounts are out of scope: they surface protected characteristics and create EEOC exposure.",
  "instagram.com": "Personal social accounts are out of scope: they surface protected characteristics and create EEOC exposure.",
};

export async function checkLinks(
  links: { url: string; kind: LinkKind }[],
  opts: { consentGiven: boolean },
): Promise<LinkCheck[]> {
  if (!opts.consentGiven) {
    return links.map((l) => ({
      ...l,
      status: "not_checked" as const,
      detail: "The candidate did not consent to link verification.",
    }));
  }

  return Promise.all(links.map((l) => checkOne(l)));
}

async function checkOne(link: { url: string; kind: LinkKind }): Promise<LinkCheck> {
  let host: string;
  try {
    host = new URL(link.url).hostname.toLowerCase();
  } catch {
    return { ...link, status: "unreachable", detail: "Not a valid URL." };
  }

  if (REFUSED_HOSTS[host]) {
    return { ...link, status: "not_checked", detail: REFUSED_HOSTS[host] };
  }

  const kind = ALLOWED_HOSTS[host];
  if (kind === "github") return checkGithub(link.url);

  // Everything else: a plain reachability check on a URL the candidate gave us.
  // No content is stored, no pages are crawled beyond the one they linked.
  try {
    const res = await fetch(link.url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "HireScope link verification (candidate-consented)" },
    });
    return {
      ...link,
      status: res.ok ? "verified" : "unreachable",
      detail: res.ok
        ? `Reachable (HTTP ${res.status}). Contents not inspected.`
        : `Returned HTTP ${res.status}.`,
    };
  } catch {
    return { ...link, status: "unreachable", detail: "Did not respond within 6 seconds." };
  }
}

/**
 * Public GitHub profile facts via the documented API. Deliberately limited to
 * account-level metadata that speaks to the professional claim; no commit
 * contents, no email harvesting, no follower graph.
 */
async function checkGithub(url: string): Promise<LinkCheck> {
  const m = /github\.com\/([A-Za-z0-9-]+)\/?$/.exec(url);
  if (!m) {
    return {
      url, kind: "github", status: "not_checked",
      detail: "Only a top-level GitHub profile URL is checked, not individual repositories.",
    };
  }
  const username = m[1];

  try {
    const res = await fetch(`https://api.github.com/users/${username}`, {
      signal: AbortSignal.timeout(6000),
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "HireScope link verification (candidate-consented)",
      },
    });
    if (res.status === 404) {
      return { url, kind: "github", status: "mismatch", detail: `No public GitHub account named "${username}".` };
    }
    if (!res.ok) {
      return { url, kind: "github", status: "unreachable", detail: `GitHub API returned HTTP ${res.status}.` };
    }

    const data = (await res.json()) as {
      login: string; public_repos: number; created_at: string; name: string | null;
    };
    const accountAgeYears = (Date.now() - new Date(data.created_at).getTime()) / (365.25 * 24 * 3600 * 1000);

    return {
      url,
      kind: "github",
      status: "verified",
      detail:
        `Public account exists: ${data.public_repos} public repositories, opened `
        + `${accountAgeYears.toFixed(1)} years ago. Repository contents were not analysed, and `
        + `public repository count is a weak proxy for skill — plenty of strong engineers work `
        + `entirely in private repositories.`,
      facts: {
        login: data.login,
        publicRepos: data.public_repos,
        accountAgeYears: Number(accountAgeYears.toFixed(1)),
      },
    };
  } catch {
    return { url, kind: "github", status: "unreachable", detail: "GitHub did not respond within 6 seconds." };
  }
}
