'use client';

import Link from 'next/link';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import messageStyles from '@/components/ChatMessage.module.css';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  ArrowUpRight,
  Plus,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  ArrowLeft,
  Sparkles,
  CreditCard,
  Building2,
  Gift,
  Copy,
  Check,
  Square,
  Trash2,
} from 'lucide-react';
import Brand from '@/components/Brand';
import Flashinho from '@/components/Flashinho';
import { suggestions, type Answer } from '@/lib/chat';
import { useReplyReveal } from '@/lib/useReplyReveal';
type Message = Answer & {
  role: 'user' | 'assistant';
  id: string;
  error?: boolean;
  sources?: { title: string; url: string }[];
};
type Conversation = { id: string; title: string; messages: Message[] };

export default function Chat() {
  const [chats, setChats] = useState<Conversation[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [aiStatus, setAiStatus] = useState('Conectando à IA');
  const requestRef = useRef<AbortController | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const followsReply = useRef(true);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const { visibleReply, reveal, finish } = useReplyReveal();
  const conversation = chats.find((c) => c.id === active);
  const messages = conversation?.messages || [];
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('flash-conversations') || '[]');
      if (Array.isArray(saved)) {
        setChats(
          saved
            .filter(
              (c) =>
                typeof c.id === 'string' &&
                typeof c.title === 'string' &&
                Array.isArray(c.messages) &&
                c.messages.every(
                  (m: Message) =>
                    typeof m.text === 'string' && ['user', 'assistant'].includes(m.role),
                ),
            )
            .slice(0, 30),
        );
      }
    } catch {}
    setReady(true);
    return () => {
      requestRef.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem('flash-conversations', JSON.stringify(chats.slice(0, 30)));
      } catch {}
    }
  }, [chats, ready]);
  useEffect(() => {
    const container = scroll.current;
    if (container && followsReply.current) container.scrollTop = container.scrollHeight;
  }, [active, messages.length, busy, visibleReply]);
  function stop() {
    finish();
    requestRef.current?.abort();
    requestRef.current = null;
    setBusy(false);
  }
  function newChat() {
    stop();
    setActive(null);
    setInput('');
    setSidebar(false);
    textarea.current?.focus();
  }
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) =>
        setAiStatus(
          data.status === 'ok' && data.ai?.configured
            ? `IA · ${data.ai.provider === 'groq' ? 'Groq' : 'Hugging Face'}`
            : 'IA indisponível',
        ),
      )
      .catch(() => setAiStatus('IA indisponível'));
  }, []);
  async function send(value = input) {
    const text = value.trim();
    if (!text || requestRef.current) {
      return;
    }
    finish();
    followsReply.current = true;
    const id = active || crypto.randomUUID();
    const message: Message = { role: 'user', text: text.slice(0, 2000), id: crypto.randomUUID() };
    const history = [...messages.filter((m) => !m.error), message]
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.text.slice(0, 4000) }));
    const controller = new AbortController();
    requestRef.current = controller;
    setInput('');
    setBusy(true);
    if (!active) {
      setChats((prev) =>
        [{ id, title: text.slice(0, 45), messages: [message] }, ...prev].slice(0, 30),
      );
      setActive(id);
    } else {
      setChats((prev) =>
        prev.map((c) => (c.id === id ? { ...c, messages: [...c.messages, message] } : c)),
      );
    }
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof data.message === 'string'
            ? data.message
            : 'Não foi possível responder agora. Tente novamente.',
        );
      }
      if (typeof data.text !== 'string') {
        throw new Error('A IA retornou uma resposta inválida.');
      }
      if (controller.signal.aborted) {
        return;
      }
      setAiStatus(`IA · ${data.provider === 'groq' ? 'Groq' : 'Hugging Face'}`);
      const answer: Message = {
        role: 'assistant',
        text: data.text,
        id: crypto.randomUUID(),
        sources: Array.isArray(data.sources) ? data.sources : [],
      };
      reveal(answer.id, answer.text);
      setChats((prev) =>
        prev.map((c) => (c.id === id ? { ...c, messages: [...c.messages, answer] } : c)),
      );
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      const answer: Message = {
        role: 'assistant',
        text: error instanceof Error ? error.message : 'A conexão falhou. Tente novamente.',
        id: crypto.randomUUID(),
        error: true,
      };
      setChats((prev) =>
        prev.map((c) => (c.id === id ? { ...c, messages: [...c.messages, answer] } : c)),
      );
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setBusy(false);
      }
    }
  }
  async function copy(message: Message) {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(message.id);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }
  return (
    <main className={`chat-app ${sidebar ? 'sidebar-open' : ''}`}>
      {sidebar && (
        <button
          className="sidebar-scrim"
          aria-label="Fechar menu"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Brand />
          <button
            className="icon-button mobile-only"
            aria-label="Fechar menu"
            onClick={() => setSidebar(false)}
          >
            <PanelLeftClose size={18} />
          </button>
          <span className="ai-badge">EXPERIENCE</span>
        </div>
        <button className="new-chat" onClick={newChat}>
          <Plus size={17} /> Nova conversa <span>↗</span>
        </button>
        <div className="sidebar-label">SEU ESPAÇO</div>
        <button className="sidebar-item selected" onClick={newChat}>
          <Sparkles size={16} /> Explore com o Flashinho
        </button>
        <a
          className="sidebar-item"
          href="https://flashapp.com.br/"
          target="_blank"
          rel="noreferrer"
        >
          <Building2 size={16} /> Universo Flash <ArrowUpRight size={13} />
        </a>
        <Link className="sidebar-item" href="/atendimento">
          <MessageSquare size={16} /> Central de atendimento <ArrowUpRight size={13} />
        </Link>
        <div className="sidebar-label history-label">CONVERSAS RECENTES</div>
        <div className="history">
          {chats.length === 0 ? (
            <p>Suas descobertas começam aqui.</p>
          ) : (
            chats.map((c) => (
              <div className={`history-row ${active === c.id ? 'active' : ''}`} key={c.id}>
                <button
                  onClick={() => {
                    stop();
                    followsReply.current = true;
                    setActive(c.id);
                    setSidebar(false);
                  }}
                >
                  <MessageSquare size={14} />
                  <span>{c.title}</span>
                </button>
                <button
                  className="delete-chat"
                  aria-label={`Excluir conversa ${c.title}`}
                  onClick={() => {
                    if (active === c.id) {
                      newChat();
                    }
                    setChats((prev) => prev.filter((x) => x.id !== c.id));
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="sidebar-pet">
          <Flashinho />
          <strong>
            Um toque de Flash
            <br />
            no seu dia.
          </strong>
          <span>Curiosidade é sempre bem-vinda.</span>
        </div>
        <Link className="back-home" href="/">
          <ArrowLeft size={15} /> Voltar à experiência
        </Link>
        <div className="sidebar-profile">
          <div>V</div>
          <span>
            Visitante<small>Explorando possibilidades</small>
          </span>
          <span className="online-dot" />
        </div>
      </aside>
      <section className="chat-main">
        <header className="chat-header">
          <div>
            <button
              className="icon-button mobile-only"
              aria-label="Abrir menu"
              onClick={() => setSidebar(true)}
            >
              <PanelLeft size={19} />
            </button>
            <span>
              Flashinho <span className="chat-header-tag">seu guia Flash</span>
            </span>
          </div>
          <span className="demo-badge">
            <span /> {aiStatus}
          </span>
        </header>
        <div
          ref={scroll}
          className={`chat-scroll ${messages.length ? 'has-messages' : ''}`}
          onScroll={({ currentTarget }) => {
            followsReply.current =
              currentTarget.scrollHeight - currentTarget.clientHeight - currentTarget.scrollTop <
              80;
          }}
        >
          {!messages.length ? (
            <div className="chat-welcome">
              <div className="welcome-pet">
                <span className="pet-halo" />
                <Flashinho />
                <span className="hello-bubble">Oi! Pode perguntar.</span>
              </div>
              <div className="eyebrow">VAMOS CONHECER A FLASH?</div>
              <h1>
                O que você quer
                <br />
                <span>saber sobre a Flash?</span>
              </h1>
              <p>
                Sou o Flashinho. Posso falar sobre a empresa, os produtos e como é trabalhar por lá.
              </p>
              <div className="suggestions">
                {suggestions.map((s, i) => {
                  const Icon = [Building2, CreditCard, Gift, Sparkles][i];
                  return (
                    <button key={s} onClick={() => send(s)}>
                      <Icon size={20} />
                      <span>{s}</span>
                      <ArrowUpRight size={15} />
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="messages">
              {messages.map((m) => (
                <article key={m.id} className={`message ${m.role}`}>
                  <div className="message-avatar">
                    {m.role === 'assistant' ? <Flashinho /> : 'V'}
                  </div>
                  <div className="message-body">
                    <div className="message-name">
                      {m.role === 'assistant' ? 'Flashinho' : 'Você'}
                      {m.role === 'assistant' && <span>GUIA FLASH</span>}
                    </div>
                    <div
                      className={`message-text ${m.role === 'assistant' && !m.error ? messageStyles.markdown : ''} ${visibleReply?.id === m.id ? messageStyles.revealing : ''}`}
                      role={m.error ? 'alert' : undefined}
                      aria-busy={visibleReply?.id === m.id || undefined}
                    >
                      {m.role === 'assistant' && !m.error ? (
                        <Markdown
                          skipHtml
                          remarkPlugins={[remarkGfm]}
                          allowedElements={[
                            'p',
                            'strong',
                            'em',
                            'ul',
                            'ol',
                            'li',
                            'h1',
                            'h2',
                            'h3',
                            'blockquote',
                            'code',
                            'pre',
                            'br',
                            'table',
                            'thead',
                            'tbody',
                            'tr',
                            'th',
                            'td',
                            'hr',
                          ]}
                          unwrapDisallowed
                        >
                          {visibleReply?.id === m.id ? visibleReply.text : m.text}
                        </Markdown>
                      ) : (
                        m.text
                      )}
                    </div>
                    {m.error && (
                      <button
                        className="source-link"
                        onClick={() => {
                          const last = messages
                            .slice(
                              0,
                              messages.findIndex((x) => x.id === m.id),
                            )
                            .reverse()
                            .find((x) => x.role === 'user');
                          if (last) {
                            send(last.text);
                          }
                        }}
                        disabled={busy}
                      >
                        Tentar novamente
                      </button>
                    )}
                    {visibleReply?.id !== m.id && !!m.sources?.length && (
                      <div>
                        <small>Fontes da resposta</small>
                        <div className={messageStyles.references}>
                          {m.sources
                            .filter((s) =>
                              /^https:\/\/(?:(?:flashapp\.com\.br|faq\.flashapp\.com\.br)(?:\/|$)|jobs\.lever\.co\/flashapp(?:\/|$)|canaldeetica\.com\.br\/flash(?:\/|$))/.test(
                                s.url,
                              ),
                            )
                            .map((s) => (
                              <a
                                key={s.url}
                                className="source-link"
                                href={s.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {s.title} ↗
                              </a>
                            ))}
                        </div>
                      </div>
                    )}
                    {m.source && (
                      <a className="source-link" href={m.source} target="_blank" rel="noreferrer">
                        {m.label} <ArrowUpRight size={12} />
                      </a>
                    )}
                    {m.role === 'assistant' && visibleReply?.id !== m.id && (
                      <button
                        className="copy-button"
                        onClick={() => copy(m)}
                        aria-label="Copiar resposta"
                      >
                        {copied === m.id ? <Check size={13} /> : <Copy size={13} />}{' '}
                        {copied === m.id ? 'Copiado' : 'Copiar'}
                      </button>
                    )}
                  </div>
                </article>
              ))}
              {busy && (
                <div className="thinking" role="status">
                  <Flashinho />
                  <span>
                    Flashinho está pensando
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="composer-area">
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              ref={textarea}
              aria-label="Sua pergunta para o Flashinho"
              placeholder="Pergunte sobre a Flash..."
              value={input}
              maxLength={2000}
              rows={2}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <div className="composer-bottom">
              <span>
                <Sparkles size={14} /> Flashinho <small>· Guia do universo Flash</small>
              </span>
              {busy || visibleReply ? (
                <button
                  type="button"
                  className="send-button"
                  aria-label={busy ? 'Parar resposta' : 'Mostrar resposta inteira'}
                  onClick={stop}
                >
                  <Square size={14} />
                </button>
              ) : (
                <button
                  className="send-button"
                  type="submit"
                  disabled={!input.trim()}
                  aria-label="Enviar mensagem"
                >
                  <ArrowUp size={19} />
                </button>
              )}
            </div>
          </form>
          <p className="chat-disclaimer">
            IA pode errar. As mensagens são enviadas ao provedor de IA configurado para gerar
            respostas. Projeto independente, sem acesso à sua conta Flash.
          </p>
        </div>
      </section>
    </main>
  );
}
