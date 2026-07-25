/**
 * Shared response shape and error handling for every route handler.
 *
 * The frontend is built against these two shapes and nothing else:
 *   success -> { ok: true,  ...payload }
 *   failure -> { ok: false, error: { code, message } }
 *
 * Keeping the discriminator on `ok` means the frontend can branch once and
 * never has to guess whether a 200 body is a result or an error.
 */
import { NextResponse } from "next/server";

export type ApiError = { code: string; message: string };

export function ok<T extends object>(payload: T, status = 200) {
  return NextResponse.json({ ok: true, ...payload }, { status });
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

/** Parse a JSON body, returning a typed error instead of throwing on bad input. */
export async function readJson<T>(request: Request): Promise<{ body: T } | { error: Response }> {
  try {
    const body = (await request.json()) as T;
    if (!body || typeof body !== "object") {
      return { error: fail("INVALID_BODY", "Request body must be a JSON object.", 400) };
    }
    return { body };
  } catch {
    return { error: fail("INVALID_JSON", "Request body was not valid JSON.", 400) };
  }
}

/**
 * Map anything thrown inside a handler onto our error envelope. DTP and HOLON
 * errors both carry a `code`, so we surface it rather than flattening
 * everything to INTERNAL_ERROR — the frontend shows it during the demo.
 */
export function handleError(error: unknown) {
  const err = error as { code?: string; message?: string; details?: { status?: number } };
  const code = typeof err?.code === "string" ? err.code : "INTERNAL_ERROR";
  const message = err?.message ?? "Unexpected server error.";

  // Preserve auth/permission semantics; everything else is a 500 to the caller.
  const upstream = err?.details?.status;
  const status =
    upstream === 401 || upstream === 403 ? 403 : upstream === 404 ? 404 : upstream === 400 ? 400 : 500;

  console.error("[cortex] route error:", code, message);
  return fail(code, message, status);
}
