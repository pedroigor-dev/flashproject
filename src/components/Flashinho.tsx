export default function Flashinho({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`flashinho ${className}`}
      viewBox="0 0 32 40"
      role="img"
      aria-label="Flashinho, um flamingo rosa em pixel art"
      shapeRendering="crispEdges"
    >
      <g className="pet-body">
        <path
          fill="#7e2448"
          d="M17 2h9v2h3v3h2v7h-5v-3h-3v10h3v3h-2v5h-4v2H8v-2H5v-3H3v-8h3v-3h9v5h3V11h-3V5h2z"
        />
        <path
          fill="#ff85ad"
          d="M18 4h8v2h2v5h-6v11h-4V10h-1V6h1zM7 18h8v5h7v4h-3v2H9v-2H6v-3H5v-4h2z"
        />
        <path fill="#ffb9cf" d="M19 4h6v2h-6zM7 18h7v3H7z" />
        <path fill="#ee3b79" d="M9 22h7v2h4v3h-9v-2H9zM19 10h3v12h-3z" />
        <path fill="#fff9ec" d="M26 10h4v4h-4z" />
        <path fill="#402335" d="M28 13h3v4h-4v-2h1z" />
        <g className="pet-eye">
          <path fill="#402335" d="M23 7h2v2h-2z" />
          <path fill="#fff" d="M23 7h1v1h-1z" />
        </g>
        <path fill="#ff557d" d="M21 11h3v2h-3z" />
      </g>
      <g fill="#7e2448">
        <path d="M11 29h2v7h4v2h-6z" />
        <path className="pet-leg" d="M19 29h2v3h4v2h-6z" />
      </g>
      <path fill="#ffd27a" d="M4 6h2v2h2v2H6v2H4v-2H2V8h2zM28 25h1v2h2v1h-2v2h-1v-2h-2v-1h2z" />
    </svg>
  );
}
