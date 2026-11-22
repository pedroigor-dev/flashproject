const streamType = 'application/x-ndjson';

type Reply = {
  text: string;
  provider?: string;
  sources?: { title: string; url: string }[];
};

function validReply(value: Reply): Reply {
  if (typeof value?.text !== 'string' || !value.text.trim()) {
    throw new Error('A resposta veio vazia. Tente novamente.');
  }
  return value;
}

export async function requestChatReply(
  url: string,
  init: RequestInit,
  onText: (text: string) => void,
): Promise<Reply> {
  const headers = new Headers(init.headers);
  headers.set('Accept', streamType);
  const response = await fetch(url, { ...init, headers, cache: 'no-store' });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      typeof error?.message === 'string'
        ? error.message
        : 'Não foi possível responder agora. Tente novamente.',
    );
  }
  if (!response.headers.get('content-type')?.startsWith(streamType)) {
    return validReply(await response.json());
  }
  if (!response.body) throw new Error('A resposta veio vazia. Tente novamente.');

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let pending = '';
  let displayed = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (!done) pending += value;
      const lines = pending.split('\n');
      pending = done ? '' : (lines.pop() ?? '');
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (['delta', 'text'].includes(event.type) && typeof event.text === 'string') {
          displayed = event.type === 'delta' ? displayed + event.text : event.text;
          onText(displayed);
        }
        if (event.type === 'done') return validReply(event.answer);
        if (event.type === 'error') throw new Error(event.message);
      }
      if (done) throw new Error('A resposta foi interrompida. Tente novamente.');
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
