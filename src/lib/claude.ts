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
  homework: "high",
  search: "low",
} as const;

/**
 * Retry policy.
 *
 * The spec asks for "retry, and if that fails tell the user". Retry needs a
 * bound: this app is cost-sensitive and an unbounded loop against Opus is an
 * unbounded bill. Two extra attempts with exponential backoff and jitter covers
 * the transient cases (rate limit, overloaded, a dropped connection) and gives
 * up promptly on the ones that will never succeed.
 */
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 800;

/** Errors worth trying again. Auth and bad-request failures are not. */
function isTransient(error: unknown): boolean {
  if (error instanceof Anthropic.RateLimitError) return true;
  if (error instanceof Anthropic.APIConnectionError) return true;
  if (error instanceof Anthropic.InternalServerError) return true;
  if (error instanceof Anthropic.APIError) {
    return error.status === 408 || error.status === 429 || (error.status ?? 0) >= 500;
  }
  return false;
}

/**
 * Raised when the model could not be reached after every attempt. Routes turn
 * this into a recoverable state the user can retry from, rather than an error
 * that loses their work.
 */
export class ModelUnavailableError extends Error {
  readonly attempts: number;
  readonly cause: unknown;

  constructor(attempts: number, cause: unknown) {
    super(
      "The interview model could not be reached. Nothing you have written has been lost — "
      + "try again in a moment.",
    );
    this.name = "ModelUnavailableError";
    this.attempts = attempts;
    this.cause = cause;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run a model call with bounded retries. Non-transient failures propagate
 * immediately so a missing API key surfaces as a missing API key rather than as
 * three slow retries and a vague timeout.
 */
export async function withRetry<T>(call: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await call();
    } catch (error) {
      lastError = error;
      if (!isTransient(error) || attempt === MAX_ATTEMPTS) break;
      // Exponential, with jitter so concurrent interviews do not retry in lockstep.
      await sleep(BASE_DELAY_MS * 2 ** (attempt - 1) + Math.random() * 250);
    }
  }

  if (isTransient(lastError)) throw new ModelUnavailableError(MAX_ATTEMPTS, lastError);
  throw lastError;
}

/**
 * Same, plus one extra attempt when the model returns something the output
 * schema cannot parse. That is rare with structured outputs but not impossible,
 * and it is cheaper to ask again than to fail a candidate mid-interview.
 */
export async function parseWithRetry<T extends { parsed_output?: unknown }>(
  call: () => Promise<T>,
): Promise<T> {
  const first = await withRetry(call);
  if (first.parsed_output) return first;
  return withRetry(call);
}

/** Human-readable API failure, so route handlers can return something useful. */
export function describeApiError(error: unknown): {
  status: number;
  message: string;
  /** True when retrying the same request could plausibly work. */
  retryable: boolean;
} {
  if (error instanceof ModelUnavailableError) {
    return { status: 503, message: error.message, retryable: true };
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return {
      status: 500,
      message: "ANTHROPIC_API_KEY is missing or invalid. Set it in .env and restart.",
      retryable: false,
    };
  }
  if (error instanceof Anthropic.RateLimitError) {
    return { status: 429, message: "Rate limited by the Claude API. Retry in a moment.", retryable: true };
  }
  if (error instanceof Anthropic.BadRequestError) {
    return { status: 400, message: `Bad request to the Claude API: ${error.message}`, retryable: false };
  }
  if (error instanceof Anthropic.APIError) {
    const status = error.status ?? 502;
    return { status, message: `Claude API error: ${error.message}`, retryable: status >= 500 };
  }
  return {
    status: 500,
    message: error instanceof Error ? error.message : "Unknown error",
    retryable: false,
  };
}
