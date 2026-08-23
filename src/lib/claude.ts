import Anthropic from "@anthropic-ai/sdk";

// Zero-arg constructor: the SDK resolves ANTHROPIC_API_KEY (or an `ant auth
// login` profile) from the environment. Never hardcode a key.
export const claude = new Anthropic();

export const MODEL = "claude-opus-5";

// Effort is the main cost/quality dial. Live interview turns need to come back
// fast, so they run lower; the end-of-interview assessment is the decision that
// actually matters, so it runs high.
export const EFFORT = {
  interviewTurn: "medium",
  extraction: "medium",
  assessment: "high",
  search: "low",
} as const;

/** Human-readable API failure, so route handlers can return something useful. */
export function describeApiError(error: unknown): { status: number; message: string } {
  if (error instanceof Anthropic.AuthenticationError) {
    return { status: 500, message: "ANTHROPIC_API_KEY is missing or invalid. Set it in .env and restart." };
  }
  if (error instanceof Anthropic.RateLimitError) {
    return { status: 429, message: "Rate limited by the Claude API. Retry in a moment." };
  }
  if (error instanceof Anthropic.BadRequestError) {
    return { status: 400, message: `Bad request to the Claude API: ${error.message}` };
  }
  if (error instanceof Anthropic.APIError) {
    return { status: error.status ?? 502, message: `Claude API error: ${error.message}` };
  }
  return { status: 500, message: error instanceof Error ? error.message : "Unknown error" };
}
