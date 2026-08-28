/**
 * Reading a JSON response without hiding the real failure.
 *
 * `await res.json()` throws "Unexpected end of JSON input" whenever the server
 * returns something that is not JSON — an empty 500 from an unhandled route
 * error, a proxy's HTML error page, a gateway timeout. The parse error then
 * replaces the actual cause on screen, and the person reading it goes looking
 * for a JSON bug that does not exist. That happened here: a database that was
 * not reachable surfaced as a parse error under the passcode box, which made it
 * look like the passcode was wrong.
 *
 * So: read the body as text first, try to parse it, and if it will not parse,
 * report the status and a slice of whatever did come back.
 */
export async function readJsonResponse<T>(
  res: Response,
  fallbackMessage: string,
): Promise<T> {
  const text = await res.text();

  let parsed: unknown = null;
  if (text.trim()) {
    try {
      parsed = JSON.parse(text);
    } catch {
      // Not JSON. Fall through to the status-based message below.
    }
  }

  if (parsed && typeof parsed === "object") {
    const body = parsed as { error?: unknown };
    if (!res.ok) {
      throw new Error(typeof body.error === "string" ? body.error : fallbackMessage);
    }
    return parsed as T;
  }

  // Nothing parseable came back.
  if (!res.ok) {
    const detail = text.trim().slice(0, 160);
    throw new Error(
      detail
        ? `${fallbackMessage} (HTTP ${res.status}: ${detail})`
        : `${fallbackMessage} (HTTP ${res.status}, empty response — check the server log)`,
    );
  }
  throw new Error(`${fallbackMessage} The server returned an empty response.`);
}
