import Link from 'next/link';

export default function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Flash, início">
      flash<span className="brand-spark">✳</span>
    </Link>
  );
}
