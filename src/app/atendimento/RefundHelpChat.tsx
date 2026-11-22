import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowUp, X } from 'lucide-react';
import Markdown from 'react-markdown';
import messageStyles from '@/components/ChatMessage.module.css';
import Flashinho from '@/components/Flashinho';
import { requestChatReply } from '@/lib/chatReply';
import styles from './RefundTour.module.css';

type Message = { id: string; role: 'user' | 'assistant'; content: string };

function requestsTour(message: string) {
  const normalized = message
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
  const cleaned = normalized
    .replace(/[.!?,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return /^(?:(?:oi|ola|flashinho) )*(?:(?:eu )?quero (?:ver |fazer |retomar |ativar |comecar )?|(?:pode |poderia )?(?:me )?(?:ativar|iniciar|retomar|mostrar|comecar|abre|abra|ativa|ative|mostra|mostre|retoma|reiniciar|recomecar) |(?:me )?guia (?:pelo )?)?(?:um |o |seu |esse )?(?:tour|tutorial|passo a passo)(?: (?:por favor|de novo|novamente|daqui|para mim))*$/.test(
    cleaned,
  );
}

export default function RefundHelpChat({
  open,
  caseId,
  label,
  guidance,
  onClose,
  onTour,
}: {
  open: boolean;
  caseId?: string;
  label: string;
  guidance: string;
  onClose: () => void;
  onTour: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const followsReply = useRef(true);
  const request = useRef<AbortController | null>(null);
  const [visibleReply, setVisibleReply] = useState<Message | null>(null);
  const displayedMessages = visibleReply ? [...messages, visibleReply] : messages;

  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (open) {
      followsReply.current = true;
      input.current?.focus({ preventScroll: true });
    }
  }, [open]);

  useEffect(() => {
    const log = transcript.current;
    if (log && followsReply.current) log.scrollTop = log.scrollHeight;
  }, [open, messages, sending, error, visibleReply]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question) return;

    if (requestsTour(question)) {
      setDraft('');
      setError('');
      onTour();
      return;
    }

    if (request.current) return;
    followsReply.current = true;

    const history = messages.slice(-12).map(({ role, content }) => ({
      role,
      content: content.slice(0, 4000),
    }));
    const userMessage = { role: 'user' as const, content: question };
    const pending = new AbortController();
    const answerId = crypto.randomUUID();
    request.current = pending;
    setMessages([...messages, { ...userMessage, id: crypto.randomUUID() }]);
    setDraft('');
    setError('');
    setSending(true);

    const init = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: pending.signal,
    };

    try {
      const result = await requestChatReply(
        caseId ? `/api/support/cases/${caseId}/advice` : '/api/chat',
        {
          ...init,
          body: JSON.stringify(
            caseId ? { question, history } : { messages: [...history, userMessage] },
          ),
        },
        (content) => {
          if (!pending.signal.aborted) {
            setVisibleReply({ id: answerId, role: 'assistant', content });
          }
        },
      );
      if (pending.signal.aborted) return;
      setMessages((previous) => [
        ...previous,
        { id: answerId, role: 'assistant', content: result.text },
      ]);
    } catch (failure) {
      if (pending.signal.aborted) return;
      setMessages((previous) => previous.slice(0, -1));
      setDraft((current) => current || question);
      setError(failure instanceof Error ? failure.message : 'Tente enviar a mensagem de novo.');
    } finally {
      if (!pending.signal.aborted) {
        setVisibleReply(null);
        setSending(false);
        request.current = null;
      }
    }
  }

  if (!open) return null;

  return (
    <aside id="flashinho-stage-help" className={styles.chatPanel} aria-label="Chat do Flashinho">
      <header className={styles.chatHeader}>
        <Flashinho />
        <div>
          <h2>Flashinho</h2>
          <small>{label}</small>
        </div>
        <button type="button" aria-label="Fechar ajuda" onClick={onClose}>
          <X size={19} />
        </button>
      </header>
      <div
        ref={transcript}
        className={styles.transcript}
        role="log"
        aria-label="Mensagens do chat"
        aria-busy={Boolean(visibleReply)}
        onScroll={({ currentTarget }) => {
          followsReply.current =
            currentTarget.scrollHeight - currentTarget.clientHeight - currentTarget.scrollTop < 56;
        }}
      >
        <div className={styles.bubble}>
          <p>{guidance}</p>
        </div>
        {displayedMessages.map(({ id, role, content }) => {
          const writing = visibleReply?.id === id;
          const bubble = role === 'user' ? styles.userBubble : styles.bubble;
          return (
            <div key={id} className={`${bubble} ${writing ? messageStyles.revealing : ''}`}>
              <span className={styles.chatSrOnly}>{role === 'user' ? 'Você' : 'Flashinho'}</span>
              <Markdown
                skipHtml
                allowedElements={['p', 'strong', 'em', 'ul', 'ol', 'li', 'br', 'code']}
                unwrapDisallowed
              >
                {content}
              </Markdown>
            </div>
          );
        })}
        {sending && !visibleReply && <p className={styles.chatStatus}>Flashinho está pensando…</p>}
        {error && (
          <p className={styles.chatStatus} role="alert">
            {error}
          </p>
        )}
      </div>
      <form className={styles.chatComposer} onSubmit={send}>
        <small id="flashinho-chat-hint">Digite “quero o tour” para abrir o guia.</small>
        <div>
          <input
            ref={input}
            aria-label="Mensagem para o Flashinho"
            aria-describedby="flashinho-chat-hint"
            placeholder="Escreva sua mensagem"
            maxLength={1000}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button
            type="submit"
            aria-label="Enviar mensagem"
            disabled={!draft.trim() || (sending && !requestsTour(draft))}
          >
            <ArrowUp size={18} />
          </button>
        </div>
      </form>
    </aside>
  );
}
