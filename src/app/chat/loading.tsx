import styles from '@/components/ChatEntrance.module.css';

export default function LoadingChat() {
  return (
    <div
      className={styles.overlay}
      role="status"
      aria-label="Carregando o Flashinho"
      style={{ background: '#ed3476', display: 'grid', placeItems: 'center', color: '#fff8fb' }}
    >
      <span
        className={styles.fallbackWord}
        style={{
          fontFamily: 'var(--font)',
          fontSize: 'clamp(80px, 14vw, 170px)',
          fontWeight: 850,
          letterSpacing: '-.07em',
        }}
      >
        flash
      </span>
    </div>
  );
}
