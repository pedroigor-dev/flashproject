'use client';

import { useEffect, useId, useRef, useState } from 'react';
import styles from './ChatEntrance.module.css';

export default function ChatEntrance({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<'loading' | 'reveal' | 'done'>('loading');
  const maskId = useId();
  const content = useRef<HTMLDivElement>(null);
  const maskWord = useRef<SVGTextElement>(null);
  const [zoomOrigin, setZoomOrigin] = useState('500px 300px');
  const [stemFill, setStemFill] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let finishTimer: ReturnType<typeof setTimeout>;
    let minimumTimer: ReturnType<typeof setTimeout>;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // This template mounts with the chat. Wait for the local font too, so the
    // visible word and the transparent cutout always have identical geometry.
    const minimum = new Promise<void>((resolve) => {
      minimumTimer = setTimeout(resolve, reduced ? 0 : 1700);
    });
    Promise.all([document.fonts.ready, minimum]).then(() => {
      if (cancelled) return;
      if (reduced) {
        setPhase('done');
        return;
      }
      // Dive into the solid stem of the "l", never the gap between letters.
      // Measure after font loading so the focal point also fits mobile type.
      const word = maskWord.current;
      const context = document.createElement('canvas').getContext('2d');
      if (word && context) {
        const font = getComputedStyle(word);
        context.font = `${font.fontWeight} ${font.fontSize} ${font.fontFamily}`;
        const glyph = context.measureText('l');
        const start = word.getStartPositionOfChar(1);
        // Glyph ink bounds exclude the advance width and negative tracking.
        const x = start.x + (glyph.actualBoundingBoxRight - glyph.actualBoundingBoxLeft) / 2;
        const y = start.y + (glyph.actualBoundingBoxDescent - glyph.actualBoundingBoxAscent) / 2;
        setZoomOrigin(`${x}px ${y}px`);
        const width = (glyph.actualBoundingBoxLeft + glyph.actualBoundingBoxRight) * 0.85;
        const height = (glyph.actualBoundingBoxAscent + glyph.actualBoundingBoxDescent) * 0.8;
        setStemFill({ x: x - width / 2, y: y - height / 2, width, height });
      }
      setPhase('reveal');
      finishTimer = setTimeout(() => setPhase('done'), 1650);
    });
    return () => {
      cancelled = true;
      clearTimeout(minimumTimer);
      clearTimeout(finishTimer);
    };
  }, []);

  useEffect(() => {
    if (phase === 'done') content.current?.focus({ preventScroll: true });
  }, [phase]);

  return (
    <div className={`${styles.root} ${phase === 'reveal' ? styles.revealing : ''}`}>
      <div ref={content} tabIndex={-1} inert={phase !== 'done'} className={styles.content}>
        {children}
      </div>
      {phase !== 'done' && (
        <div
          className={styles.overlay}
          role="status"
          aria-live="polite"
          aria-label="Preparando sua conversa com o Flashinho"
        >
          <svg
            className={styles.maskCanvas}
            viewBox="0 0 1000 600"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <defs>
              <mask
                id={maskId}
                maskUnits="userSpaceOnUse"
                x="0"
                y="0"
                width="1000"
                height="600"
                style={{ maskType: 'luminance' }}
              >
                <rect width="1000" height="600" fill="white" />
                <g
                  className={styles.zoom}
                  style={phase === 'reveal' ? { transformOrigin: zoomOrigin } : undefined}
                >
                  <text
                    ref={maskWord}
                    className={styles.word}
                    x="500"
                    y="345"
                    textAnchor="middle"
                    fill="black"
                  >
                    flash
                  </text>
                  {stemFill && <rect {...stemFill} fill="black" />}
                </g>
              </mask>
            </defs>
            <rect width="1000" height="600" fill="#ed3476" mask={`url(#${maskId})`} />
            <g
              className={styles.zoom}
              style={phase === 'reveal' ? { transformOrigin: zoomOrigin } : undefined}
            >
              <text
                className={`${styles.word} ${styles.solidWord}`}
                x="500"
                y="345"
                textAnchor="middle"
                fill="#fff8fb"
              >
                flash
              </text>
            </g>
          </svg>
          <div className={styles.caption}>
            <span>UM UNIVERSO DE RESPOSTAS</span>
            <div className={styles.track}>
              <i />
            </div>
            <small>O Flashinho está te esperando.</small>
          </div>
        </div>
      )}
    </div>
  );
}
