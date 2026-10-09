// Keep SSE frames uncompressed and close cleanly on browser/session disconnects.
export async function GET(request: Request) {
  const abort = new AbortController();
  const onAbort = () => abort.abort();
  request.signal.addEventListener("abort", onAbort, { once: true });
  if (request.signal.aborted) abort.abort();
  const cleanup = () => request.signal.removeEventListener("abort", onAbort);
  try {
    const backend = process.env.BACKEND_URL ?? "http://localhost:8080";
    const upstream = await fetch(`${backend}/api/notifications/stream`, {
      headers: { Cookie: request.headers.get("cookie") ?? "", Accept: "text/event-stream", "Accept-Encoding": "identity" },
      signal: abort.signal, cache: "no-store", redirect: "manual",
    });
    const reader = upstream.body?.getReader();
    let closed = false;
    const body = reader ? new ReadableStream<Uint8Array>({
      async pull(target) {
        try {
          const chunk = await reader.read();
          if (closed) return;
          if (chunk.done) { closed = true; cleanup(); target.close(); }
          else target.enqueue(chunk.value);
        } catch {
          // A closed session or upstream connection ends the stream. EventSource
          // reconnects and REST rechecks authentication/state; don't fail Next piping.
          if (!closed) { closed = true; cleanup(); target.close(); }
        }
      },
      async cancel() {
        closed = true; cleanup(); abort.abort();
        await reader.cancel().catch(() => {});
      },
    }) : null;
    if (!reader) cleanup();
    return new Response(body, { status: upstream.status, headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "text/event-stream",
      "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no",
    } });
  } catch {
    cleanup();
    return Response.json({ code: "STREAM_UNAVAILABLE", message: "실시간 서버에 연결할 수 없습니다." }, { status: 503 });
  }
}
