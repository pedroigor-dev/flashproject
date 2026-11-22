import { useCallback, useEffect, useRef, useState } from 'react';

type VisibleReply = { id: string; text: string };

export function useReplyReveal() {
  const [visibleReply, setVisibleReply] = useState<VisibleReply>();
  const timer = useRef<number | undefined>(undefined);

  const finish = useCallback(() => {
    window.clearInterval(timer.current);
    timer.current = undefined;
    setVisibleReply(undefined);
  }, []);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const reveal = useCallback(
    (id: string, text: string) => {
      finish();
      if (document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }

      const characters = Array.from(new Intl.Segmenter().segment(text), ({ segment }) => segment);
      if (characters.length < 3) return;

      const duration = Math.min(3900, Math.max(260, characters.length * 12));
      const start = performance.now();
      let shown = 2;
      setVisibleReply({ id, text: characters.slice(0, shown).join('') });

      timer.current = window.setInterval(() => {
        const progress = (performance.now() - start) / duration;
        if (progress >= 1 || document.hidden) {
          finish();
          return;
        }

        const next = Math.floor(progress * characters.length);
        if (next > shown) {
          shown = next;
          setVisibleReply({ id, text: characters.slice(0, shown).join('') });
        }
      }, 32);
    },
    [finish],
  );

  return { visibleReply, reveal, finish };
}
