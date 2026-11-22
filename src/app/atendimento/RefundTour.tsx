import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ArrowRight, MessageCircle, X } from 'lucide-react';
import Flashinho from '@/components/Flashinho';
import type { CaseStatus } from '@/lib/support';
import styles from './RefundTour.module.css';

export type TourStage = 'welcome' | 'purchase' | 'details' | 'tracking';

const storageKey = 'flash-refund-tour-v1-dismissed';

const guide = {
  welcome: {
    step: 'Comece por aqui',
    title: 'Oi, eu sou o Flashinho!',
    text: 'Quer ver como funciona um estorno? Clique em “Preciso de ajuda com um estorno” para começarmos.',
  },
  purchase: {
    step: '01 · A compra',
    title: 'Escolha uma compra',
    text: 'Selecione uma compra fictícia e clique em “Continuar”. Se ela já tem um protocolo, você vai direto para o acompanhamento.',
  },
  details: {
    step: '02 · O que aconteceu',
    title: 'Conte o que aconteceu',
    text: 'Escolha o motivo, descreva o que houve e diga se a loja confirmou o cancelamento. Depois, clique em “Abrir atendimento”.',
  },
  tracking: {
    step: '03 · Acompanhar',
    title: 'Acompanhe seu protocolo',
    text: 'A linha do tempo registra tudo, da abertura à triagem. Você pode voltar aqui para acompanhar as atualizações.',
  },
};

const nextStep: Record<CaseStatus, string> = {
  waiting_merchant:
    'Depois que a loja confirmar o cancelamento, registre a confirmação na linha do tempo.',
  waiting_receipt:
    'Baixe o comprovante de teste e selecione o PDF em “Escolher Arquivo”. Isso dispara a triagem.',
  queued:
    'O comprovante entrou na fila. A página vai atualizar o protocolo quando o n8n registrar a triagem.',
  reviewing:
    'A triagem terminou. Se o botão estiver disponível, use “Simular conclusão” para experimentar o encerramento.',
  completed: 'A simulação terminou. Você pode consultar o histórico do protocolo nesta página.',
};

function FlightSprite() {
  return (
    <svg
      viewBox="0 0 40 40"
      className={styles.sprite}
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <path
        fill="#7e2448"
        d="M21 7h9v2h4v3h3v7h-6v-3h-4v7h-4v5h-5v3H7v-2H3v-5H0v-3h8v-4h9v2h4v-7h-2V9h2z"
      />
      <path fill="#ff85ad" d="M22 9h8v2h3v4h-8v8h-4v4h-4v2H8v-2H5v-4h5v-4h7v2h6v-8h-2v-2h1z" />
      <path fill="#fff9ec" d="M31 14h5v4h-5z" />
      <path fill="#402335" d="M29 11h2v2h-2zM35 17h2v3h-3v-2h1z" />
      <path fill="#7e2448" d="M7 29h6v2H8v2H2v-2h5z" />
      <g className={styles.wingUp}>
        <path fill="#7e2448" d="M9 8h5v4h4v4h4v7h-4v3h-6v-4H8v-5H6v-6h3z" />
        <path fill="#ffd4e2" d="M9 11h4v3h3v4h4v4h-3v2h-4v-4h-3v-5H8v-3h1z" />
      </g>
      <g className={styles.wingDown}>
        <path fill="#7e2448" d="M10 21h11v7h-3v4h-4v4H8v-5h2z" />
        <path fill="#f96c9e" d="M12 23h7v4h-3v4h-3v3h-3v-2h2z" />
      </g>
    </svg>
  );
}

function Flight({ phase, origin }: { phase: 'arrival' | 'departure'; origin?: CSSProperties }) {
  return (
    <div
      className={phase === 'arrival' ? styles.arrival : styles.departure}
      style={origin}
      aria-hidden="true"
    >
      {Array.from({ length: 7 }, (_, index) => (
        <span key={index} className={styles.feather} style={{ '--i': index } as CSSProperties} />
      ))}
      <FlightSprite />
    </div>
  );
}

export default function RefundTour({
  stage,
  status,
  purchaseSelected,
}: {
  stage: TourStage;
  status?: CaseStatus;
  purchaseSelected: boolean;
}) {
  const [mode, setMode] = useState<'initial' | 'tour' | 'dock'>('initial');
  const [flight, setFlight] = useState<'arrival' | 'departure' | null>(null);
  const [help, setHelp] = useState(false);
  const [flightOrigin, setFlightOrigin] = useState<CSSProperties>();
  const [spot, setSpot] = useState<CSSProperties | null>(null);
  const [panelPosition, setPanelPosition] = useState<CSSProperties>();
  const opener = useRef<HTMLButtonElement>(null);
  const helpClose = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLElement>(null);
  const shouldFocusDock = useRef(false);
  const current = guide[stage];
  const touring = mode === 'tour';

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(storageKey) === '1';
    } catch {}
    setMode(dismissed ? 'dock' : 'tour');
    if (!dismissed && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFlight('arrival');
    }
  }, []);

  useEffect(() => {
    if (!flight) {
      return;
    }
    const timer = window.setTimeout(() => setFlight(null), flight === 'arrival' ? 3650 : 1150);
    return () => window.clearTimeout(timer);
  }, [flight]);

  useEffect(() => {
    if (!touring) {
      return;
    }
    const target = document.querySelector<HTMLElement>(`[data-refund-tour="${stage}"]`);
    if (!target) {
      return;
    }
    const move = () => {
      const rect = target.getBoundingClientRect();
      const left = Math.max(4, rect.left - 8);
      const right = Math.min(window.innerWidth - 4, rect.right + 8);
      const top = Math.max(4, rect.top - 8);
      const bottom = Math.min(window.innerHeight - 4, rect.bottom + 8);
      const panel = card.current?.getBoundingClientRect();
      const panelHeight = panel?.height ?? 190;
      if (stage !== 'welcome' && rect.left >= 245) {
        setPanelPosition({ left: '1rem', right: 'auto', width: Math.min(300, rect.left - 32) });
      } else if (
        rect.top > panelHeight + 24 &&
        rect.bottom > window.innerHeight - panelHeight - 24
      ) {
        setPanelPosition({ top: '1rem', bottom: 'auto' });
      } else {
        setPanelPosition(undefined);
      }
      setSpot(
        right > left && bottom > top
          ? ({
              left,
              top,
              width: right - left,
              height: bottom - top,
            } as CSSProperties)
          : null,
      );
    };
    if (
      target.getBoundingClientRect().top > window.innerHeight * 0.72 ||
      target.getBoundingClientRect().top < 0
    ) {
      target.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
    move();
    const observer = new ResizeObserver(move);
    observer.observe(target);
    if (card.current) {
      observer.observe(card.current);
    }
    window.addEventListener('resize', move);
    window.addEventListener('scroll', move, { passive: true, capture: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', move);
      window.removeEventListener('scroll', move, true);
    };
  }, [stage, touring, purchaseSelected]);

  useEffect(() => {
    if (help) {
      helpClose.current?.focus();
    }
  }, [help]);

  useEffect(() => {
    if (mode === 'dock' && shouldFocusDock.current) {
      opener.current?.focus({ preventScroll: true });
      shouldFocusDock.current = false;
    }
  }, [mode]);

  function dismiss(animate = true) {
    shouldFocusDock.current = Boolean(card.current?.contains(document.activeElement));
    try {
      localStorage.setItem(storageKey, '1');
    } catch {}
    const panel = card.current?.getBoundingClientRect();
    if (animate && panel) {
      setFlightOrigin({
        '--flight-x': `${panel.left + 6 - (window.innerWidth - 92)}px`,
        '--flight-y': `${panel.top + 4 - (window.innerHeight - 92)}px`,
      } as CSSProperties);
    }
    setMode('dock');
    setHelp(false);
    setFlight(
      animate && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'departure' : null,
    );
  }

  useEffect(() => {
    if (!touring && !help) {
      return;
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) {
        return;
      }
      if (touring) {
        dismiss(false);
      } else {
        setHelp(false);
        opener.current?.focus();
      }
    };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [touring, help]);

  if (mode === 'initial') {
    return null;
  }

  const isArriving = flight === 'arrival';

  return (
    <>
      {flight === 'departure' && <Flight phase="departure" origin={flightOrigin} />}
      {touring ? (
        <>
          {spot && (
            <div
              className={`${styles.spotlight} ${isArriving ? styles.reveal : ''}`}
              style={spot}
              aria-hidden="true"
            />
          )}
          <aside
            ref={card}
            className={`${styles.panel} ${isArriving ? styles.arrivingPanel : ''}`}
            style={panelPosition}
            aria-label="Tour do Flashinho"
          >
            <div className={styles.intro} aria-live="polite">
              <span className={styles.portrait}>
                {isArriving && <Flight phase="arrival" />}
                <Flashinho className={isArriving ? styles.landedMascot : undefined} />
              </span>
              <div>
                <small>{current.step}</small>
                <h2>{current.title}</h2>
              </div>
            </div>
            <p>{current.text}</p>
            {stage === 'tracking' && status && <p>{nextStep[status]}</p>}
            <button className={styles.action} onClick={() => dismiss()}>
              {stage === 'tracking' ? 'Concluir tour' : 'Pular tour'} <ArrowRight size={16} />
            </button>
          </aside>
        </>
      ) : (
        <>
          {help && (
            <aside
              id="flashinho-stage-help"
              className={`${styles.panel} ${styles.help}`}
              aria-label="Ajuda do Flashinho"
            >
              <button
                ref={helpClose}
                className={styles.close}
                aria-label="Fechar ajuda"
                onClick={() => {
                  setHelp(false);
                  opener.current?.focus();
                }}
              >
                <X size={18} />
              </button>
              <small>{current.step}</small>
              <h2>{current.title}</h2>
              <p>{stage === 'tracking' && status ? nextStep[status] : current.text}</p>
              <button
                className={styles.action}
                onClick={() => {
                  setHelp(false);
                  setMode('tour');
                  if (
                    stage === 'welcome' &&
                    !matchMedia('(prefers-reduced-motion: reduce)').matches
                  ) {
                    setFlight('arrival');
                  }
                }}
              >
                Retomar tour <ArrowRight size={16} />
              </button>
            </aside>
          )}
          <button
            ref={opener}
            className={`${styles.dock} ${flight === 'departure' ? styles.dockLanding : ''}`}
            aria-label="Ajuda do Flashinho"
            aria-expanded={help}
            aria-controls={help ? 'flashinho-stage-help' : undefined}
            onClick={() => setHelp(!help)}
          >
            <Flashinho />
            <span>Ajuda do Flashinho</span>
            <MessageCircle size={15} />
          </button>
        </>
      )}
    </>
  );
}
