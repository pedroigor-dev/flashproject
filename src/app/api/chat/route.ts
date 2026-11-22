export const runtime = 'nodejs';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      const caller = new URL(origin);
      if (
        !['http:', 'https:'].includes(caller.protocol) ||
        caller.host !== request.headers.get('host')
      ) {
        return Response.json({ message: 'Origem não permitida.' }, { status: 403 });
      }
    } catch {
      return Response.json({ message: 'Origem não permitida.' }, { status: 403 });
    }
  }
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 96000) {
      return Response.json({ message: 'Conversa muito longa.' }, { status: 413 });
    }
    const payload = JSON.parse(raw);
    const upstream = await fetch(
      `${process.env.FLASH_BACKEND_URL || 'http://127.0.0.1:4000'}/api/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: request.headers.get('accept') ?? 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(50000)]),
        cache: 'no-store',
      },
    );
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/json',
        'Cache-Control': 'no-store, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ message: 'Mensagem inválida.' }, { status: 400 });
    }
    return Response.json(
      {
        message:
          'Não foi possível conectar ao Flashinho. Confira se o backend está em execução e tente novamente.',
      },
      { status: 503 },
    );
  }
}
