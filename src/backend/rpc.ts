/**
 * Shared handler for the /api/pricing/* routes: reads `{ args: [...] }` from the
 * request body, spreads it into the backend method, and returns `{ result }`.
 */
export async function handleRpc(
  request: Request,
  route: string,
  method: (...args: any[]) => unknown
): Promise<Response> {
  let args: unknown[] = [];
  try {
    const body = await request.json();
    if (Array.isArray(body?.args)) {
      args = body.args;
    }
  } catch {
    // Empty or non-JSON body: call the method with no arguments.
  }

  try {
    const result = await method(...args);
    return Response.json({ result: result ?? null });
  } catch (error) {
    const details = (error as any)?.details?.applicationError;
    console.error(
      `[api/pricing] ${route} failed | status=${details?.code ?? 500} | message=${
        error instanceof Error ? error.message : String(error)
      } | requestId=${(error as any)?.details?.requestId ?? 'none'}`
    );
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
