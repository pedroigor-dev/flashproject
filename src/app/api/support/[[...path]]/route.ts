import { cookies } from 'next/headers';
import { randomBytes } from 'node:crypto';

export const runtime = 'nodejs';

async function proxy(request: Request, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  const endpoint = path.join('/');
  const allowed =
    request.method === 'GET'
      ? endpoint === '' || /^cases\/[a-f0-9-]{36}\/attachments\/[a-f0-9-]{36}$/.test(endpoint)
      : endpoint === 'cases' ||
        /^cases\/[a-f0-9-]{36}\/(merchant|attachments|simulate|advice)$/.test(endpoint);
  if (!allowed) {
    return Response.json({ message: 'Rota não encontrada.' }, { status: 404 });
  }
  if (request.method !== 'GET') {
    const origin = request.headers.get('origin');
    try {
      if (!origin || new URL(origin).host !== request.headers.get('host')) {
        return Response.json({ message: 'Origem não permitida.' }, { status: 403 });
      }
    } catch {
      return Response.json({ message: 'Origem não permitida.' }, { status: 403 });
    }
  }
  const jar = await cookies();
  let session = jar.get('flash-support')?.value;
  if (!session || !/^[a-f0-9]{64}$/.test(session)) {
    session = randomBytes(32).toString('hex');
    jar.set('flash-support', session, {
      httpOnly: true,
      sameSite: 'strict',
      secure: new URL(request.url).protocol === 'https:',
      maxAge: 60 * 60 * 24 * 30,
      path: '/api/support',
    });
  }
  try {
    let body: Uint8Array | undefined;
    if (request.method !== 'GET') {
      const reader = request.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader) {
        while (true) {
          const result = await reader.read();
          if (result.done) {
            break;
          }
          size += result.value.byteLength;
          if (size > 5 * 1024 * 1024 + 16384) {
            await reader.cancel();
            return Response.json({ message: 'O arquivo deve ter até 5 MB.' }, { status: 413 });
          }
          chunks.push(result.value);
        }
      }
      body = Buffer.concat(chunks);
    }
    const headers = new Headers({ 'x-support-session': session });
    for (const name of ['content-type', 'idempotency-key']) {
      const value = request.headers.get(name);
      if (value) {
        headers.set(name, value);
      }
    }
    const upstream = await fetch(
      `${process.env.FLASH_BACKEND_URL || 'http://127.0.0.1:4000'}/api/support${endpoint ? '/' + endpoint : ''}`,
      {
        method: request.method,
        headers,
        body: body as BodyInit | undefined,
        redirect: 'manual',
        cache: 'no-store',
        signal: AbortSignal.any([
          request.signal,
          AbortSignal.timeout(endpoint.endsWith('/advice') ? 50000 : 30000),
        ]),
      },
    );
    const outgoing = new Headers({ 'Cache-Control': 'no-store' });
    for (const name of ['content-type', 'content-disposition', 'location']) {
      const value = upstream.headers.get(name);
      if (value) {
        outgoing.set(name, value);
      }
    }
    return new Response(upstream.body, { status: upstream.status, headers: outgoing });
  } catch {
    return Response.json(
      { message: 'A central está temporariamente indisponível. Tente novamente em instantes.' },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
